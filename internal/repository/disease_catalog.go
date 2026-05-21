package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

var ErrCatalogDiseaseNotFound = errors.New("catalog disease not found")
var ErrCatalogCodeTaken = errors.New("catalog code already exists")

type DiseaseCatalogRepository struct {
	db *sql.DB
}

func NewDiseaseCatalogRepository(db *sql.DB) *DiseaseCatalogRepository {
	return &DiseaseCatalogRepository{db: db}
}

type DiseaseCatalogItem struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Code string `json:"code"`
}

func (r *DiseaseCatalogRepository) ListAll(ctx context.Context) ([]DiseaseCatalogItem, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id::text, name, code
		FROM disease_catalog
		ORDER BY code, name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []DiseaseCatalogItem
	for rows.Next() {
		var item DiseaseCatalogItem
		if err := rows.Scan(&item.ID, &item.Name, &item.Code); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *DiseaseCatalogRepository) GetByID(ctx context.Context, id string) (*DiseaseCatalogItem, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id::text, name, code
		FROM disease_catalog
		WHERE id = $1
	`, id)
	var item DiseaseCatalogItem
	if err := row.Scan(&item.ID, &item.Name, &item.Code); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCatalogDiseaseNotFound
		}
		return nil, err
	}
	return &item, nil
}

func (r *DiseaseCatalogRepository) Create(ctx context.Context, name, code string) (*DiseaseCatalogItem, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO disease_catalog (name, code)
		VALUES ($1, $2)
		RETURNING id::text, name, code
	`, strings.TrimSpace(name), strings.TrimSpace(code))
	var item DiseaseCatalogItem
	if err := row.Scan(&item.ID, &item.Name, &item.Code); err != nil {
		if isUniqueViolation(err) {
			return nil, ErrCatalogCodeTaken
		}
		return nil, err
	}
	return &item, nil
}

func (r *DiseaseCatalogRepository) Update(ctx context.Context, id string, name, code *string) (*DiseaseCatalogItem, error) {
	existing, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	newName := existing.Name
	newCode := existing.Code
	if name != nil {
		trimmed := strings.TrimSpace(*name)
		if trimmed == "" {
			return nil, errors.New("empty catalog name")
		}
		newName = trimmed
	}
	if code != nil {
		trimmed := strings.TrimSpace(*code)
		if trimmed == "" {
			return nil, errors.New("empty catalog code")
		}
		newCode = trimmed
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var item DiseaseCatalogItem
	err = tx.QueryRowContext(ctx, `
		UPDATE disease_catalog
		SET name = $1, code = $2
		WHERE id = $3
		RETURNING id::text, name, code
	`, newName, newCode, id).Scan(&item.ID, &item.Name, &item.Code)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrCatalogCodeTaken
		}
		return nil, err
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE patient_diseases
		SET name = $1, code = $2
		WHERE catalog_id = $3
	`, newName, newCode, id)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *DiseaseCatalogRepository) Delete(ctx context.Context, id string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM disease_catalog WHERE id = $1`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrCatalogDiseaseNotFound
	}
	return nil
}
