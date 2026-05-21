ALTER TABLE patient_diseases
    DROP CONSTRAINT IF EXISTS patient_diseases_catalog_id_fkey;

ALTER TABLE patient_diseases
    ADD CONSTRAINT patient_diseases_catalog_id_fkey
    FOREIGN KEY (catalog_id) REFERENCES disease_catalog (id) ON DELETE CASCADE;
