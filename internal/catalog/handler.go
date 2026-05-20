package catalog

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"medical-card/internal/pagination"
	"medical-card/internal/repository"
)

type Handler struct {
	catalog *repository.DiseaseCatalogRepository
}

func NewHandler(catalog *repository.DiseaseCatalogRepository) *Handler {
	return &Handler{catalog: catalog}
}

func (h *Handler) ListDiseases(c *gin.Context) {
	items, err := h.catalog.ListAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
		return
	}
	if items == nil {
		items = []repository.DiseaseCatalogItem{}
	}

	q, page, limit := pagination.Parse(c)
	slice, meta := pagination.Apply(items, q, page, limit, pagination.MatchCatalogItem)
	c.JSON(http.StatusOK, gin.H{"diseases": slice, "pagination": meta})
}
