package patient

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"medical-card/internal/middleware"
	"medical-card/internal/models"
	"medical-card/internal/pagination"
	"medical-card/internal/repository"
)

type Handler struct {
	users   *repository.UserRepository
	cards   *repository.PatientCardRepository
	catalog *repository.DiseaseCatalogRepository
}

func NewHandler(
	users *repository.UserRepository,
	cards *repository.PatientCardRepository,
	catalog *repository.DiseaseCatalogRepository,
) *Handler {
	return &Handler{users: users, cards: cards, catalog: catalog}
}

type profileResponse struct {
	ID        string `json:"id"`
	FullName  string `json:"fullName"`
	BirthDate string `json:"birthDate"`
	Phone     string `json:"phone"`
}

type cardResponse struct {
	Profile        profileResponse                 `json:"profile"`
	AssignedDoctor *models.DoctorSummary           `json:"assignedDoctor"`
	Diseases       []repository.DiseaseRecord      `json:"diseases"`
	Analyses       []repository.AnalysisRecord     `json:"analyses"`
	Visits         []repository.VisitRecord        `json:"visits"`
	Prescriptions  []repository.PrescriptionRecord `json:"prescriptions"`
}

func (h *Handler) List(c *gin.Context) {
	ctx := c.Request.Context()
	role := c.GetString(middleware.ContextRoleKey)

	var patients []models.UserListItem
	var err error

	switch role {
	case string(models.RoleDoctor):
		doctorID := c.GetString(middleware.ContextUserIDKey)
		patients, err = h.users.ListPatientsForDoctor(ctx, doctorID)
	case string(models.RoleAdmin):
		patients, err = h.users.ListByRole(ctx, models.RolePatient)
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "Недостаточно прав"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	if patients == nil {
		patients = []models.UserListItem{}
	}

	q, page, limit := pagination.Parse(c)
	slice, meta := pagination.Apply(patients, q, page, limit, pagination.MatchUserListItem)
	c.JSON(http.StatusOK, gin.H{"patients": slice, "pagination": meta})
}

func (h *Handler) GetMe(c *gin.Context) {
	if c.GetString(middleware.ContextRoleKey) != string(models.RolePatient) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Доступно только пациентам"})
		return
	}
	h.respondCard(c, c.GetString(middleware.ContextUserIDKey))
}

func (h *Handler) GetByID(c *gin.Context) {
	role := c.GetString(middleware.ContextRoleKey)
	patientID := c.Param("id")

	if role == string(models.RoleDoctor) {
		doctorID := c.GetString(middleware.ContextUserIDKey)
		ok, err := h.users.DoctorCanAccessPatient(c.Request.Context(), doctorID, patientID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
			return
		}
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа к карте этого пациента"})
			return
		}
	} else if role != string(models.RoleAdmin) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Недостаточно прав"})
		return
	}

	h.respondCard(c, patientID)
}

func (h *Handler) respondCard(c *gin.Context, patientID string) {
	ctx := c.Request.Context()

	user, err := h.users.GetByID(ctx, patientID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Пациент не найден"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	if user.Role != models.RolePatient {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пациент не найден"})
		return
	}

	assignedDoctor, err := h.users.GetAssignedDoctor(ctx, patientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	diseases, err := h.cards.ListDiseases(ctx, patientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	analyses, err := h.cards.ListAnalyses(ctx, patientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	visits, err := h.cards.ListVisits(ctx, patientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	prescriptions, err := h.cards.ListPrescriptions(ctx, patientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	c.JSON(http.StatusOK, cardResponse{
		Profile: profileResponse{
			ID:        user.ID,
			FullName:  user.FullName,
			BirthDate: user.BirthDate.Format("02.01.2006"),
			Phone:     user.Phone,
		},
		AssignedDoctor: assignedDoctor,
		Diseases:       emptyDiseases(diseases),
		Analyses:       emptyAnalyses(analyses),
		Visits:         emptyVisits(visits),
		Prescriptions:  emptyPrescriptions(prescriptions),
	})
}

func emptyDiseases(v []repository.DiseaseRecord) []repository.DiseaseRecord {
	if v == nil {
		return []repository.DiseaseRecord{}
	}
	return v
}

func emptyAnalyses(v []repository.AnalysisRecord) []repository.AnalysisRecord {
	if v == nil {
		return []repository.AnalysisRecord{}
	}
	return v
}

func emptyVisits(v []repository.VisitRecord) []repository.VisitRecord {
	if v == nil {
		return []repository.VisitRecord{}
	}
	return v
}

func emptyPrescriptions(v []repository.PrescriptionRecord) []repository.PrescriptionRecord {
	if v == nil {
		return []repository.PrescriptionRecord{}
	}
	return v
}

type createDiseaseRequest struct {
	CatalogID   string  `json:"catalogId" binding:"required"`
	DiagnosedAt *string `json:"diagnosedAt"`
}

type patchDiseaseRequest struct {
	CatalogID   *string `json:"catalogId"`
	DiagnosedAt *string `json:"diagnosedAt"`
}

func (h *Handler) CreateDisease(c *gin.Context) {
	patientID := c.Param("id")
	if !h.ensureDoctorPatient(c, patientID) {
		return
	}

	var req createDiseaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}

	ctx := c.Request.Context()
	catItem, err := h.catalog.GetByID(ctx, strings.TrimSpace(req.CatalogID))
	if err != nil {
		if errors.Is(err, repository.ErrCatalogDiseaseNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Запись справочника не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	diagAt, err := parseDiagnosedDatePtr(req.DiagnosedAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Дата должна быть в формате ДД.ММ.ГГГГ"})
		return
	}

	rec, err := h.cards.CreateDisease(ctx, patientID, catItem.ID, diagAt, catItem.Name, catItem.Code)
	if err != nil {
		if errors.Is(err, repository.ErrPatientDiseaseDuplicate) {
			c.JSON(http.StatusConflict, gin.H{"error": "Этот диагноз уже есть в карте пациента"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"disease": rec})
}

func (h *Handler) UpdateDisease(c *gin.Context) {
	patientID := c.Param("id")
	diseaseID := c.Param("diseaseId")
	if !h.ensureDoctorPatient(c, patientID) {
		return
	}

	var req patchDiseaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}
	if req.CatalogID == nil && req.DiagnosedAt == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите catalogId и/или diagnosedAt"})
		return
	}

	ctx := c.Request.Context()
	existing, err := h.cards.GetDisease(ctx, patientID, diseaseID)
	if err != nil {
		if errors.Is(err, repository.ErrPatientDiseaseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	name := existing.Name
	code := existing.Code
	var catalogPtr *string
	if req.CatalogID != nil {
		id := strings.TrimSpace(*req.CatalogID)
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Пустой catalogId"})
			return
		}
		catItem, err := h.catalog.GetByID(ctx, id)
		if err != nil {
			if errors.Is(err, repository.ErrCatalogDiseaseNotFound) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Запись справочника не найдена"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
			return
		}
		name, code = catItem.Name, catItem.Code
		catalogPtr = &catItem.ID
	} else if existing.CatalogID != "" {
		catalogPtr = &existing.CatalogID
	}

	var diagPtr *time.Time
	if req.DiagnosedAt != nil {
		diagPtr, err = parseDiagnosedDatePtr(req.DiagnosedAt)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Дата должна быть в формате ДД.ММ.ГГГГ"})
			return
		}
	} else {
		diagPtr, err = parseDiagnosedDateString(existing.DiagnosedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
			return
		}
	}

	rec, err := h.cards.UpdateDisease(ctx, patientID, diseaseID, catalogPtr, name, code, diagPtr)
	if err != nil {
		if errors.Is(err, repository.ErrPatientDiseaseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
			return
		}
		if errors.Is(err, repository.ErrPatientDiseaseDuplicate) {
			c.JSON(http.StatusConflict, gin.H{"error": "Этот диагноз уже есть в карте пациента"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"disease": rec})
}

func (h *Handler) DeleteDisease(c *gin.Context) {
	patientID := c.Param("id")
	diseaseID := c.Param("diseaseId")
	if !h.ensureDoctorPatient(c, patientID) {
		return
	}

	err := h.cards.DeleteDisease(c.Request.Context(), patientID, diseaseID)
	if err != nil {
		if errors.Is(err, repository.ErrPatientDiseaseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

func (h *Handler) ensureDoctorPatient(c *gin.Context, patientID string) bool {
	if c.GetString(middleware.ContextRoleKey) != string(models.RoleDoctor) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Только врач может изменять медкарту"})
		return false
	}
	doctorID := c.GetString(middleware.ContextUserIDKey)
	ok, err := h.users.DoctorCanAccessPatient(c.Request.Context(), doctorID, patientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return false
	}
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Нет доступа к карте этого пациента"})
		return false
	}
	return true
}

func parseDiagnosedDatePtr(s *string) (*time.Time, error) {
	if s == nil {
		return nil, nil
	}
	v := strings.TrimSpace(*s)
	if v == "" {
		return nil, nil
	}
	t, err := time.Parse("02.01.2006", v)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func parseDiagnosedDateString(s string) (*time.Time, error) {
	v := strings.TrimSpace(s)
	if v == "" {
		return nil, nil
	}
	t, err := time.Parse("02.01.2006", v)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
