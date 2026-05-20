package pagination

import (
	"math"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	DefaultLimit = 10
	MaxLimit     = 100
)

type Meta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

func Parse(c *gin.Context) (q string, page, limit int) {
	q = strings.TrimSpace(c.Query("q"))
	page = parseInt(c.Query("page"), 1)
	limit = parseInt(c.Query("limit"), DefaultLimit)
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

func parseInt(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return n
}

func MetaFor(total, page, limit int) Meta {
	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(limit)))
	}
	if totalPages == 0 && total > 0 {
		totalPages = 1
	}
	return Meta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}
}

func Apply[T any](items []T, q string, page, limit int, match func(T, string) bool) ([]T, Meta) {
	if items == nil {
		items = []T{}
	}
	filtered := items
	if q != "" {
		qLower := strings.ToLower(q)
		var next []T
		for _, item := range items {
			if match(item, qLower) {
				next = append(next, item)
			}
		}
		filtered = next
	}
	total := len(filtered)
	meta := MetaFor(total, page, limit)
	start := (page - 1) * limit
	if start >= total {
		return []T{}, meta
	}
	end := start + limit
	if end > total {
		end = total
	}
	return filtered[start:end], meta
}

func ContainsFold(haystack, needle string) bool {
	return strings.Contains(strings.ToLower(haystack), needle)
}
