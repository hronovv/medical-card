# medical-card — команды разработки
# Справка: make help

.DEFAULT_GOAL := help

PORT          ?= 8080
FRONTEND_PORT ?= 5173

# С хоста (Mac) к контейнерам Docker — всегда localhost, не postgres/redis из .env
DEV_DB_HOST    ?= localhost
DEV_REDIS_HOST ?= localhost

ifneq (,$(wildcard .env))
include .env
export
endif

# docker compose v2 или v1
DOCKER_COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

MIGRATE := go run ./cmd/migrate
API_RUN := DB_HOST=$(DEV_DB_HOST) REDIS_HOST=$(DEV_REDIS_HOST) PORT=$(PORT) go run ./cmd/api/main.go

.PHONY: help \
	setup dev-setup \
	dev-db dev-down dev-stop dev-api dev-frontend dev-logs \
	migrate-up migrate-down migrate-version migrate-force migrate-create \
	build test itest clean watch \
	docker-up docker-down

# ---------------------------------------------------------------------------
# Справка
# ---------------------------------------------------------------------------

help:
	@echo "Пульс — medical-card"
	@echo ""
	@echo "Первый запуск:"
	@echo "  cp .env.example .env"
	@echo "  make dev-setup          # Postgres + Redis + миграции"
	@echo "  make dev-api            # терминал 1 → http://localhost:$(PORT)"
	@echo "  make dev-frontend       # терминал 2 → http://localhost:$(FRONTEND_PORT)"
	@echo ""
	@echo "Локальная разработка:"
	@echo "  make dev-db             # поднять Postgres и Redis (Docker)"
	@echo "  make dev-down           # остановить API, Vite, Postgres, Redis"
	@echo "  make dev-stop           # только освободить порт API ($(PORT))"
	@echo "  make dev-api            # API (DB/Redis → $(DEV_DB_HOST):…)"
	@echo "  make dev-frontend       # Vite"
	@echo "  make dev-logs           # логи Postgres и Redis"
	@echo ""
	@echo "Миграции (БД на $(DEV_DB_HOST):$(DB_PORT)):"
	@echo "  make migrate-up"
	@echo "  make migrate-down       # откат (STEPS=1 по умолчанию)"
	@echo "  make migrate-version"
	@echo "  make migrate-create NAME=описание"
	@echo ""
	@echo "Сборка и тесты:"
	@echo "  make build              # bin/api"
	@echo "  make test"
	@echo "  make itest"
	@echo "  make clean"
	@echo "  make watch              # air (hot reload API)"
	@echo ""
	@echo "Docker (весь стек):"
	@echo "  make docker-up"
	@echo "  make docker-down"

# ---------------------------------------------------------------------------
# Локальная разработка
# ---------------------------------------------------------------------------

setup: ## alias для dev-setup
	@$(MAKE) dev-setup

dev-setup: dev-db
	@echo "Waiting for Postgres..."
	@sleep 3
	@$(MAKE) migrate-up
	@echo ""
	@echo "Готово. Дальше:"
	@echo "  make dev-api"
	@echo "  make dev-frontend"

dev-db:
	@echo "Starting Postgres + Redis..."
	@$(DOCKER_COMPOSE) up postgres redis -d
	@echo "Postgres → $(DEV_DB_HOST):$(DB_PORT)/$(DB_NAME)"
	@echo "Redis  → $(DEV_REDIS_HOST):$(REDIS_PORT)"

dev-down: dev-stop
	@lsof -ti :$(FRONTEND_PORT) | xargs kill 2>/dev/null || true
	@echo "Port $(FRONTEND_PORT) cleared (Vite)."
	@$(DOCKER_COMPOSE) stop postgres redis 2>/dev/null || true
	@echo "Postgres and Redis stopped."

dev-stop:
	@lsof -ti :$(PORT) | xargs kill 2>/dev/null || true
	@echo "Port $(PORT) cleared (API)."

dev-api:
	@echo "API http://localhost:$(PORT)"
	@echo "  DB_HOST=$(DEV_DB_HOST)  REDIS_HOST=$(DEV_REDIS_HOST)"
	@lsof -ti :$(PORT) >/dev/null 2>&1 && { echo "Port $(PORT) busy. Run: make dev-stop"; exit 1; } || true
	@$(API_RUN)

dev-frontend:
	@npm install --prefer-offline --no-fund --prefix ./frontend
	@npm run dev --prefix ./frontend

dev-logs:
	@$(DOCKER_COMPOSE) logs -f postgres redis

# ---------------------------------------------------------------------------
# Миграции (с хоста — DB_HOST=localhost)
# ---------------------------------------------------------------------------

migrate-up:
	@echo "Applying migrations → $(DEV_DB_HOST):$(DB_PORT)/$(DB_NAME)"
	@DB_HOST=$(DEV_DB_HOST) $(MIGRATE) -command up

migrate-down:
	@echo "Rolling back $(or $(STEPS),1) migration(s) on $(DEV_DB_HOST)..."
	@DB_HOST=$(DEV_DB_HOST) $(MIGRATE) -command down -steps $(or $(STEPS),1)

migrate-version:
	@DB_HOST=$(DEV_DB_HOST) $(MIGRATE) -command version

migrate-force:
	@test -n "$(VERSION)" || (echo "Usage: make migrate-force VERSION=<number>"; exit 1)
	@DB_HOST=$(DEV_DB_HOST) $(MIGRATE) -command force -version $(VERSION)

migrate-create:
	@test -n "$(NAME)" || (echo "Usage: make migrate-create NAME=add_something"; exit 1)
	@next=$$(printf "%06d" $$(($$(ls migrations/*.up.sql 2>/dev/null | wc -l | tr -d ' ') + 1))); \
	touch "migrations/$${next}_$(NAME).up.sql" "migrations/$${next}_$(NAME).down.sql"; \
	echo "Created migrations/$${next}_$(NAME).{up,down}.sql"

# ---------------------------------------------------------------------------
# Сборка, тесты
# ---------------------------------------------------------------------------

build:
	@echo "Building bin/api..."
	@go build -o bin/api ./cmd/api/main.go

test:
	@go test ./... -count=1

itest:
	@go test ./internal/database/... -count=1 -v

clean:
	@rm -rf bin/
	@echo "Removed bin/"

watch:
	@if command -v air >/dev/null 2>&1; then \
		DB_HOST=$(DEV_DB_HOST) REDIS_HOST=$(DEV_REDIS_HOST) PORT=$(PORT) air; \
	else \
		echo "Install air: go install github.com/air-verse/air@latest"; \
		exit 1; \
	fi

# ---------------------------------------------------------------------------
# Docker — полный стек (app + frontend + postgres + redis)
# ---------------------------------------------------------------------------

docker-up:
	@test -f .env || (echo "Create .env first: cp .env.example .env" && exit 1)
	@$(DOCKER_COMPOSE) up --build -d
	@echo ""
	@echo "Pulse is running:"
	@echo "  Frontend  http://localhost:5173"
	@echo "  API       http://localhost:$(PORT)"
	@echo "  Health    http://localhost:$(PORT)/health"
	@echo ""
	@echo "Demo login: patient2@pulse.ru / patient123"

docker-down:
	@$(DOCKER_COMPOSE) down
	@echo "All compose services stopped."

docker-reset:
	@$(DOCKER_COMPOSE) down -v
	@echo "Volumes removed. Run make docker-up for a fresh install."

# Устаревшие алиасы (совместимость со старыми командами)
.PHONY: dev build-api run docker-run all
dev: help
build-api: build
run:
	@echo "Use two terminals: make dev-api && make dev-frontend"
	@exit 1
docker-run: docker-up

all: build test
