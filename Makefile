PORT ?= 8080
DB_HOST ?= localhost

.PHONY: all build build-api run dev dev-db dev-api dev-frontend dev-stop dev-down docker-run docker-down test itest clean watch

all: build test

build:
	@echo "Building API..."
	@go build -o bin/api cmd/api/main.go

build-api: build


run: dev-api dev-frontend

# --- Local development (recommended) ---
# Terminal 1: make dev-db && make dev-api
# Terminal 2: make dev-frontend
# Open http://localhost:5173

dev-db:
	@echo "Starting Postgres only (port from .env)..."
	@docker compose up postgres -d

dev-api:
	@echo "API http://localhost:$(PORT) (DB_HOST=$(DB_HOST))"
	@lsof -ti :$(PORT) >/dev/null 2>&1 && { echo "Port $(PORT) busy. Run: make dev-stop"; exit 1; } || true
	@DB_HOST=$(DB_HOST) PORT=$(PORT) go run cmd/api/main.go

# Stop API on PORT (stale go run / bin/api)
dev-stop:
	@lsof -ti :$(PORT) | xargs kill 2>/dev/null || true
	@echo "Port $(PORT) cleared (if anything was listening)."

# Stop local dev: API + Vite (+ optional Docker Postgres)
dev-down: dev-stop
	@lsof -ti :5173 | xargs kill 2>/dev/null || true
	@echo "Port 5173 cleared (Vite)."
	@docker compose stop postgres 2>/dev/null || true
	@echo "Done. Native Postgres (brew) keeps running — stop separately if needed."

dev-frontend:
	@npm install --prefer-offline --no-fund --prefix ./frontend
	@npm run dev --prefix ./frontend

dev:
	@echo "Local dev — use two terminals:"
	@echo "  1) make dev-db && make dev-api"
	@echo "  2) make dev-frontend"
	@echo "Ensure .env has DB_* vars. Local API: make dev-api (overrides DB_HOST=localhost)."

# --- Docker (production) ---
docker-run:
	@if docker compose up --build 2>/dev/null; then \
		: ; \
	else \
		echo "Falling back to Docker Compose V1"; \
		docker-compose up --build; \
	fi

docker-down:
	@if docker compose down 2>/dev/null; then \
		: ; \
	else \
		echo "Falling back to Docker Compose V1"; \
		docker-compose down; \
	fi

test:
	@echo "Testing..."
	@go test ./... -v

itest:
	@echo "Running integration tests..."
	@go test ./internal/database -v

clean:
	@echo "Cleaning..."
	@rm -rf bin main

watch:
	@if command -v air > /dev/null; then \
		air; \
	else \
		read -p "Go's 'air' is not installed. Install? [Y/n] " choice; \
		if [ "$$choice" != "n" ] && [ "$$choice" != "N" ]; then \
			go install github.com/air-verse/air@latest; \
			air; \
		else \
			exit 1; \
		fi; \
	fi
