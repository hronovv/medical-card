import { apiRequest } from './client'
import { buildListQuery, type ListQuery, type PaginationMeta } from '../types/pagination'

export type PatientProfile = {
  id: string
  fullName: string
  birthDate: string
  phone: string
}

export type AssignedDoctor = {
  id: string
  fullName: string
  specialty: string
  phone: string
  email: string
}

export type PatientDisease = {
  id: string
  name: string
  code?: string
  diagnosedAt?: string
  catalogId?: string
}

export type PatientAnalysis = {
  id: string
  type: string
  result: string
  date: string
}

export type PatientVisit = {
  id: string
  date: string
  doctor: string
  notes?: string
  conductingDoctorId?: string
}

export type PatientPrescription = {
  id: string
  drug: string
  dosage: string
  duration?: string
  visitDate?: string
}

export type PatientCardData = {
  profile: PatientProfile
  assignedDoctor: AssignedDoctor | null
  diseases: PatientDisease[]
  analyses: PatientAnalysis[]
  visits: PatientVisit[]
  prescriptions: PatientPrescription[]
}

export type PatientListItem = {
  id: string
  fullName: string
  birthDate: string
  phone: string
  email: string
  assignedDoctorId?: string | null
  assignedDoctorName?: string
}

export function fetchMyPatientCard(token: string) {
  return apiRequest<PatientCardData>('/patients/me', { token })
}

export function fetchPatientCard(token: string, patientId: string) {
  return apiRequest<PatientCardData>(`/patients/${patientId}`, { token })
}

export function fetchPatientsList(token: string, params?: ListQuery) {
  return apiRequest<{ patients: PatientListItem[]; pagination: PaginationMeta }>(
    `/patients${buildListQuery(params)}`,
    { token },
  )
}

export function createPatientDisease(
  token: string,
  patientId: string,
  body: { catalogId: string; diagnosedAt?: string },
) {
  return apiRequest<{ disease: PatientDisease }>(`/patients/${patientId}/diseases`, {
    method: 'POST',
    body,
    token,
  })
}

export function updatePatientDisease(
  token: string,
  patientId: string,
  diseaseId: string,
  body: { catalogId?: string; diagnosedAt?: string },
) {
  return apiRequest<{ disease: PatientDisease }>(`/patients/${patientId}/diseases/${diseaseId}`, {
    method: 'PATCH',
    body,
    token,
  })
}

export function deletePatientDisease(token: string, patientId: string, diseaseId: string) {
  return apiRequest<{ message: string }>(`/patients/${patientId}/diseases/${diseaseId}`, {
    method: 'DELETE',
    token,
  })
}

export function createPatientAnalysis(
  token: string,
  patientId: string,
  body: { type: string; result: string; date: string },
) {
  return apiRequest<{ analysis: PatientAnalysis }>(`/patients/${patientId}/analyses`, {
    method: 'POST',
    body,
    token,
  })
}

export function updatePatientAnalysis(
  token: string,
  patientId: string,
  analysisId: string,
  body: { type?: string; result?: string; date?: string },
) {
  return apiRequest<{ analysis: PatientAnalysis }>(`/patients/${patientId}/analyses/${analysisId}`, {
    method: 'PATCH',
    body,
    token,
  })
}

export function deletePatientAnalysis(token: string, patientId: string, analysisId: string) {
  return apiRequest<{ message: string }>(`/patients/${patientId}/analyses/${analysisId}`, {
    method: 'DELETE',
    token,
  })
}

export function createPatientVisit(
  token: string,
  patientId: string,
  body: { date: string; notes?: string },
) {
  return apiRequest<{ visit: PatientVisit }>(`/patients/${patientId}/visits`, {
    method: 'POST',
    body,
    token,
  })
}

export function updatePatientVisit(
  token: string,
  patientId: string,
  visitId: string,
  body: { date?: string; notes?: string },
) {
  return apiRequest<{ visit: PatientVisit }>(`/patients/${patientId}/visits/${visitId}`, {
    method: 'PATCH',
    body,
    token,
  })
}

export function deletePatientVisit(token: string, patientId: string, visitId: string) {
  return apiRequest<{ message: string }>(`/patients/${patientId}/visits/${visitId}`, {
    method: 'DELETE',
    token,
  })
}

export function createPatientPrescription(
  token: string,
  patientId: string,
  body: { drug: string; dosage: string; duration?: string; visitDate?: string },
) {
  return apiRequest<{ prescription: PatientPrescription }>(`/patients/${patientId}/prescriptions`, {
    method: 'POST',
    body,
    token,
  })
}

export function updatePatientPrescription(
  token: string,
  patientId: string,
  prescriptionId: string,
  body: { drug?: string; dosage?: string; duration?: string; visitDate?: string },
) {
  return apiRequest<{ prescription: PatientPrescription }>(
    `/patients/${patientId}/prescriptions/${prescriptionId}`,
    {
      method: 'PATCH',
      body,
      token,
    },
  )
}

export function deletePatientPrescription(
  token: string,
  patientId: string,
  prescriptionId: string,
) {
  return apiRequest<{ message: string }>(`/patients/${patientId}/prescriptions/${prescriptionId}`, {
    method: 'DELETE',
    token,
  })
}
