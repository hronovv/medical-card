package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var (
	ErrAppointmentNotFound      = errors.New("appointment not found")
	ErrAppointmentNotPending    = errors.New("appointment is not pending")
	ErrDuplicatePendingRequest  = errors.New("pending appointment already exists")
	ErrCannotBookTherapist      = errors.New("cannot book therapist except assigned")
	ErrDoctorNotBookable        = errors.New("doctor not available for booking")
)

type AppointmentStatus string

const (
	AppointmentPending  AppointmentStatus = "pending"
	AppointmentApproved AppointmentStatus = "approved"
	AppointmentRejected AppointmentStatus = "rejected"
)

type AppointmentRecord struct {
	ID              string            `json:"id"`
	PatientID       string            `json:"patientId"`
	PatientName     string            `json:"patientName"`
	DoctorID        string            `json:"doctorId"`
	DoctorName      string            `json:"doctorName"`
	DoctorSpecialty string            `json:"doctorSpecialty,omitempty"`
	RequestedAt     string            `json:"requestedAt"`
	PreferredDate   string            `json:"preferredDate"`
	Status          AppointmentStatus `json:"status"`
	Notes           string            `json:"notes,omitempty"`
	VisitID         string            `json:"visitId,omitempty"`
}

type AppointmentRepository struct {
	db *sql.DB
}

func NewAppointmentRepository(db *sql.DB) *AppointmentRepository {
	return &AppointmentRepository{db: db}
}

func (r *AppointmentRepository) Create(
	ctx context.Context,
	patientID, doctorID string,
	preferredDate time.Time,
	notes string,
) (*AppointmentRecord, error) {
	const q = `
		INSERT INTO appointment_requests (patient_id, doctor_id, preferred_date, notes)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	var id string
	err := r.db.QueryRowContext(ctx, q, patientID, doctorID, preferredDate, sqlNullString(notes)).Scan(&id)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrDuplicatePendingRequest
		}
		return nil, err
	}
	return r.GetByID(ctx, id)
}

func (r *AppointmentRepository) GetByID(ctx context.Context, id string) (*AppointmentRecord, error) {
	return r.scanOne(ctx, `
		SELECT ar.id::text, ar.patient_id::text, p.full_name,
		       ar.doctor_id::text, d.full_name, COALESCE(d.specialty, ''),
		       ar.requested_at, ar.preferred_date, ar.status::text,
		       COALESCE(ar.notes, ''), COALESCE(ar.visit_id::text, '')
		FROM appointment_requests ar
		INNER JOIN users p ON p.id = ar.patient_id
		INNER JOIN users d ON d.id = ar.doctor_id
		WHERE ar.id = $1
	`, id)
}

func (r *AppointmentRepository) ListForPatient(ctx context.Context, patientID string, status *AppointmentStatus) ([]AppointmentRecord, error) {
	q := `
		SELECT ar.id::text, ar.patient_id::text, p.full_name,
		       ar.doctor_id::text, d.full_name, COALESCE(d.specialty, ''),
		       ar.requested_at, ar.preferred_date, ar.status::text,
		       COALESCE(ar.notes, ''), COALESCE(ar.visit_id::text, '')
		FROM appointment_requests ar
		INNER JOIN users p ON p.id = ar.patient_id
		INNER JOIN users d ON d.id = ar.doctor_id
		WHERE ar.patient_id = $1
	`
	args := []any{patientID}
	if status != nil {
		q += ` AND ar.status = $2`
		args = append(args, string(*status))
	}
	q += ` ORDER BY ar.requested_at DESC`
	return r.scanMany(ctx, q, args...)
}

func (r *AppointmentRepository) ListForDoctor(ctx context.Context, doctorID string, status *AppointmentStatus) ([]AppointmentRecord, error) {
	q := `
		SELECT ar.id::text, ar.patient_id::text, p.full_name,
		       ar.doctor_id::text, d.full_name, COALESCE(d.specialty, ''),
		       ar.requested_at, ar.preferred_date, ar.status::text,
		       COALESCE(ar.notes, ''), COALESCE(ar.visit_id::text, '')
		FROM appointment_requests ar
		INNER JOIN users p ON p.id = ar.patient_id
		INNER JOIN users d ON d.id = ar.doctor_id
		WHERE ar.doctor_id = $1
	`
	args := []any{doctorID}
	if status != nil {
		q += ` AND ar.status = $2`
		args = append(args, string(*status))
	}
	q += ` ORDER BY ar.requested_at DESC`
	return r.scanMany(ctx, q, args...)
}

func (r *AppointmentRepository) Reject(ctx context.Context, id, doctorID string) (*AppointmentRecord, error) {
	const q = `
		UPDATE appointment_requests
		SET status = 'rejected', updated_at = NOW()
		WHERE id = $1 AND doctor_id = $2 AND status = 'pending'
		RETURNING id
	`
	var updatedID string
	err := r.db.QueryRowContext(ctx, q, id, doctorID).Scan(&updatedID)
	if errors.Is(err, sql.ErrNoRows) {
		rec, getErr := r.GetByID(ctx, id)
		if getErr != nil {
			return nil, ErrAppointmentNotFound
		}
		if rec.DoctorID != doctorID {
			return nil, ErrAppointmentNotFound
		}
		return nil, ErrAppointmentNotPending
	}
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, updatedID)
}

func (r *AppointmentRepository) CancelByPatient(ctx context.Context, id, patientID string) error {
	res, err := r.db.ExecContext(ctx, `
		DELETE FROM appointment_requests
		WHERE id = $1 AND patient_id = $2 AND status = 'pending'
	`, id, patientID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		rec, getErr := r.GetByID(ctx, id)
		if getErr != nil {
			return ErrAppointmentNotFound
		}
		if rec.PatientID != patientID {
			return ErrAppointmentNotFound
		}
		return ErrAppointmentNotPending
	}
	return nil
}

func (r *AppointmentRepository) Approve(
	ctx context.Context,
	id, doctorID, doctorDisplayName string,
	visitDate time.Time,
	visitNotes string,
) (*AppointmentRecord, *VisitRecord, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()

	var patientID string
	var preferredDate time.Time
	err = tx.QueryRowContext(ctx, `
		SELECT patient_id::text, preferred_date
		FROM appointment_requests
		WHERE id = $1 AND doctor_id = $2 AND status = 'pending'
		FOR UPDATE
	`, id, doctorID).Scan(&patientID, &preferredDate)
	if errors.Is(err, sql.ErrNoRows) {
		rec, getErr := r.GetByID(ctx, id)
		if getErr != nil {
			return nil, nil, ErrAppointmentNotFound
		}
		if rec.DoctorID != doctorID {
			return nil, nil, ErrAppointmentNotFound
		}
		return nil, nil, ErrAppointmentNotPending
	}
	if err != nil {
		return nil, nil, err
	}

	if visitDate.IsZero() {
		visitDate = preferredDate
	}

	var visitID string
	var visitDateOut time.Time
	var doctorNameOut, notesOut string
	var conductingID sql.NullString
	err = tx.QueryRowContext(ctx, `
		INSERT INTO patient_visits (patient_id, visit_date, doctor_name, notes, conducting_doctor_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id::text, visit_date, doctor_name, COALESCE(notes, ''), conducting_doctor_id
	`, patientID, visitDate, doctorDisplayName, sqlNullString(visitNotes), doctorID).Scan(
		&visitID, &visitDateOut, &doctorNameOut, &notesOut, &conductingID,
	)
	if err != nil {
		return nil, nil, err
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE appointment_requests
		SET status = 'approved', visit_id = $2, updated_at = NOW()
		WHERE id = $1
	`, id, visitID)
	if err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}

	appt, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}

	visit := &VisitRecord{
		ID:     visitID,
		Date:   formatDate(visitDateOut),
		Doctor: doctorNameOut,
		Notes:  notesOut,
	}
	if conductingID.Valid {
		visit.ConductingDoctorID = conductingID.String
	}
	return appt, visit, nil
}

func (r *AppointmentRepository) scanOne(ctx context.Context, query, id string) (*AppointmentRecord, error) {
	items, err := r.scanMany(ctx, query, id)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, ErrAppointmentNotFound
	}
	return &items[0], nil
}

func (r *AppointmentRepository) scanMany(ctx context.Context, query string, args ...any) ([]AppointmentRecord, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []AppointmentRecord
	for rows.Next() {
		var rec AppointmentRecord
		var requestedAt time.Time
		var preferredDate time.Time
		var status string
		if err := rows.Scan(
			&rec.ID, &rec.PatientID, &rec.PatientName,
			&rec.DoctorID, &rec.DoctorName, &rec.DoctorSpecialty,
			&requestedAt, &preferredDate, &status,
			&rec.Notes, &rec.VisitID,
		); err != nil {
			return nil, err
		}
		rec.RequestedAt = requestedAt.Format("02.01.2006 15:04")
		rec.PreferredDate = formatDate(preferredDate)
		rec.Status = AppointmentStatus(status)
		items = append(items, rec)
	}
	return items, rows.Err()
}
