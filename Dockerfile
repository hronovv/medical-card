FROM golang:1.26-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o main cmd/api/main.go
RUN go build -o migrate cmd/migrate/main.go

FROM alpine:3.20.1 AS prod
WORKDIR /app
COPY --from=build /app/main /app/main
EXPOSE 8080
CMD ["./main"]

FROM alpine:3.20.1 AS migrate
WORKDIR /app
COPY --from=build /app/migrate /app/migrate
COPY migrations /app/migrations
CMD ["./migrate", "-command", "up"]

FROM node:20-alpine AS frontend_builder
WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci
COPY frontend/. .
RUN npm run build

FROM nginx:1.27-alpine AS frontend
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend_builder /frontend/dist /usr/share/nginx/html
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
