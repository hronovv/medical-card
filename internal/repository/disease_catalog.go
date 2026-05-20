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
