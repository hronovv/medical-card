package main

import (
	"errors"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/joho/godotenv/autoload"
)

func main() {
	command := flag.String("command", "up", "migration command: up, down, version, force")
	steps := flag.Int("steps", 1, "number of steps for down")
	version := flag.Int("version", 0, "version for force")
	flag.Parse()

	dbURL := databaseURL()
	m, err := migrate.New("file://migrations", dbURL)
	if err != nil {
		log.Fatalf("migrate init: %v", err)
	}
	defer m.Close()

	switch *command {
	case "up":
		if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Fatalf("migrate up: %v", err)
		}
		log.Println("migrations applied")
	case "down":
		if err := m.Steps(-*steps); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Fatalf("migrate down: %v", err)
		}
		log.Printf("rolled back %d migration(s)", *steps)
	case "version":
		v, dirty, err := m.Version()
		if err != nil {
			log.Fatalf("migrate version: %v", err)
		}
		log.Printf("version=%d dirty=%v", v, dirty)
	case "force":
		if err := m.Force(*version); err != nil {
			log.Fatalf("migrate force: %v", err)
		}
		log.Printf("forced version %d", *version)
	default:
		log.Fatalf("unknown command: %s", *command)
	}
}

func databaseURL() string {
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASSWORD")
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	name := os.Getenv("DB_NAME")
	if user == "" || host == "" || port == "" || name == "" {
		log.Fatal("set DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME in .env")
	}
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		user, pass, host, port, name,
	)
}
