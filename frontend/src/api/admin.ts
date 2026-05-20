import { apiRequest } from './client'
import type { PaginationMeta } from '../types/pagination'
import type { CatalogDisease } from './catalog'
import type { PatientListItem } from './patient'

export type DoctorListItem = {
  id: string
  fullName: string
  birthDate: string
  phone: string
  email: string
  specialty: string
}

export type AdminDashboard = {
  stats: {
    patients: number
    doctors: number
    diseaseCatalog: number
  }
  patients: PatientListItem[]
  patientsPagination: PaginationMeta
  doctors: DoctorListItem[]
  doctorsPagination: PaginationMeta
  therapists: DoctorListItem[]
}

export type AdminDashboardQuery = {
  patientsQ?: string
  patientsPage?: number
  patientsLimit?: number
  doctorsQ?: string
  doctorsPage?: number
  doctorsLimit?: number
}

function buildAdminDashboardQuery(params: AdminDashboardQuery = {}): string {
  const sp = new URLSearchParams()
  if (params.patientsQ?.trim()) sp.set('patientsQ', params.patientsQ.trim())
  if (params.patientsPage && params.patientsPage > 0) sp.set('patientsPage', String(params.patientsPage))
  if (params.patientsLimit && params.patientsLimit > 0) sp.set('patientsLimit', String(params.patientsLimit))
  if (params.doctorsQ?.trim()) sp.set('doctorsQ', params.doctorsQ.trim())
  if (params.doctorsPage && params.doctorsPage > 0) sp.set('doctorsPage', String(params.doctorsPage))
  if (params.doctorsLimit && params.doctorsLimit > 0) sp.set('doctorsLimit', String(params.doctorsLimit))
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

export function fetchAdminDashboard(token: string, params?: AdminDashboardQuery) {
  return apiRequest<AdminDashboard>(`/admin/dashboard${buildAdminDashboardQuery(params)}`, { token })
}

export function updatePatientAssignment(
  token: string,
  patientId: string,
  doctorId: string | null,
) {
  return apiRequest<{
    patientId: string
    assignedDoctorId: string | null
    assignedDoctorName: string
  }>(`/admin/patients/${patientId}/assignment`, {
    method: 'PATCH',
    token,
    body: { doctorId },
  })
}

export function createAdminPatient(
  token: string,
  body: {
    fullName: string
    email: string
    password: string
    confirmPassword: string
    birthDate: string
    phone: string
  },
) {
  return apiRequest<{ patient: PatientListItem }>('/admin/patients', {
    method: 'POST',
    body,
    token,
  })
}

export function updateAdminPatient(
  token: string,
  patientId: string,
  body: { fullName: string; email: string; birthDate: string; phone: string },
) {
  return apiRequest<{ patient: PatientListItem }>(`/admin/patients/${patientId}`, {
    method: 'PATCH',
    body,
    token,
  })
}

export function deleteAdminPatient(token: string, patientId: string) {
  return apiRequest<{ message: string }>(`/admin/patients/${patientId}`, {
    method: 'DELETE',
    token,
  })
}

export function createAdminDoctor(
  token: string,
  body: {
    fullName: string
    email: string
    password: string
    confirmPassword: string
    birthDate: string
    phone: string
    specialty: string
  },
) {
  return apiRequest<{ doctor: DoctorListItem }>('/admin/doctors', {
    method: 'POST',
    body,
    token,
  })
}

export function updateAdminDoctor(
  token: string,
  doctorId: string,
  body: {
    fullName: string
    email: string
    birthDate: string
    phone: string
    specialty: string
  },
) {
  return apiRequest<{ doctor: DoctorListItem }>(`/admin/doctors/${doctorId}`, {
    method: 'PATCH',
    body,
    token,
  })
}

export function deleteAdminDoctor(token: string, doctorId: string) {
  return apiRequest<{ message: string }>(`/admin/doctors/${doctorId}`, {
    method: 'DELETE',
    token,
  })
}

export function createCatalogDisease(token: string, body: { name: string; code: string }) {
  return apiRequest<{ disease: CatalogDisease }>('/admin/catalog/diseases', {
    method: 'POST',
    body,
    token,
  })
}
