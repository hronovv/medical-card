package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

var (
	ErrPatientDiseaseNotFound      = errors.New("patient disease not found")
	ErrPatientDiseaseDuplicate     = errors.New("patient disease duplicate")
	ErrPatientAnalysisNotFound     = errors.New("patient analysis not found")
	ErrPatientVisitNotFound        = errors.New("patient visit not found")
	ErrPatientPrescriptionNotFound = errors.New("patient prescription not found")
)

type PatientCardRepository struct {
	db *sql.DB
}

func NewPatientCardRepository(db *sql.DB) *PatientCardRepository {
	return &PatientCardRepository{db: db}
}

type DiseaseRecord struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Code        string `json:"code,omitempty"`
	DiagnosedAt string `json:"diagnosedAt,omitempty"`
	CatalogID   string `json:"catalogId,omitempty"`
}

type AnalysisRecord struct {
	ID     string `json:"id"`
	Type   string `json:"type"`
	Result string `json:"result"`
	Date   string `json:"date"`
}

type VisitRecord struct {
	ID                 string `json:"id"`
	Date               string `json:"date"`
	Doctor             string `json:"doctor"`
	Notes              string `json:"notes,omitempty"`
	ConductingDoctorID string `json:"conductingDoctorId,omitempty"`
}

type PrescriptionRecord struct {
	ID        string `json:"id"`
	Drug      string `json:"drug"`
	Dosage    string `json:"dosage"`
	Duration  string `json:"duration,omitempty"`
	VisitDate string `json:"visitDate,omitempty"`
}

func (r *PatientCardRepository) ListDiseases(ctx context.Context, patientID string) ([]DiseaseRecord, error) {
	const query = `
		SELECT id::text, name, COALESCE(code, ''), diagnosed_at, catalog_id
		FROM patient_diseases
		WHERE patient_id = $1
		ORDER BY diagnosed_at DESC NULLS LAST, created_at DESC
	`
	return r.queryDiseases(ctx, query, patientID)
}

func (r *PatientCardRepository) HasDiseaseCatalog(
	ctx context.Context,
	patientID, catalogID, excludeDiseaseID string,
) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM patient_diseases
			WHERE patient_id = $1 AND catalog_id = $2
			  AND ($3 = '' OR id::text != $3)
		)
	`, patientID, catalogID, excludeDiseaseID).Scan(&exists)
	return exists, err
}

func (r *PatientCardRepository) CreateDisease(
	ctx context.Context,
	patientID, catalogID string,
	diagnosedAt *time.Time,
	name, code string,
) (*DiseaseRecord, error) {
	exists, err := r.HasDiseaseCatalog(ctx, patientID, catalogID, "")
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrPatientDiseaseDuplicate
	}

	const q = `
		INSERT INTO patient_diseases (patient_id, name, code, diagnosed_at, catalog_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id::text, name, COALESCE(code, ''), diagnosed_at, catalog_id
	`
	row := r.db.QueryRowContext(ctx, q, patientID, name, nullString(code), nullTime(diagnosedAt), catalogID)
	return scanDiseaseRow(row)
}

func (r *PatientCardRepository) UpdateDisease(
	ctx context.Context,
	patientID, diseaseID string,
	catalogID *string,
	name, code string,
	diagnosedAt *time.Time,
) (*DiseaseRecord, error) {
	if catalogID != nil && strings.TrimSpace(*catalogID) != "" {
		exists, err := r.HasDiseaseCatalog(ctx, patientID, *catalogID, diseaseID)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, ErrPatientDiseaseDuplicate
		}
	}

	const q = `
		UPDATE patient_diseases
		SET name = $1,
		    code = $2,
		    catalog_id = $3,
		    diagnosed_at = $4
		WHERE id = $5 AND patient_id = $6
		RETURNING id::text, name, COALESCE(code, ''), diagnosed_at, catalog_id
	`
	row := r.db.QueryRowContext(ctx, q, name, nullString(code), nullableUUIDArg(catalogID), nullTime(diagnosedAt), diseaseID, patientID)
	rec, err := scanDiseaseRow(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrPatientDiseaseNotFound
		}
		return nil, err
	}
	return rec, nil
}

func (r *PatientCardRepository) DeleteDisease(ctx context.Context, patientID, diseaseID string) error {
	res, err := r.db.ExecContext(ctx, `
		DELETE FROM patient_diseases
		WHERE id = $1 AND patient_id = $2
	`, diseaseID, patientID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrPatientDiseaseNotFound
	}
	return nil
}

func (r *PatientCardRepository) GetDisease(ctx context.Context, patientID, diseaseID string) (*DiseaseRecord, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id::text, name, COALESCE(code, ''), diagnosed_at, catalog_id
		FROM patient_diseases
		WHERE id = $1 AND patient_id = $2
	`, diseaseID, patientID)
	rec, err := scanDiseaseRow(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrPatientDiseaseNotFound
		}
		return nil, err
	}
	return rec, nil
}

func (r *PatientCardRepository) ListAnalyses(ctx context.Context, patientID string) ([]AnalysisRecord, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id::text, type, result, analysis_date
		FROM patient_analyses
		WHERE patient_id = $1
		ORDER BY analysis_date DESC, created_at DESC
	`, patientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []AnalysisRecord
	for rows.Next() {
		var item AnalysisRecord
		var date sql.NullTime
		if err := rows.Scan(&item.ID, &item.Type, &item.Result, &date); err != nil {
			return nil, err
		}
		if date.Valid {
			item.Date = formatDate(date.Time)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PatientCardRepository) GetAnalysis(ctx context.Context, patientID, analysisID string) (*AnalysisRecord, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id::text, type, result, analysis_date
		FROM patient_analyses
		WHERE id = $1 AND patient_id = $2
	`, analysisID, patientID)
	var item AnalysisRecord
	var date time.Time
	if err := row.Scan(&item.ID, &item.Type, &item.Result, &date); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrPatientAnalysisNotFound
		}
		return nil, err
	}
	item.Date = formatDate(date)
	return &item, nil
}

func (r *PatientCardRepository) CreateAnalysis(ctx context.Context, patientID, typ, result string, analysisDate time.Time) (*AnalysisRecord, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO patient_analyses (patient_id, type, result, analysis_date)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text, type, result, analysis_date
	`, patientID, typ, result, analysisDate)
	var item AnalysisRecord
	var date time.Time
	if err := row.Scan(&item.ID, &item.Type, &item.Result, &date); err != nil {
		return nil, err
	}
	item.Date = formatDate(date)
	return &item, nil
}

func (r *PatientCardRepository) UpdateAnalysis(ctx context.Context, patientID, analysisID string, typ, result *string, analysisDate *time.Time) (*AnalysisRecord, error) {
	cur, err := r.GetAnalysis(ctx, patientID, analysisID)
	if err != nil {
		return nil, err
	}
	tStr := cur.Type
	if typ != nil {
		tStr = strings.TrimSpace(*typ)
	}
	rStr := cur.Result
	if result != nil {
		rStr = strings.TrimSpace(*result)
	}
	dt, err := time.Parse("02.01.2006", cur.Date)
	if err != nil {
		return nil, err
	}
	if analysisDate != nil {
		dt = *analysisDate
	}
	row := r.db.QueryRowContext(ctx, `
		UPDATE patient_analyses SET type = $1, result = $2, analysis_date = $3
		WHERE id = $4 AND patient_id = $5
		RETURNING id::text, type, result, analysis_date
	`, tStr, rStr, dt, analysisID, patientID)
	var item AnalysisRecord
	var date time.Time
	if err := row.Scan(&item.ID, &item.Type, &item.Result, &date); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrPatientAnalysisNotFound
		}
		return nil, err
	}
	item.Date = formatDate(date)
	return &item, nil
}

func (r *PatientCardRepository) DeleteAnalysis(ctx context.Context, patientID, analysisID string) error {
	res, err := r.db.ExecContext(ctx, `
		DELETE FROM patient_analyses WHERE id = $1 AND patient_id = $2
	`, analysisID, patientID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrPatientAnalysisNotFound
	}
	return nil
}

func (r *PatientCardRepository) ListVisits(ctx context.Context, patientID string) ([]VisitRecord, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id::text, visit_date, doctor_name, COALESCE(notes, ''),
		       COALESCE(conducting_doctor_id::text, '')
		FROM patient_visits
		WHERE patient_id = $1
		ORDER BY visit_date DESC, created_at DESC
	`, patientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []VisitRecord
	for rows.Next() {
		var item VisitRecord
		var date time.Time
		var cid string
		if err := rows.Scan(&item.ID, &date, &item.Doctor, &item.Notes, &cid); err != nil {
			return nil, err
		}
		item.Date = formatDate(date)
		if cid != "" {
			item.ConductingDoctorID = cid
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PatientCardRepository) GetVisit(ctx context.Context, patientID, visitID string) (*VisitRecord, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id::text, visit_date, doctor_name, COALESCE(notes, ''),
		       COALESCE(conducting_doctor_id::text, '')
		FROM patient_visits
		WHERE id = $1 AND patient_id = $2
	`, visitID, patientID)
	var item VisitRecord
	var date time.Time
	var cid string
	if err := row.Scan(&item.ID, &date, &item.Doctor, &item.Notes, &cid); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrPatientVisitNotFound
		}
		return nil, err
	}
	item.Date = formatDate(date)
	if cid != "" {
		item.ConductingDoctorID = cid
	}
	return &item, nil
}

func (r *PatientCardRepository) CreateVisit(ctx context.Context, patientID string, visitDate time.Time, doctorName, notes string, conductingDoctorID string) (*VisitRecord, error) {
	const q = `
		INSERT INTO patient_visits (patient_id, visit_date, doctor_name, notes, conducting_doctor_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id::text, visit_date, doctor_name, COALESCE(notes, ''),
		          COALESCE(conducting_doctor_id::text, '')
	`
	row := r.db.QueryRowContext(ctx, q, patientID, visitDate, doctorName,
		sqlNullString(notes), conductingUUIDArg(conductingDoctorID))
	return scanVisitRow(row)
}

func (r *PatientCardRepository) UpdateVisit(ctx context.Context, patientID, visitID string, visitDate *time.Time, notes *string) (*VisitRecord, error) {
	cur, err := r.GetVisit(ctx, patientID, visitID)
	if err != nil {
		return nil, err
	}
	d, err := time.Parse("02.01.2006", cur.Date)
	if err != nil {
		return nil, err
	}
	if visitDate != nil {
		d = *visitDate
	}
	n := cur.Notes
	if notes != nil {
		n = *notes
	}
	const q = `
		UPDATE patient_visits
		SET visit_date = $1, notes = $2
		WHERE id = $3 AND patient_id = $4
		RETURNING id::text, visit_date, doctor_name, COALESCE(notes, ''),
		          COALESCE(conducting_doctor_id::text, '')
	`
	row := r.db.QueryRowContext(ctx, q, d, n, visitID, patientID)
	return scanVisitRow(row)
}

func (r *PatientCardRepository) DeleteVisit(ctx context.Context, patientID, visitID string) error {
	res, err := r.db.ExecContext(ctx, `
		DELETE FROM patient_visits WHERE id = $1 AND patient_id = $2
	`, visitID, patientID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrPatientVisitNotFound
	}
	return nil
}

func scanVisitRow(row *sql.Row) (*VisitRecord, error) {
	var item VisitRecord
	var date time.Time
	var cid string
	if err := row.Scan(&item.ID, &date, &item.Doctor, &item.Notes, &cid); err != nil {
		return nil, err
	}
	item.Date = formatDate(date)
	if cid != "" {
		item.ConductingDoctorID = cid
	}
	return &item, nil
}

func (r *PatientCardRepository) ListPrescriptions(ctx context.Context, patientID string) ([]PrescriptionRecord, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id::text, drug, dosage, COALESCE(duration, ''), visit_date
		FROM patient_prescriptions
		WHERE patient_id = $1
		ORDER BY visit_date DESC NULLS LAST, created_at DESC
	`, patientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []PrescriptionRecord
	for rows.Next() {
		var item PrescriptionRecord
		var visitDate sql.NullTime
		if err := rows.Scan(&item.ID, &item.Drug, &item.Dosage, &item.Duration, &visitDate); err != nil {
			return nil, err
		}
		if visitDate.Valid {
			item.VisitDate = formatDate(visitDate.Time)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PatientCardRepository) GetPrescription(ctx context.Context, patientID, rxID string) (*PrescriptionRecord, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id::text, drug, dosage, COALESCE(duration, ''), visit_date
		FROM patient_prescriptions
		WHERE id = $1 AND patient_id = $2
	`, rxID, patientID)
	return scanPrescriptionRow(row)
}

func (r *PatientCardRepository) CreatePrescription(ctx context.Context, patientID, drug, dosage, duration string, visitDate *time.Time) (*PrescriptionRecord, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO patient_prescriptions (patient_id, drug, dosage, duration, visit_date)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id::text, drug, dosage, COALESCE(duration, ''), visit_date
	`, patientID, drug, dosage, sqlNullString(duration), nullTime(visitDate))
	return scanPrescriptionRow(row)
}

func (r *PatientCardRepository) UpdatePrescription(
	ctx context.Context,
	patientID, rxID string,
	drug, dosage, duration *string,
	visitDate *time.Time,
) (*PrescriptionRecord, error) {
	cur, err := r.GetPrescription(ctx, patientID, rxID)
	if err != nil {
		return nil, err
	}
	d := cur.Drug
	if drug != nil {
		d = strings.TrimSpace(*drug)
	}
	dos := cur.Dosage
	if dosage != nil {
		dos = strings.TrimSpace(*dosage)
	}
	dur := cur.Duration
	if duration != nil {
		dur = strings.TrimSpace(*duration)
	}
	var vd *time.Time
	if cur.VisitDate != "" {
		t, err := time.Parse("02.01.2006", cur.VisitDate)
		if err != nil {
			return nil, err
		}
		vd = &t
	}
	if visitDate != nil {
		vd = visitDate
	}
	row := r.db.QueryRowContext(ctx, `
		UPDATE patient_prescriptions
		SET drug = $1, dosage = $2, duration = $3, visit_date = $4
		WHERE id = $5 AND patient_id = $6
		RETURNING id::text, drug, dosage, COALESCE(duration, ''), visit_date
	`, d, dos, sqlNullString(dur), nullTime(vd), rxID, patientID)
	return scanPrescriptionRow(row)
}

func (r *PatientCardRepository) DeletePrescription(ctx context.Context, patientID, rxID string) error {
	res, err := r.db.ExecContext(ctx, `
		DELETE FROM patient_prescriptions WHERE id = $1 AND patient_id = $2
	`, rxID, patientID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrPatientPrescriptionNotFound
	}
	return nil
}

func scanPrescriptionRow(row *sql.Row) (*PrescriptionRecord, error) {
	var item PrescriptionRecord
	var visitDate sql.NullTime
	err := row.Scan(&item.ID, &item.Drug, &item.Dosage, &item.Duration, &visitDate)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrPatientPrescriptionNotFound
		}
		return nil, err
	}
	if visitDate.Valid {
		item.VisitDate = formatDate(visitDate.Time)
	}
	return &item, nil
}

func (r *PatientCardRepository) queryDiseases(ctx context.Context, query, patientID string) ([]DiseaseRecord, error) {
	rows, err := r.db.QueryContext(ctx, query, patientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []DiseaseRecord
	for rows.Next() {
		var item DiseaseRecord
		var diagnosed sql.NullTime
		var catalog sql.NullString
		if err := rows.Scan(&item.ID, &item.Name, &item.Code, &diagnosed, &catalog); err != nil {
			return nil, err
		}
		if diagnosed.Valid {
			item.DiagnosedAt = formatDate(diagnosed.Time)
		}
		if catalog.Valid {
			item.CatalogID = catalog.String
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanDiseaseRow(row *sql.Row) (*DiseaseRecord, error) {
	var item DiseaseRecord
	var diagnosed sql.NullTime
	var catalog sql.NullString
	if err := row.Scan(&item.ID, &item.Name, &item.Code, &diagnosed, &catalog); err != nil {
		return nil, err
	}
	if diagnosed.Valid {
		item.DiagnosedAt = formatDate(diagnosed.Time)
	}
	if catalog.Valid {
		item.CatalogID = catalog.String
	}
	return &item, nil
}

func nullString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func nullTime(t *time.Time) interface{} {
	if t == nil {
		return nil
	}
	if t.IsZero() {
		return nil
	}
	return *t
}

func nullableUUIDArg(s *string) interface{} {
	if s == nil || *s == "" {
		return nil
	}
	return *s
}

func formatDate(t time.Time) string {
	return t.Format("02.01.2006")
}

func sqlNullString(s string) interface{} {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return strings.TrimSpace(s)
}

func conductingUUIDArg(id string) interface{} {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil
	}
	return id
}
