package models

import (
	"time"
)

type Role string

const (
	RolePatient Role = "patient"
	RoleDoctor  Role = "doctor"
	RoleAdmin   Role = "admin"
)

type User struct {
	ID               string
	Email            string
	PasswordHash     string
	FullName         string
	BirthDate        time.Time
	Phone            string
	Role             Role
	Specialty        string
	AssignedDoctorID *string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type UserListItem struct {
	ID                 string  `json:"id"`
	FullName           string  `json:"fullName"`
	BirthDate          string  `json:"birthDate,omitempty"`
	Phone              string  `json:"phone,omitempty"`
	Email              string  `json:"email,omitempty"`
	Specialty          string  `json:"specialty,omitempty"`
	AssignedDoctorID   *string `json:"assignedDoctorId,omitempty"`
	AssignedDoctorName string  `json:"assignedDoctorName,omitempty"`
}

type DoctorSummary struct {
	ID        string `json:"id"`
	FullName  string `json:"fullName"`
	Specialty string `json:"specialty"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
}
