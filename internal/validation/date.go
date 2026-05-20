package validation

import (
	"errors"
	"strings"
	"time"
)

var ErrInvalidDate = errors.New("invalid date format")
var ErrDateInPast = errors.New("date must not be in the past")

func ParseDDMMYYYY(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, ErrInvalidDate
	}
	t, err := time.ParseInLocation("02.01.2006", s, time.Local)
	if err != nil {
		return time.Time{}, ErrInvalidDate
	}
	return t, nil
}

func StartOfDay(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

// ValidateNotBeforeToday rejects calendar dates before today (local timezone).
func ValidateNotBeforeToday(d time.Time) error {
	if StartOfDay(d).Before(StartOfDay(time.Now())) {
		return ErrDateInPast
	}
	return nil
}

func ParseAndValidateFutureDate(s string) (time.Time, error) {
	d, err := ParseDDMMYYYY(s)
	if err != nil {
		return time.Time{}, err
	}
	if err := ValidateNotBeforeToday(d); err != nil {
		return time.Time{}, err
	}
	return d, nil
}
