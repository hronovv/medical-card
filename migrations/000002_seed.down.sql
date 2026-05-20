TRUNCATE TABLE
    appointment_requests,
    patient_prescriptions,
    patient_visits,
    patient_analyses,
    patient_diseases,
    disease_catalog,
    users
RESTART IDENTITY CASCADE;
