package patient

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"medical-card/internal/middleware"
	"medical-card/internal/repository"
)

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

func parseDDMMYYYY(s string) (time.Time, error) {
	return time.Parse("02.01.2006", strings.TrimSpace(s))
}

func (h *Handler) doctorCanEditVisit(ctx context.Context, doctorID, patientID string, v *repository.VisitRecord) bool {
	if v.ConductingDoctorID != "" && v.ConductingDoctorID == doctorID {
		return true
	}
	if v.ConductingDoctorID == "" {
		ok, err := h.users.IsPatientAssignedTo(ctx, patientID, doctorID)
		return err == nil && ok
	}
	return false
}

type createAnalysisRequest struct {
	Type   string `json:"type" binding:"required"`
	Result string `json:"result" binding:"required"`
	Date   string `json:"date" binding:"required"`
}

func (h *Handler) CreateAnalysis(c *gin.Context) {
	patientID := c.Param("id")
	if !h.ensureDoctorPatient(c, patientID) {
		return
	}
	var req createAnalysisRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}
	d, err := parseDDMMYYYY(req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Дата должна быть в формате ДД.ММ.ГГГГ"})
		return
	}
	rec, err := h.cards.CreateAnalysis(c.Request.Context(), patientID,
		strings.TrimSpace(req.Type), strings.TrimSpace(req.Result), d)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"analysis": rec})
}

type patchAnalysisRequest struct {
	Type   *string `json:"type"`
	Result *string `json:"result"`
	Date   *string `json:"date"`
}

func (h *Handler) UpdateAnalysis(c *gin.Context) {
	patientID := c.Param("id")
	analysisID := c.Param("analysisId")
	if !h.ensureDoctorPatient(c, patientID) {
		return
	}
	var req patchAnalysisRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}
	if req.Type == nil && req.Result == nil && req.Date == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Нет полей для обновления"})
		return
	}
	var d *time.Time
	if req.Date != nil {
		t, err := parseDDMMYYYY(*req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Дата должна быть в формате ДД.ММ.ГГГГ"})
			return
		}
		d = &t
	}
	rec, err := h.cards.UpdateAnalysis(c.Request.Context(), patientID, analysisID, req.Type, req.Result, d)
	if err != nil {
		if errors.Is(err, repository.ErrPatientAnalysisNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"analysis": rec})
}

func (h *Handler) DeleteAnalysis(c *gin.Context) {
	patientID := c.Param("id")
	analysisID := c.Param("analysisId")
	if !h.ensureDoctorPatient(c, patientID) {
		return
	}
	if err := h.cards.DeleteAnalysis(c.Request.Context(), patientID, analysisID); err != nil {
		if errors.Is(err, repository.ErrPatientAnalysisNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

type createVisitRequest struct {
	Date  string  `json:"date" binding:"required"`
	Notes *string `json:"notes"`
}

func (h *Handler) CreateVisit(c *gin.Context) {
	patientID := c.Param("id")
	if !h.ensureDoctorPatient(c, patientID) {
		return
	}
	var req createVisitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}
	d, err := parseDDMMYYYY(req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Дата должна быть в формате ДД.ММ.ГГГГ"})
		return
	}
	doctorID := c.GetString(middleware.ContextUserIDKey)
	doc, err := h.users.GetByID(c.Request.Context(), doctorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	notes := ""
	if req.Notes != nil {
		notes = *req.Notes
	}
	rec, err := h.cards.CreateVisit(c.Request.Context(), patientID, d, doctorAbbrevName(doc.FullName), notes, doctorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"visit": rec})
}

type patchVisitRequest struct {
	Date  *string `json:"date"`
	Notes *string `json:"notes"`
}

func (h *Handler) UpdateVisit(c *gin.Context) {
	patientID := c.Param("id")
	visitID := c.Param("visitId")
	if !h.ensureDoctorPatient(c, patientID) {
		return
	}
	var req patchVisitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}
	if req.Date == nil && req.Notes == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Нет полей для обновления"})
		return
	}
	ctx := c.Request.Context()
	v, err := h.cards.GetVisit(ctx, patientID, visitID)
	if err != nil {
		if errors.Is(err, repository.ErrPatientVisitNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	doctorID := c.GetString(middleware.ContextUserIDKey)
	if !h.doctorCanEditVisit(ctx, doctorID, patientID, v) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Редактировать можно только свой приём"})
		return
	}
	var d *time.Time
	if req.Date != nil {
		t, err := parseDDMMYYYY(*req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Дата должна быть в формате ДД.ММ.ГГГГ"})
			return
		}
		d = &t
	}
	rec, err := h.cards.UpdateVisit(ctx, patientID, visitID, d, req.Notes)
	if err != nil {
		if errors.Is(err, repository.ErrPatientVisitNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"visit": rec})
}

func (h *Handler) DeleteVisit(c *gin.Context) {
	patientID := c.Param("id")
	visitID := c.Param("visitId")
	if !h.ensureDoctorPatient(c, patientID) {
		return
	}
	ctx := c.Request.Context()
	v, err := h.cards.GetVisit(ctx, patientID, visitID)
	if err != nil {
		if errors.Is(err, repository.ErrPatientVisitNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	doctorID := c.GetString(middleware.ContextUserIDKey)
	if !h.doctorCanEditVisit(ctx, doctorID, patientID, v) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Удалить можно только свой приём"})
		return
	}
	if err := h.cards.DeleteVisit(ctx, patientID, visitID); err != nil {
		if errors.Is(err, repository.ErrPatientVisitNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

type createPrescriptionRequest struct {
	Drug       string  `json:"drug" binding:"required"`
	Dosage     string  `json:"dosage" binding:"required"`
	Duration   *string `json:"duration"`
	VisitDate  *string `json:"visitDate"`
}

func (h *Handler) CreatePrescription(c *gin.Context) {
	patientID := c.Param("id")
	if !h.ensureDoctorPatient(c, patientID) {
		return
	}
	var req createPrescriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}
	var vd *time.Time
	if req.VisitDate != nil && strings.TrimSpace(*req.VisitDate) != "" {
		t, err := parseDDMMYYYY(*req.VisitDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Дата визита: формат ДД.ММ.ГГГГ"})
			return
		}
		vd = &t
	}
	dur := ""
	if req.Duration != nil {
		dur = *req.Duration
	}
	rec, err := h.cards.CreatePrescription(c.Request.Context(), patientID,
		strings.TrimSpace(req.Drug), strings.TrimSpace(req.Dosage), dur, vd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"prescription": rec})
}

type patchPrescriptionRequest struct {
	Drug      *string `json:"drug"`
	Dosage    *string `json:"dosage"`
	Duration  *string `json:"duration"`
	VisitDate *string `json:"visitDate"`
}

func (h *Handler) UpdatePrescription(c *gin.Context) {
	patientID := c.Param("id")
	rxID := c.Param("prescriptionId")
	if !h.ensureDoctorPatient(c, patientID) {
		return
	}
	var req patchPrescriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}
	if req.Drug == nil && req.Dosage == nil && req.Duration == nil && req.VisitDate == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Нет полей для обновления"})
		return
	}
	var vd *time.Time
	if req.VisitDate != nil {
		if strings.TrimSpace(*req.VisitDate) == "" {
			t := time.Time{}
			vd = &t
		} else {
			t, err := parseDDMMYYYY(*req.VisitDate)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Дата визита: формат ДД.ММ.ГГГГ"})
				return
			}
			vd = &t
		}
	}
	rec, err := h.cards.UpdatePrescription(c.Request.Context(), patientID, rxID, req.Drug, req.Dosage, req.Duration, vd)
	if err != nil {
		if errors.Is(err, repository.ErrPatientPrescriptionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"prescription": rec})
}

func (h *Handler) DeletePrescription(c *gin.Context) {
	patientID := c.Param("id")
	rxID := c.Param("prescriptionId")
	if !h.ensureDoctorPatient(c, patientID) {
		return
	}
	if err := h.cards.DeletePrescription(c.Request.Context(), patientID, rxID); err != nil {
		if errors.Is(err, repository.ErrPatientPrescriptionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Запись не найдена"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}
