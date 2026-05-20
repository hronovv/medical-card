import { apiRequest } from './client'
import { buildListQuery, type ListQuery, type PaginationMeta } from '../types/pagination'

export type DoctorListItem = {
  id: string
  fullName: string
  specialty?: string
  email?: string
  phone?: string
}

export type AppointmentStatus = 'pending' | 'approved' | 'rejected'

export type Appointment = {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  doctorSpecialty?: string
  requestedAt: string
  preferredDate: string
  status: AppointmentStatus
  notes?: string
  visitId?: string
}

export function fetchDoctors(token: string, params?: ListQuery) {
  return apiRequest<{ doctors: DoctorListItem[]; pagination: PaginationMeta }>(
    `/doctors${buildListQuery(params)}`,
    { token },
  )
}

export type AppointmentsQuery = ListQuery & {
  status?: AppointmentStatus
}

export function fetchAppointments(token: string, params?: AppointmentsQuery) {
  const sp = new URLSearchParams()
  if (params?.status) sp.set('status', params.status)
  if (params?.q?.trim()) sp.set('q', params.q.trim())
  if (params?.page && params.page > 0) sp.set('page', String(params.page))
  if (params?.limit && params.limit > 0) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  return apiRequest<{ appointments: Appointment[]; pagination: PaginationMeta }>(
    `/appointments${qs ? `?${qs}` : ''}`,
    { token },
  )
}

export function createAppointment(
  token: string,
  body: { doctorId: string; preferredDate: string; notes?: string },
) {
  return apiRequest<{ appointment: Appointment }>('/appointments', {
    method: 'POST',
    body,
    token,
  })
}

export function approveAppointment(
  token: string,
  appointmentId: string,
  body?: { visitDate?: string; notes?: string },
) {
  return apiRequest<{ appointment: Appointment; visit: { id: string; date: string; doctor: string } }>(
    `/appointments/${appointmentId}/approve`,
    {
      method: 'POST',
      body: body ?? {},
      token,
    },
  )
}

export function rejectAppointment(token: string, appointmentId: string) {
  return apiRequest<{ appointment: Appointment }>(`/appointments/${appointmentId}/reject`, {
    method: 'POST',
    token,
  })
}

export function cancelAppointment(token: string, appointmentId: string) {
  return apiRequest<{ message: string }>(`/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    token,
  })
}

export const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  pending: 'Ожидает',
  approved: 'Принята',
  rejected: 'Отклонена',
}
