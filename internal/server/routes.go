package server

import (
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"medical-card/internal/middleware"
	"medical-card/internal/models"
)

func (s *Server) RegisterRoutes() http.Handler {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.GET("/", s.HelloWorldHandler)
	r.GET("/health", s.healthHandler)

	authGroup := r.Group("/auth")
	{
		authGroup.POST("/register", s.authHandler.Register)
		authGroup.POST("/login", s.authHandler.Login)
		authGroup.POST("/logout", s.authHandler.Logout)
		authGroup.GET("/me", middleware.RequireAuth(s.sessions), s.authHandler.Me)
	}

	patients := r.Group("/patients")
	patients.Use(middleware.RequireAuth(s.sessions))
	{
		patients.GET("", s.patientHandler.List)
		patients.GET("/me", middleware.RequireRole(models.RolePatient), s.patientHandler.GetMe)

		doctorOnly := middleware.RequireRole(models.RoleDoctor)
		patients.POST("/:id/diseases", doctorOnly, s.patientHandler.CreateDisease)
		patients.PATCH("/:id/diseases/:diseaseId", doctorOnly, s.patientHandler.UpdateDisease)
		patients.DELETE("/:id/diseases/:diseaseId", doctorOnly, s.patientHandler.DeleteDisease)

		patients.POST("/:id/analyses", doctorOnly, s.patientHandler.CreateAnalysis)
		patients.PATCH("/:id/analyses/:analysisId", doctorOnly, s.patientHandler.UpdateAnalysis)
		patients.DELETE("/:id/analyses/:analysisId", doctorOnly, s.patientHandler.DeleteAnalysis)

		patients.POST("/:id/visits", doctorOnly, s.patientHandler.CreateVisit)
		patients.PATCH("/:id/visits/:visitId", doctorOnly, s.patientHandler.UpdateVisit)
		patients.DELETE("/:id/visits/:visitId", doctorOnly, s.patientHandler.DeleteVisit)

		patients.POST("/:id/prescriptions", doctorOnly, s.patientHandler.CreatePrescription)
		patients.PATCH("/:id/prescriptions/:prescriptionId", doctorOnly, s.patientHandler.UpdatePrescription)
		patients.DELETE("/:id/prescriptions/:prescriptionId", doctorOnly, s.patientHandler.DeletePrescription)

		patients.GET("/:id", s.patientHandler.GetByID)
	}

	catalogGroup := r.Group("/catalog")
	catalogGroup.Use(
		middleware.RequireAuth(s.sessions),
		middleware.RequireAnyRole(models.RoleDoctor, models.RoleAdmin),
	)
	{
		catalogGroup.GET("/diseases", s.catalogHandler.ListDiseases)
	}

	doctorsGroup := r.Group("/doctors")
	doctorsGroup.Use(middleware.RequireAuth(s.sessions), middleware.RequireRole(models.RolePatient))
	{
		doctorsGroup.GET("", s.appointmentHandler.ListDoctors)
	}

	appointmentsGroup := r.Group("/appointments")
	appointmentsGroup.Use(middleware.RequireAuth(s.sessions))
	{
		appointmentsGroup.GET("", s.appointmentHandler.List)
		appointmentsGroup.POST("", middleware.RequireRole(models.RolePatient), s.appointmentHandler.Create)
		appointmentsGroup.POST("/:id/approve", middleware.RequireRole(models.RoleDoctor), s.appointmentHandler.Approve)
		appointmentsGroup.POST("/:id/reject", middleware.RequireRole(models.RoleDoctor), s.appointmentHandler.Reject)
		appointmentsGroup.POST("/:id/cancel", middleware.RequireRole(models.RolePatient), s.appointmentHandler.Cancel)
	}

	adminGroup := r.Group("/admin")
	adminGroup.Use(middleware.RequireAuth(s.sessions), middleware.RequireRole(models.RoleAdmin))
	{
		adminGroup.GET("/dashboard", s.adminHandler.Dashboard)
		adminGroup.POST("/catalog/diseases", s.adminHandler.CreateCatalogDisease)
		adminGroup.POST("/patients", s.adminHandler.CreatePatient)
		adminGroup.PATCH("/patients/:id", s.adminHandler.UpdatePatient)
		adminGroup.DELETE("/patients/:id", s.adminHandler.DeletePatient)
		adminGroup.PATCH("/patients/:id/assignment", s.adminHandler.UpdatePatientAssignment)
		adminGroup.POST("/doctors", s.adminHandler.CreateDoctor)
		adminGroup.PATCH("/doctors/:id", s.adminHandler.UpdateDoctor)
		adminGroup.DELETE("/doctors/:id", s.adminHandler.DeleteDoctor)
	}

	return r
}

func (s *Server) HelloWorldHandler(c *gin.Context) {
	resp := make(map[string]string)
	resp["message"] = "Hello World"

	c.JSON(http.StatusOK, resp)
}

func (s *Server) healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, s.db.Health())
}
