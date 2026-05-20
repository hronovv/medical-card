package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"medical-card/internal/models"
	"medical-card/internal/session"
)

const (
	ContextUserIDKey = "userID"
	ContextRoleKey   = "role"
	ContextTokenKey  = "sessionToken"
)

func RequireAuth(sessions session.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Требуется авторизация"})
			return
		}

		tokenString := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		data, err := sessions.Get(c.Request.Context(), tokenString)
		if err != nil {
			if errors.Is(err, session.ErrSessionNotFound) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Сессия истекла или недействительна"})
				return
			}
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера"})
			return
		}

		c.Set(ContextUserIDKey, data.UserID)
		c.Set(ContextRoleKey, string(data.Role))
		c.Set(ContextTokenKey, tokenString)
		c.Next()
	}
}

func RequireRole(role models.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString(ContextRoleKey) != string(role) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Недостаточно прав"})
			return
		}
		c.Next()
	}
}

// RequireAnyRole allows the request if the session role is one of the given roles.
func RequireAnyRole(roles ...models.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString(ContextRoleKey)
		for _, r := range roles {
			if role == string(r) {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Недостаточно прав"})
	}
}
