package pagination

import (
	"strings"

	"github.com/gin-gonic/gin"
	"medical-card/internal/models"
	"medical-card/internal/repository"
)

func MatchUserListItem(u models.UserListItem, qLower string) bool {
	return ContainsFold(u.FullName, qLower) ||
		ContainsFold(u.Email, qLower) ||
		ContainsFold(u.Phone, qLower) ||
		ContainsFold(u.Specialty, qLower) ||
		ContainsFold(u.AssignedDoctorName, qLower) ||
		ContainsFold(u.BirthDate, qLower)
}

func MatchAppointment(a repository.AppointmentRecord, qLower string) bool {
	return ContainsFold(a.PatientName, qLower) ||
		ContainsFold(a.DoctorName, qLower) ||
		ContainsFold(a.DoctorSpecialty, qLower) ||
		ContainsFold(a.PreferredDate, qLower) ||
		ContainsFold(a.RequestedAt, qLower) ||
		ContainsFold(a.Notes, qLower) ||
		ContainsFold(string(a.Status), qLower)
}

func MatchCatalogItem(item repository.DiseaseCatalogItem, qLower string) bool {
	return ContainsFold(item.Name, qLower) || ContainsFold(item.Code, qLower)
}

func ParsePrefixed(c *gin.Context, prefix string) (q string, page, limit int) {
	q = strings.TrimSpace(c.Query(prefix + "Q"))
	page = parseInt(c.Query(prefix+"Page"), 1)
	limit = parseInt(c.Query(prefix+"Limit"), DefaultLimit)
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	return q, page, limit
}
