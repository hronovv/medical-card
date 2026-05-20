package auth

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"medical-card/internal/models"
	"medical-card/internal/repository"
	"medical-card/internal/session"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrWeakPassword       = errors.New("password must be at least 8 characters")
	ErrInvalidBirthDate   = errors.New("invalid birth date")
)

type Service struct {
	users    *repository.UserRepository
	sessions session.Store
}

func NewService(users *repository.UserRepository, sessions session.Store) *Service {
	return &Service{users: users, sessions: sessions}
}

type RegisterInput struct {
	FullName  string
	Email     string
	Password  string
	BirthDate string
	Phone     string
}

type AuthResult struct {
	Token string
	User  *models.User
}

func (s *Service) Register(ctx context.Context, input RegisterInput) (*AuthResult, error) {
	if utf8.RuneCountInString(strings.TrimSpace(input.FullName)) == 0 {
		return nil, errors.New("full name is required")
	}
	if len(input.Password) < 8 {
		return nil, ErrWeakPassword
	}

	birthDate, err := time.Parse("2006-01-02", input.BirthDate)
	if err != nil {
		return nil, ErrInvalidBirthDate
	}

	hash, err := HashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	user, err := s.users.Create(ctx, repository.CreateUserInput{
		Email:        input.Email,
		PasswordHash: hash,
		FullName:     input.FullName,
		BirthDate:    birthDate,
		Phone:        input.Phone,
		Role:         models.RolePatient,
	})
	if err != nil {
		return nil, err
	}

	return s.issueSession(ctx, user)
}

func (s *Service) Login(ctx context.Context, email, password string) (*AuthResult, error) {
	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if !CheckPassword(user.PasswordHash, password) {
		return nil, ErrInvalidCredentials
	}

	return s.issueSession(ctx, user)
}

func (s *Service) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return s.sessions.Delete(ctx, token)
}

func (s *Service) GetSession(ctx context.Context, token string) (*session.Data, error) {
	data, err := s.sessions.Get(ctx, token)
	if err != nil {
		return nil, err
	}
	return data, nil
}

func (s *Service) GetUserBySession(ctx context.Context, token string) (*models.User, error) {
	data, err := s.sessions.Get(ctx, token)
	if err != nil {
		return nil, err
	}
	return s.users.GetByID(ctx, data.UserID)
}

func (s *Service) issueSession(ctx context.Context, user *models.User) (*AuthResult, error) {
	token, err := s.sessions.Create(ctx, session.DataFromUser(user))
	if err != nil {
		return nil, err
	}
	return &AuthResult{Token: token, User: user}, nil
}
