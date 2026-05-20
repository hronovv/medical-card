# Frontend — Пульс

Клиентская часть: лендинг, вход/регистрация, кабинеты пациента, врача и администратора.

## Стек

- React 19, TypeScript, Vite, React Router
- Стили: `src/styles/medical.css` (бело-зелёная тема)

## Запуск

Из корня репозитория:

```bash
make dev-frontend
```

Или из этой папки:

```bash
npm install
npm run dev
```

Приложение: http://localhost:5173

Запросы к API проксируются на бэкенд (`/api/*` → `:8080`). См. `vite.config.ts`.

## Сборка

```bash
npm run build
npm run preview
```

## Маршруты

| Путь | Описание |
|------|----------|
| `/` | Главная |
| `/login`, `/register` | Вход и регистрация пациента |
| `/patient` | Медкарта (просмотр) + запись на приём |
| `/doctor` | Кабинет врача: пациенты, записи, медкарта |
| `/admin` | Админка: пользователи, справочник МКБ |

Полный список API: [docs/API.md](../docs/API.md).

## Структура

```
frontend/src/
├── pages/           # Страницы
├── components/      # UI-компоненты
├── api/             # HTTP-клиент и эндпоинты
├── context/         # AuthContext (сессия)
├── styles/          # medical.css
├── App.tsx
└── main.tsx
```

## Переменные окружения

Файл `.env` (см. `.env.example`):

| Переменная | Описание |
|------------|----------|
| `VITE_API_TARGET` | URL бэкенда для прокси Vite (по умолчанию `http://127.0.0.1:8080`) |

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev-сервер с HMR |
| `npm run build` | Production-сборка |
| `npm run preview` | Просмотр сборки |
| `npm run lint` | ESLint |
