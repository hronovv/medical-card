package session

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"medical-card/internal/models"
)

var ErrSessionNotFound = errors.New("session not found")

type Data struct {
	UserID    string      `json:"userId"`
	Role      models.Role `json:"role"`
	Email     string      `json:"email"`
	FullName  string      `json:"fullName"`
	BirthDate string      `json:"birthDate"`
	Phone     string      `json:"phone"`
}

type Store interface {
	Create(ctx context.Context, data Data) (token string, err error)
	Get(ctx context.Context, token string) (*Data, error)
	Delete(ctx context.Context, token string) error
}

type RedisStore struct {
	client *redis.Client
	ttl    time.Duration
	prefix string
}

func NewRedisStore() (*RedisStore, error) {
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}

	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", host, port),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping: %w", err)
	}

	ttl := 24 * time.Hour
	if raw := os.Getenv("SESSION_TTL"); raw != "" {
		if parsed, err := time.ParseDuration(raw); err == nil {
			ttl = parsed
		}
	}

	return &RedisStore{
		client: client,
		ttl:    ttl,
		prefix: "pulse:session:",
	}, nil
}

func (s *RedisStore) key(token string) string {
	return s.prefix + token
}

func (s *RedisStore) Create(ctx context.Context, data Data) (string, error) {
	token := uuid.NewString()
	payload, err := json.Marshal(data)
	if err != nil {
		return "", err
	}
	if err := s.client.Set(ctx, s.key(token), payload, s.ttl).Err(); err != nil {
		return "", err
	}
	return token, nil
}

func (s *RedisStore) Get(ctx context.Context, token string) (*Data, error) {
	raw, err := s.client.Get(ctx, s.key(token)).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, ErrSessionNotFound
	}
	if err != nil {
		return nil, err
	}
	var data Data
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (s *RedisStore) Delete(ctx context.Context, token string) error {
	return s.client.Del(ctx, s.key(token)).Err()
}

func DataFromUser(user *models.User) Data {
	return Data{
		UserID:    user.ID,
		Role:      user.Role,
		Email:     user.Email,
		FullName:  user.FullName,
		BirthDate: user.BirthDate.Format("02.01.2006"),
		Phone:     user.Phone,
	}
}
