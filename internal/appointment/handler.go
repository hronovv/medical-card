package appointment

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"medical-card/internal/middleware"
	"medical-card/internal/models"
	"medical-card/internal/pagination"
	"medical-card/internal/repository"
	"medical-card/internal/validation"
)

type Handler struct {
	users        *repository.UserRepository
	appointments *repository.AppointmentRepository
}

func NewHandler(users *repository.UserRepository, appointments *repository.AppointmentRepository) *Handler {
	return &Handler{users: users, appointments: appointments}
}

func doctorAbbrevName(fullName string) string {
	parts := strings.Fields(strings.TrimSpace(fullName))
	switch len(parts) {
	case 0:
		return fullName
	case 1:
		return parts[0]
	default:
		var sb strings.Builder
		for i := 1; i < len(parts); i++ {
			r, _ := utf8.DecodeRuneInString(parts[i])
			if r != utf8.RuneError {
				sb.WriteRune(r)
				sb.WriteByte('.')
			}
		}
		return parts[0] + " " + sb.String()
	}
}

func parseStatusFilter(raw string) (*repository.AppointmentStatus, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	switch repository.AppointmentStatus(raw) {
	case repository.AppointmentPending, repository.AppointmentApproved, repository.AppointmentRejected:
		s := repository.AppointmentStatus(raw)
		return &s, nil
	default:
		return nil, errors.New("invalid status")
	}
}

func (h *Handler) bookableDoctors(ctx context.Context, patientID string) ([]models.UserListItem, error) {
	doctors, err := h.users.ListByRole(ctx, models.RoleDoctor)
	if err != nil {
		return nil, err
	}
	assigned, err := h.users.GetAssignedDoctor(ctx, patientID)
	if err != nil {
		return nil, err
	}
	assignedID := ""
	if assigned != nil {
		assignedID = assigned.ID
	}

	var bookable []models.UserListItem
	for _, d := range doctors {
		if !repository.IsTherapistSpecialty(d.Specialty) {
			bookable = append(bookable, d)
			continue
		}
		if d.ID == assignedID {
			bookable = append(bookable, d)
		}
	}
	return bookable, nil
}

func (h *Handler) validateBookableDoctor(ctx context.Context, patientID string, doctor *models.User) error {
	if doctor.Role != models.RoleDoctor {
		return repository.ErrDoctorNotBookable
	}
	if !repository.IsTherapistSpecialty(doctor.Specialty) {
		return nil
	}
	assigned, err := h.users.GetAssignedDoctor(ctx, patientID)
	if err != nil {
		return err
	}
	if assigned != nil && assigned.ID == doctor.ID {
		return nil
	}
	return repository.ErrCannotBookTherapist
}

func (h *Handler) ListDoctors(c *gin.Context) {
	if c.GetString(middleware.ContextRoleKey) != string(models.RolePatient) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Доступно только пациентам"})
		return
	}

	patientID := c.GetString(middleware.ContextUserIDKey)
	doctors, err := h.bookableDoctors(c.Request.Context(), patientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	if doctors == nil {
		doctors = []models.UserListItem{}
	}

	q, page, limit := pagination.Parse(c)
	slice, meta := pagination.Apply(doctors, q, page, limit, pagination.MatchUserListItem)
	c.JSON(http.StatusOK, gin.H{"doctors": slice, "pagination": meta})
}

func (h *Handler) List(c *gin.Context) {
	ctx := c.Request.Context()
	role := c.GetString(middleware.ContextRoleKey)
	userID := c.GetString(middleware.ContextUserIDKey)

	status, err := parseStatusFilter(c.Query("status"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный статус"})
		return
	}

	var items []repository.AppointmentRecord
	switch role {
	case string(models.RolePatient):
		items, err = h.appointments.ListForPatient(ctx, userID, status)
	case string(models.RoleDoctor):
		items, err = h.appointments.ListForDoctor(ctx, userID, status)
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "Недостаточно прав"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	if items == nil {
		items = []repository.AppointmentRecord{}
	}

	q, page, limit := pagination.Parse(c)
	slice, meta := pagination.Apply(items, q, page, limit, pagination.MatchAppointment)
	c.JSON(http.StatusOK, gin.H{"appointments": slice, "pagination": meta})
}

type createRequest struct {
	DoctorID      string `json:"doctorId" binding:"required"`
	PreferredDate string `json:"preferredDate" binding:"required"`
	Notes         string `json:"notes"`
}

func (h *Handler) Create(c *gin.Context) {
	if c.GetString(middleware.ContextRoleKey) != string(models.RolePatient) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Доступно только пациентам"})
		return
	}

	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите врача и желаемую дату"})
		return
	}

	preferredDate, err := validation.ParseAndValidateFutureDate(req.PreferredDate)
	if err != nil {
		if errors.Is(err, validation.ErrDateInPast) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Нельзя записаться на прошедшую дату"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "Дата должна быть в формате ДД.ММ.ГГГГ"})
		return
	}

	doctor, err := h.users.GetByID(c.Request.Context(), req.DoctorID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Врач не найден"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	patientID := c.GetString(middleware.ContextUserIDKey)
	if err := h.validateBookableDoctor(c.Request.Context(), patientID, doctor); err != nil {
		if errors.Is(err, repository.ErrCannotBookTherapist) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Записаться к терапевту можно только к вашему закреплённому врачу"})
			return
		}
		if errors.Is(err, repository.ErrDoctorNotBookable) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "К этому врачу нельзя записаться через заявку"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	rec, err := h.appointments.Create(c.Request.Context(), patientID, req.DoctorID, preferredDate, req.Notes)
	if err != nil {
		if errors.Is(err, repository.ErrDuplicatePendingRequest) {
			c.JSON(http.StatusConflict, gin.H{"error": "У вас уже есть ожидающая заявка к этому врачу"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"appointment": rec})
}

type approveRequest struct {
	VisitDate string `json:"visitDate"`
	Notes     string `json:"notes"`
}

func (h *Handler) Approve(c *gin.Context) {
	if c.GetString(middleware.ContextRoleKey) != string(models.RoleDoctor) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Доступно только врачам"})
		return
	}

	var req approveRequest
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
			return
		}
	}

	var visitDate time.Time
	if strings.TrimSpace(req.VisitDate) != "" {
		var err error
		visitDate, err = validation.ParseAndValidateFutureDate(req.VisitDate)
		if err != nil {
			if errors.Is(err, validation.ErrDateInPast) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Дата приёма не может быть в прошлом"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": "Дата приёма должна быть в формате ДД.ММ.ГГГГ"})
			return
		}
	}

	doctorID := c.GetString(middleware.ContextUserIDKey)
	doctor, err := h.users.GetByID(c.Request.Context(), doctorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	ctx := c.Request.Context()
	apptID := c.Param("id")
	pending, err := h.appointments.GetByID(ctx, apptID)
	if err != nil {
		if errors.Is(err, repository.ErrAppointmentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Заявка не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	if pending.DoctorID != doctorID {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заявка не найдена"})
		return
	}
	if pending.Status != repository.AppointmentPending {
		c.JSON(http.StatusConflict, gin.H{"error": "Заявка уже обработана"})
		return
	}

	finalVisitDate := visitDate
	if finalVisitDate.IsZero() {
		finalVisitDate, err = validation.ParseDDMMYYYY(pending.PreferredDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректная дата в заявке"})
			return
		}
	}
	if err := validation.ValidateNotBeforeToday(finalVisitDate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Дата приёма не может быть в прошлом"})
		return
	}

	appt, visit, err := h.appointments.Approve(
		ctx,
		apptID,
		doctorID,
		doctorAbbrevName(doctor.FullName),
		visitDate,
		req.Notes,
	)
	if err != nil {
		if errors.Is(err, repository.ErrAppointmentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Заявка не найдена"})
			return
		}
		if errors.Is(err, repository.ErrAppointmentNotPending) {
			c.JSON(http.StatusConflict, gin.H{"error": "Заявка уже обработана"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"appointment": appt, "visit": visit})
}

func (h *Handler) Reject(c *gin.Context) {
	if c.GetString(middleware.ContextRoleKey) != string(models.RoleDoctor) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Доступно только врачам"})
		return
	}

	doctorID := c.GetString(middleware.ContextUserIDKey)
	appt, err := h.appointments.Reject(c.Request.Context(), c.Param("id"), doctorID)
	if err != nil {
		if errors.Is(err, repository.ErrAppointmentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Заявка не найдена"})
			return
		}
		if errors.Is(err, repository.ErrAppointmentNotPending) {
			c.JSON(http.StatusConflict, gin.H{"error": "Заявка уже обработана"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"appointment": appt})
}

func (h *Handler) Cancel(c *gin.Context) {
	if c.GetString(middleware.ContextRoleKey) != string(models.RolePatient) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Доступно только пациентам"})
		return
	}

	patientID := c.GetString(middleware.ContextUserIDKey)
	if err := h.appointments.CancelByPatient(c.Request.Context(), c.Param("id"), patientID); err != nil {
		if errors.Is(err, repository.ErrAppointmentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Заявка не найдена"})
			return
		}
		if errors.Is(err, repository.ErrAppointmentNotPending) {
			c.JSON(http.StatusConflict, gin.H{"error": "Отменить можно только ожидающую заявку"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}
