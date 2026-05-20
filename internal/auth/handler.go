package auth

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"medical-card/internal/middleware"
	"medical-card/internal/models"
	"medical-card/internal/repository"
	"medical-card/internal/session"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

type registerRequest struct {
	FullName  string `json:"fullName" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	BirthDate string `json:"birthDate" binding:"required"`
	Phone     string `json:"phone" binding:"required"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type userResponse struct {
	ID        string      `json:"id"`
	Email     string      `json:"email"`
	FullName  string      `json:"fullName"`
	BirthDate string      `json:"birthDate"`
	Phone     string      `json:"phone"`
	Role      models.Role `json:"role"`
	Specialty string      `json:"specialty,omitempty"`
}

type authResponse struct {
	Token string       `json:"token"`
	User  userResponse `json:"user"`
}

type meResponse struct {
	User userResponse `json:"user"`
}

func (h *Handler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные формы"})
		return
	}

	result, err := h.service.Register(c.Request.Context(), RegisterInput{
		FullName:  req.FullName,
		Email:     req.Email,
		Password:  req.Password,
		BirthDate: req.BirthDate,
		Phone:     req.Phone,
	})
	if err != nil {
		writeAuthError(c, err)
		return
	}

	c.JSON(http.StatusCreated, toAuthResponse(result))
}

func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные формы"})
		return
	}

	result, err := h.service.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		writeAuthError(c, err)
		return
	}

	c.JSON(http.StatusOK, toAuthResponse(result))
}

func (h *Handler) Logout(c *gin.Context) {
	token := bearerToken(c)
	if token != "" {
		if err := h.service.Logout(c.Request.Context(), token); err != nil {
			log.Printf("logout error: %v", err)
		}
	}
	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

func (h *Handler) Me(c *gin.Context) {
	token := bearerToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Требуется авторизация"})
		return
	}

	user, err := h.service.GetUserBySession(c.Request.Context(), token)
	if err != nil {
		if errors.Is(err, session.ErrSessionNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Сессия истекла или недействительна"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	c.JSON(http.StatusOK, meResponse{User: toUserResponse(user)})
}

func bearerToken(c *gin.Context) string {
	if t := c.GetString(middleware.ContextTokenKey); t != "" {
		return t
	}
	header := c.GetHeader("Authorization")
	if header == "" || !strings.HasPrefix(header, "Bearer ") {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
}

func writeAuthError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, repository.ErrEmailTaken):
		c.JSON(http.StatusConflict, gin.H{"error": "Пользователь с таким email уже зарегистрирован"})
	case errors.Is(err, ErrInvalidCredentials):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный email или пароль"})
	case errors.Is(err, ErrWeakPassword):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пароль должен быть не короче 8 символов"})
	case errors.Is(err, ErrInvalidBirthDate):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите корректную дату рождения"})
	case err != nil && err.Error() == "full name is required":
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите ФИО"})
	default:
		log.Printf("auth error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
	}
}

func toAuthResponse(result *AuthResult) authResponse {
	return authResponse{
		Token: result.Token,
		User:  toUserResponse(result.User),
	}
}

func toUserResponse(user *models.User) userResponse {
	resp := userResponse{
		ID:        user.ID,
		Email:     user.Email,
		FullName:  user.FullName,
		BirthDate: user.BirthDate.Format("02.01.2006"),
		Phone:     user.Phone,
		Role:      user.Role,
	}
	if user.Role == models.RoleDoctor {
		resp.Specialty = user.Specialty
	}
	return resp
}
