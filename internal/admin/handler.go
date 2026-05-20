package admin

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"medical-card/internal/models"
	"medical-card/internal/pagination"
	"medical-card/internal/repository"
)

type Handler struct {
	users   *repository.UserRepository
	catalog *repository.DiseaseCatalogRepository
}

func NewHandler(users *repository.UserRepository, catalog *repository.DiseaseCatalogRepository) *Handler {
	return &Handler{users: users, catalog: catalog}
}

type dashboardResponse struct {
	Stats struct {
		Patients       int `json:"patients"`
		Doctors        int `json:"doctors"`
		DiseaseCatalog int `json:"diseaseCatalog"`
	} `json:"stats"`
	Patients         []models.UserListItem `json:"patients"`
	PatientsPage     pagination.Meta       `json:"patientsPagination"`
	Doctors          []models.UserListItem `json:"doctors"`
	DoctorsPage      pagination.Meta       `json:"doctorsPagination"`
	Therapists       []models.UserListItem `json:"therapists"`
}

func (h *Handler) Dashboard(c *gin.Context) {
	ctx := c.Request.Context()

	patientCount, err := h.users.CountByRole(ctx, models.RolePatient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	doctorCount, err := h.users.CountByRole(ctx, models.RoleDoctor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	catalogCount, err := h.users.CountDiseaseCatalog(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	patients, err := h.users.ListByRole(ctx, models.RolePatient)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	doctors, err := h.users.ListByRole(ctx, models.RoleDoctor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}

	if patients == nil {
		patients = []models.UserListItem{}
	}
	if doctors == nil {
		doctors = []models.UserListItem{}
	}

	patientsQ, patientsPage, patientsLimit := pagination.ParsePrefixed(c, "patients")
	doctorsQ, doctorsPage, doctorsLimit := pagination.ParsePrefixed(c, "doctors")

	patientSlice, patientsMeta := pagination.Apply(patients, patientsQ, patientsPage, patientsLimit, pagination.MatchUserListItem)
	doctorSlice, doctorsMeta := pagination.Apply(doctors, doctorsQ, doctorsPage, doctorsLimit, pagination.MatchUserListItem)

	var therapists []models.UserListItem
	for _, d := range doctors {
		if repository.IsTherapistSpecialty(d.Specialty) {
			therapists = append(therapists, d)
		}
	}
	if therapists == nil {
		therapists = []models.UserListItem{}
	}

	var resp dashboardResponse
	resp.Stats.Patients = patientCount
	resp.Stats.Doctors = doctorCount
	resp.Stats.DiseaseCatalog = catalogCount
	resp.Patients = patientSlice
	resp.PatientsPage = patientsMeta
	resp.Doctors = doctorSlice
	resp.DoctorsPage = doctorsMeta
	resp.Therapists = therapists

	c.JSON(http.StatusOK, resp)
}

type assignmentRequest struct {
	DoctorID *string `json:"doctorId"`
}

func (h *Handler) UpdatePatientAssignment(c *gin.Context) {
	patientID := c.Param("id")

	var req assignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные данные"})
		return
	}

	err := h.users.SetAssignedDoctor(c.Request.Context(), patientID, req.DoctorID)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Пациент не найден"})
		case errors.Is(err, repository.ErrInvalidDoctor):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Указан несуществующий врач"})
		case errors.Is(err, repository.ErrNotTherapist):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Закрепить можно только терапевта"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		}
		return
	}

	patient, err := h.users.GetByID(c.Request.Context(), patientID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"ok": true})
		return
	}

	var assignedDoctorID *string
	var assignedDoctorName string
	if patient.AssignedDoctorID != nil {
		assignedDoctorID = patient.AssignedDoctorID
		doc, err := h.users.GetByID(c.Request.Context(), *patient.AssignedDoctorID)
		if err == nil {
			assignedDoctorName = doc.FullName
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"patientId":          patientID,
		"assignedDoctorId":   assignedDoctorID,
		"assignedDoctorName": assignedDoctorName,
	})
}
