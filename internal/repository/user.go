package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"medical-card/internal/models"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrEmailTaken        = errors.New("email already registered")
	ErrInvalidDoctor     = errors.New("invalid doctor")
	ErrNotTherapist      = errors.New("assigned doctor must be a therapist")
	ErrNotAssignedDoctor = errors.New("patient not assigned to this doctor")
)

const TherapistSpecialty = "Терапевт"

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

type CreateUserInput struct {
	Email            string
	PasswordHash     string
	FullName         string
	BirthDate        time.Time
	Phone            string
	Role             models.Role
	Specialty        string
	AssignedDoctorID *string
}

func (r *UserRepository) Create(ctx context.Context, input CreateUserInput) (*models.User, error) {
	const query = `
		INSERT INTO users (email, password_hash, full_name, birth_date, phone, role, assigned_doctor_id, specialty)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, email, password_hash, full_name, birth_date, phone, role,
		          COALESCE(specialty, ''), assigned_doctor_id, created_at, updated_at
	`

	row := r.db.QueryRowContext(
		ctx,
		query,
		strings.ToLower(strings.TrimSpace(input.Email)),
		input.PasswordHash,
		strings.TrimSpace(input.FullName),
		input.BirthDate,
		strings.TrimSpace(input.Phone),
		input.Role,
		nullUUID(input.AssignedDoctorID),
		nullStringVal(input.Specialty),
	)

	user, err := scanUser(row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrEmailTaken
		}
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	const query = `
		SELECT id, email, password_hash, full_name, birth_date, phone, role,
		       COALESCE(specialty, ''), assigned_doctor_id, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	row := r.db.QueryRowContext(ctx, query, strings.ToLower(strings.TrimSpace(email)))
	user, err := scanUser(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	return user, err
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	const query = `
		SELECT id, email, password_hash, full_name, birth_date, phone, role,
		       COALESCE(specialty, ''), assigned_doctor_id, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	row := r.db.QueryRowContext(ctx, query, id)
	user, err := scanUser(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	return user, err
}

func (r *UserRepository) ListByRole(ctx context.Context, role models.Role) ([]models.UserListItem, error) {
	if role == models.RolePatient {
		return r.listPatients(ctx, "")
	}

	const query = `
		SELECT id, full_name, birth_date, phone, email, COALESCE(specialty, '')
		FROM users
		WHERE role = $1
		ORDER BY full_name
	`

	rows, err := r.db.QueryContext(ctx, query, role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.UserListItem
	for rows.Next() {
		var item models.UserListItem
		var birthDate time.Time
		if err := rows.Scan(&item.ID, &item.FullName, &birthDate, &item.Phone, &item.Email, &item.Specialty); err != nil {
			return nil, err
		}
		item.BirthDate = birthDate.Format("02.01.2006")
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *UserRepository) ListPatientsForDoctor(ctx context.Context, doctorID string) ([]models.UserListItem, error) {
	doc, err := r.GetByID(ctx, doctorID)
	if err != nil {
		return nil, err
	}
	if doc.Role != models.RoleDoctor {
		return []models.UserListItem{}, nil
	}
	if isTherapist(doc.Specialty) {
		return r.listPatientsAssignedTo(ctx, doctorID)
	}
	return r.listPatientsWithVisitBy(ctx, doctorID)
}

func (r *UserRepository) listPatientsAssignedTo(ctx context.Context, doctorID string) ([]models.UserListItem, error) {
	return r.scanPatientList(ctx, `
		SELECT p.id, p.full_name, p.birth_date, p.phone, p.email,
		       d.id, COALESCE(d.full_name, '')
		FROM users p
		LEFT JOIN users d ON d.id = p.assigned_doctor_id AND d.role = 'doctor'
		WHERE p.role = 'patient' AND p.assigned_doctor_id = $1
		ORDER BY p.full_name
	`, doctorID)
}

func (r *UserRepository) listPatientsWithVisitBy(ctx context.Context, conductingDoctorID string) ([]models.UserListItem, error) {
	return r.scanPatientList(ctx, `
		SELECT DISTINCT p.id, p.full_name, p.birth_date, p.phone, p.email,
		       d.id, COALESCE(d.full_name, '')
		FROM users p
		INNER JOIN patient_visits v ON v.patient_id = p.id AND v.conducting_doctor_id = $1
		LEFT JOIN users d ON d.id = p.assigned_doctor_id AND d.role = 'doctor'
		WHERE p.role = 'patient'
		ORDER BY p.full_name
	`, conductingDoctorID)
}

func (r *UserRepository) scanPatientList(ctx context.Context, query string, arg string) ([]models.UserListItem, error) {
	rows, err := r.db.QueryContext(ctx, query, arg)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.UserListItem
	for rows.Next() {
		var item models.UserListItem
		var birthDate time.Time
		var assignedID sql.NullString
		var assignedName string
		if err := rows.Scan(
			&item.ID, &item.FullName, &birthDate, &item.Phone, &item.Email,
			&assignedID, &assignedName,
		); err != nil {
			return nil, err
		}
		item.BirthDate = birthDate.Format("02.01.2006")
		if assignedID.Valid {
			id := assignedID.String
			item.AssignedDoctorID = &id
			item.AssignedDoctorName = assignedName
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *UserRepository) listPatients(ctx context.Context, doctorID string) ([]models.UserListItem, error) {
	query := `
		SELECT p.id, p.full_name, p.birth_date, p.phone, p.email,
		       d.id, COALESCE(d.full_name, '')
		FROM users p
		LEFT JOIN users d ON d.id = p.assigned_doctor_id AND d.role = 'doctor'
		WHERE p.role = 'patient'
	`
	args := []any{}
	if doctorID != "" {
		query += ` AND p.assigned_doctor_id = $1`
		args = append(args, doctorID)
	}
	query += ` ORDER BY p.full_name`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.UserListItem
	for rows.Next() {
		var item models.UserListItem
		var birthDate time.Time
		var assignedID sql.NullString
		var assignedName string
		if err := rows.Scan(
			&item.ID, &item.FullName, &birthDate, &item.Phone, &item.Email,
			&assignedID, &assignedName,
		); err != nil {
			return nil, err
		}
		item.BirthDate = birthDate.Format("02.01.2006")
		if assignedID.Valid {
			id := assignedID.String
			item.AssignedDoctorID = &id
			item.AssignedDoctorName = assignedName
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *UserRepository) GetAssignedDoctor(ctx context.Context, patientID string) (*models.DoctorSummary, error) {
	const query = `
		SELECT d.id, d.full_name, COALESCE(d.specialty, ''), d.phone, d.email
		FROM users p
		INNER JOIN users d ON d.id = p.assigned_doctor_id AND d.role = 'doctor'
		WHERE p.id = $1 AND p.role = 'patient'
	`

	var doc models.DoctorSummary
	err := r.db.QueryRowContext(ctx, query, patientID).Scan(
		&doc.ID, &doc.FullName, &doc.Specialty, &doc.Phone, &doc.Email,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

func (r *UserRepository) SetAssignedDoctor(ctx context.Context, patientID string, doctorID *string) error {
	if doctorID != nil && *doctorID != "" {
		doc, err := r.GetByID(ctx, *doctorID)
		if err != nil {
			if errors.Is(err, ErrUserNotFound) {
				return ErrInvalidDoctor
			}
			return err
		}
		if doc.Role != models.RoleDoctor {
			return ErrInvalidDoctor
		}
		if !isTherapist(doc.Specialty) {
			return ErrNotTherapist
		}
	}

	const query = `
		UPDATE users
		SET assigned_doctor_id = $2, updated_at = NOW()
		WHERE id = $1 AND role = 'patient'
	`

	res, err := r.db.ExecContext(ctx, query, patientID, nullUUID(doctorID))
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (r *UserRepository) DoctorCanAccessPatient(ctx context.Context, doctorID, patientID string) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM users p
			WHERE p.id = $1 AND p.role = 'patient'
			AND (
				p.assigned_doctor_id = $2
				OR EXISTS (
					SELECT 1 FROM patient_visits v
					WHERE v.patient_id = p.id AND v.conducting_doctor_id = $2
				)
			)
		)
	`, patientID, doctorID).Scan(&ok)
	return ok, err
}

// IsPatientAssignedTo returns true if the patient has assigned_doctor_id = doctorID.
func (r *UserRepository) IsPatientAssignedTo(ctx context.Context, patientID, doctorID string) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM users
			WHERE id = $1 AND role = 'patient' AND assigned_doctor_id = $2
		)
	`, patientID, doctorID).Scan(&ok)
	return ok, err
}

func (r *UserRepository) CountByRole(ctx context.Context, role models.Role) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users WHERE role = $1`, role).Scan(&count)
	return count, err
}

func (r *UserRepository) CountDiseaseCatalog(ctx context.Context) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM disease_catalog`).Scan(&count)
	return count, err
}

type UpdateUserInput struct {
	FullName  string
	Email     string
	BirthDate time.Time
	Phone     string
	Specialty string
}

func (r *UserRepository) Update(ctx context.Context, id string, role models.Role, input UpdateUserInput) (*models.User, error) {
	const query = `
		UPDATE users
		SET full_name = $1,
		    email = $2,
		    birth_date = $3,
		    phone = $4,
		    specialty = $5,
		    updated_at = NOW()
		WHERE id = $6 AND role = $7
		RETURNING id, email, password_hash, full_name, birth_date, phone, role,
		          COALESCE(specialty, ''), assigned_doctor_id, created_at, updated_at
	`
	row := r.db.QueryRowContext(ctx, query,
		strings.TrimSpace(input.FullName),
		strings.ToLower(strings.TrimSpace(input.Email)),
		input.BirthDate,
		strings.TrimSpace(input.Phone),
		nullStringVal(input.Specialty),
		id,
		role,
	)
	user, err := scanUser(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrEmailTaken
		}
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) Delete(ctx context.Context, id string, role models.Role) error {
	res, err := r.db.ExecContext(ctx, `
		DELETE FROM users WHERE id = $1 AND role = $2
	`, id, role)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (r *UserRepository) UserToListItem(ctx context.Context, user *models.User) (models.UserListItem, error) {
	item := models.UserListItem{
		ID:        user.ID,
		FullName:  user.FullName,
		BirthDate: user.BirthDate.Format("02.01.2006"),
		Phone:     user.Phone,
		Email:     user.Email,
		Specialty: user.Specialty,
	}
	if user.Role == models.RolePatient && user.AssignedDoctorID != nil {
		id := *user.AssignedDoctorID
		item.AssignedDoctorID = &id
		doc, err := r.GetByID(ctx, id)
		if err == nil {
			item.AssignedDoctorName = doc.FullName
		}
	}
	return item, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanUser(row rowScanner) (*models.User, error) {
	var user models.User
	var role string
	var assigned sql.NullString
	err := row.Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.BirthDate,
		&user.Phone,
		&role,
		&user.Specialty,
		&assigned,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	user.Role = models.Role(role)
	if assigned.Valid {
		id := assigned.String
		user.AssignedDoctorID = &id
	}
	return &user, nil
}

func nullUUID(id *string) any {
	if id == nil || *id == "" {
		return nil
	}
	return *id
}

func nullStringVal(s string) any {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return s
}

func isUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "unique")
}

func isTherapist(specialty string) bool {
	return strings.EqualFold(strings.TrimSpace(specialty), TherapistSpecialty)
}

// IsTherapistSpecialty reports whether the specialty is a general therapist.
func IsTherapistSpecialty(specialty string) bool {
	return isTherapist(specialty)
}
