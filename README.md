# Медицинская карта

Веб-приложение для ведения электронной медицинской карты: диагнозы, анализы, посещения врачей и рецепты. Проект курсовой работы.

## Стек

| Часть | Технологии |
|-------|------------|
| Backend | Go, Gin, PostgreSQL |
| Frontend | React, TypeScript, Vite |
| Инфраструктура | Docker Compose, Makefile |

## Возможности

- **Пациент** — просмотр своей медицинской карты
- **Врач** — ведение записей по пациентам
- **Администратор** — управление пациентами, врачами и справочником болезней

## Быстрый старт

### Требования

- Go 1.26+
- Node.js 20+
- PostgreSQL (локально или через Docker)

### Запуск фронтенда

```bash
make dev-frontend
```

Откройте http://localhost:5173

### Запуск API

```bash
make dev-api
```

API: http://localhost:8080

### Postgres в Docker

```bash
make dev-db
make dev-api
```

### Полный стек в Docker

```bash
cp .env.example .env
make docker-run
```

## Переменные окружения

Скопируйте `.env.example` в `.env` и при необходимости измените значения:

| Переменная | Описание |
|------------|----------|
| `PORT` | Порт HTTP API (по умолчанию `8080`) |
| `DB_HOST` | Хост PostgreSQL (`localhost` или `postgres` в Docker) |
| `DB_PORT` | Порт PostgreSQL |
| `DB_NAME` | Имя базы данных |
| `DB_USER` / `DB_PASSWORD` | Учётные данные |

## Makefile

| Команда | Описание |
|---------|----------|
| `make dev-frontend` | Dev-сервер React (Vite) |
| `make dev-api` | API на Go |
| `make dev-db` | Только PostgreSQL в Docker |
| `make dev-down` | Остановить локальные процессы на 8080/5173 |
| `make docker-run` | Собрать и поднять compose |
| `make docker-down` | Остановить compose |
| `make build` | Собрать бинарник API |
| `make test` | Тесты Go |

## Структура репозитория

```
medical-card/
├── cmd/api/           # Точка входа API
├── internal/          # Сервер, работа с БД
├── frontend/          # React-приложение
├── docker-compose.yml
└── Makefile
```

## API (текущее состояние)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Приветствие |
| GET | `/health` | Статус сервиса и БД |

REST для сущностей медкарты — в разработке.

## Лицензия

Учебный проект.
