package server

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	_ "github.com/joho/godotenv/autoload"

	"medical-card/internal/admin"
	"medical-card/internal/appointment"
	"medical-card/internal/auth"
	"medical-card/internal/catalog"
	"medical-card/internal/database"
	"medical-card/internal/patient"
	"medical-card/internal/repository"
	"medical-card/internal/session"
)

type Server struct {
	port int
	db   database.Service

	authHandler        *auth.Handler
	patientHandler     *patient.Handler
	adminHandler       *admin.Handler
	catalogHandler     *catalog.Handler
	appointmentHandler *appointment.Handler
	sessions       session.Store
}

func NewServer() *http.Server {
	port, _ := strconv.Atoi(os.Getenv("PORT"))
	db := database.New()

	sessionStore, err := session.NewRedisStore()
	if err != nil {
		log.Fatalf("redis sessions: %v", err)
	}

	userRepo := repository.NewUserRepository(db.DB())
	cardRepo := repository.NewPatientCardRepository(db.DB())
	catalogRepo := repository.NewDiseaseCatalogRepository(db.DB())
	appointmentRepo := repository.NewAppointmentRepository(db.DB())
	authService := auth.NewService(userRepo, sessionStore)

	srv := &Server{
		port:               port,
		db:                 db,
		authHandler:        auth.NewHandler(authService),
		patientHandler:     patient.NewHandler(userRepo, cardRepo, catalogRepo),
		adminHandler:       admin.NewHandler(userRepo, catalogRepo),
		catalogHandler:     catalog.NewHandler(catalogRepo),
		appointmentHandler: appointment.NewHandler(userRepo, appointmentRepo),
		sessions:           sessionStore,
	}

	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", srv.port),
		Handler:      srv.RegisterRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return server
}
