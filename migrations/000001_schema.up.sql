CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
CREATE TYPE appointment_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    phone TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'patient',
    specialty TEXT,
    assigned_doctor_id UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_assigned_doctor_id ON users (assigned_doctor_id) WHERE role = 'patient';

CREATE TABLE disease_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE
);

CREATE TABLE patient_diseases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    catalog_id UUID REFERENCES disease_catalog (id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT,
    diagnosed_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    result TEXT NOT NULL,
    analysis_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    doctor_name TEXT NOT NULL,
    conducting_doctor_id UUID REFERENCES users (id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    drug TEXT NOT NULL,
    dosage TEXT NOT NULL,
    duration TEXT,
    visit_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE appointment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    preferred_date DATE NOT NULL,
    status appointment_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    visit_id UUID REFERENCES patient_visits (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_diseases_patient_id ON patient_diseases (patient_id);
CREATE INDEX idx_patient_diseases_catalog_id ON patient_diseases (catalog_id);
CREATE INDEX idx_patient_analyses_patient_id ON patient_analyses (patient_id);
CREATE INDEX idx_patient_visits_patient_id ON patient_visits (patient_id);
CREATE INDEX idx_patient_visits_conducting_doctor ON patient_visits (conducting_doctor_id);
CREATE INDEX idx_patient_prescriptions_patient_id ON patient_prescriptions (patient_id);
CREATE INDEX idx_appointment_requests_doctor_status ON appointment_requests (doctor_id, status);
CREATE INDEX idx_appointment_requests_patient ON appointment_requests (patient_id);

CREATE UNIQUE INDEX idx_appointment_requests_pending_unique
    ON appointment_requests (patient_id, doctor_id)
    WHERE status = 'pending';
