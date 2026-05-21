package admin

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"medical-card/internal/auth"
	"medical-card/internal/models"
	"medical-card/internal/repository"
)

func parseBirthDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, auth.ErrInvalidBirthDate
	}
	if t, err := time.Parse("02.01.2006", s); err == nil {
		return t, nil
	}
	return time.Parse("2006-01-02", s)
}

func validatePasswordPair(password, confirm string) error {
	if len(password) < 8 {
		return auth.ErrWeakPassword
	}
	if password != confirm {
		return errors.New("passwords do not match")
	}
	return nil
}

type createCatalogRequest struct {
	Name string `json:"name" binding:"required"`
	Code string `json:"code" binding:"required"`
}

func (h *Handler) CreateCatalogDisease(c *gin.Context) {
	var req createCatalogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите название и код МКБ"})
		return
	}

	item, err := h.catalog.Create(c.Request.Context(), req.Name, req.Code)
	if err != nil {
		if errors.Is(err, repository.ErrCatalogCodeTaken) {
			c.JSON(http.StatusConflict, gin.H{"error": "Код МКБ уже есть в справочнике"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"disease": item})
}

type updateCatalogRequest struct {
	Name *string `json:"name"`
	Code *string `json:"code"`
}

func (h *Handler) UpdateCatalogDisease(c *gin.Context) {
	id := c.Param("id")
	var req updateCatalogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}
	if req.Name == nil && req.Code == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите name и/или code"})
		return
	}
	if req.Name != nil && strings.TrimSpace(*req.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пустое название МКБ"})
		return
	}
	if req.Code != nil && strings.TrimSpace(*req.Code) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пустой код МКБ"})
		return
	}

	item, err := h.catalog.Update(c.Request.Context(), id, req.Name, req.Code)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrCatalogDiseaseNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись справочника не найдена"})
		case errors.Is(err, repository.ErrCatalogCodeTaken):
			c.JSON(http.StatusConflict, gin.H{"error": "Код МКБ уже есть в справочнике"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"disease": item})
}

func (h *Handler) DeleteCatalogDisease(c *gin.Context) {
	id := c.Param("id")
	if err := h.catalog.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, repository.ErrCatalogDiseaseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись справочника не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

type createPatientRequest struct {
	FullName        string `json:"fullName" binding:"required"`
	Email           string `json:"email" binding:"required,email"`
	Password        string `json:"password" binding:"required,min=8"`
	ConfirmPassword string `json:"confirmPassword" binding:"required"`
	BirthDate       string `json:"birthDate" binding:"required"`
	Phone           string `json:"phone" binding:"required"`
}

func (h *Handler) CreatePatient(c *gin.Context) {
	var req createPatientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные формы"})
		return
	}
	if err := validatePasswordPair(req.Password, req.ConfirmPassword); err != nil {
		if errors.Is(err, auth.ErrWeakPassword) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Пароль должен быть не короче 8 символов"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пароли не совпадают"})
		return
	}

	birthDate, err := parseBirthDate(req.BirthDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите корректную дату рождения (ДД.ММ.ГГГГ)"})
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	user, err := h.users.Create(c.Request.Context(), repository.CreateUserInput{
		Email:        req.Email,
		PasswordHash: hash,
		FullName:     req.FullName,
		BirthDate:    birthDate,
		Phone:        req.Phone,
		Role:         models.RolePatient,
	})
	if err != nil {
		if errors.Is(err, repository.ErrEmailTaken) {
			c.JSON(http.StatusConflict, gin.H{"error": "Email уже занят"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	item, err := h.users.UserToListItem(c.Request.Context(), user)
	if err != nil {
		c.JSON(http.StatusCreated, gin.H{"patient": models.UserListItem{ID: user.ID, FullName: user.FullName, Email: user.Email}})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"patient": item})
}

type updatePatientRequest struct {
	FullName  string `json:"fullName" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	BirthDate string `json:"birthDate" binding:"required"`
	Phone     string `json:"phone" binding:"required"`
}

func (h *Handler) UpdatePatient(c *gin.Context) {
	patientID := c.Param("id")
	var req updatePatientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}

	birthDate, err := parseBirthDate(req.BirthDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите корректную дату рождения"})
		return
	}

	user, err := h.users.Update(c.Request.Context(), patientID, models.RolePatient, repository.UpdateUserInput{
		FullName:  req.FullName,
		Email:     req.Email,
		BirthDate: birthDate,
		Phone:     req.Phone,
	})
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Пациент не найден"})
			return
		}
		if errors.Is(err, repository.ErrEmailTaken) {
			c.JSON(http.StatusConflict, gin.H{"error": "Email уже занят"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	item, _ := h.users.UserToListItem(c.Request.Context(), user)
	c.JSON(http.StatusOK, gin.H{"patient": item})
}

func (h *Handler) DeletePatient(c *gin.Context) {
	patientID := c.Param("id")
	if err := h.users.Delete(c.Request.Context(), patientID, models.RolePatient); err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Пациент не найден"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

type createDoctorRequest struct {
	FullName        string `json:"fullName" binding:"required"`
	Email           string `json:"email" binding:"required,email"`
	Password        string `json:"password" binding:"required,min=8"`
	ConfirmPassword string `json:"confirmPassword" binding:"required"`
	BirthDate       string `json:"birthDate" binding:"required"`
	Phone           string `json:"phone" binding:"required"`
	Specialty       string `json:"specialty" binding:"required"`
}

func (h *Handler) CreateDoctor(c *gin.Context) {
	var req createDoctorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные формы"})
		return
	}
	if strings.TrimSpace(req.Specialty) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите специальность"})
		return
	}
	if err := validatePasswordPair(req.Password, req.ConfirmPassword); err != nil {
		if errors.Is(err, auth.ErrWeakPassword) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Пароль должен быть не короче 8 символов"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пароли не совпадают"})
		return
	}

	birthDate, err := parseBirthDate(req.BirthDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите корректную дату рождения"})
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	user, err := h.users.Create(c.Request.Context(), repository.CreateUserInput{
		Email:        req.Email,
		PasswordHash: hash,
		FullName:     req.FullName,
		BirthDate:    birthDate,
		Phone:        req.Phone,
		Role:         models.RoleDoctor,
		Specialty:    req.Specialty,
	})
	if err != nil {
		if errors.Is(err, repository.ErrEmailTaken) {
			c.JSON(http.StatusConflict, gin.H{"error": "Email уже занят"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	item, _ := h.users.UserToListItem(c.Request.Context(), user)
	c.JSON(http.StatusCreated, gin.H{"doctor": item})
}

type updateDoctorRequest struct {
	FullName  string `json:"fullName" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	BirthDate string `json:"birthDate" binding:"required"`
	Phone     string `json:"phone" binding:"required"`
	Specialty string `json:"specialty" binding:"required"`
}

func (h *Handler) UpdateDoctor(c *gin.Context) {
	doctorID := c.Param("id")
	var req updateDoctorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}

	birthDate, err := parseBirthDate(req.BirthDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите корректную дату рождения"})
		return
	}

	user, err := h.users.Update(c.Request.Context(), doctorID, models.RoleDoctor, repository.UpdateUserInput{
		FullName:  req.FullName,
		Email:     req.Email,
		BirthDate: birthDate,
		Phone:     req.Phone,
		Specialty: req.Specialty,
	})
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Врач не найден"})
			return
		}
		if errors.Is(err, repository.ErrEmailTaken) {
			c.JSON(http.StatusConflict, gin.H{"error": "Email уже занят"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	item, _ := h.users.UserToListItem(c.Request.Context(), user)
	c.JSON(http.StatusOK, gin.H{"doctor": item})
}

func (h *Handler) DeleteDoctor(c *gin.Context) {
	doctorID := c.Param("id")
	if err := h.users.Delete(c.Request.Context(), doctorID, models.RoleDoctor); err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Врач не найден"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}
