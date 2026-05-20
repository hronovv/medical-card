import { apiRequest } from './client'
import type { Role } from '../types/auth'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  birthDate: string
  phone: string
  role: Role
  specialty?: string
}

export type AuthResponse = {
  token: string
  user: AuthUser
}

export type MeResponse = {
  user: AuthUser
}

export type RegisterPayload = {
  fullName: string
  email: string
  password: string
  birthDate: string
  phone: string
}

export type LoginPayload = {
  email: string
  password: string
}

export function registerUser(payload: RegisterPayload) {
  return apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: payload })
}

export function loginUser(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: payload })
}

export function fetchMe(token: string) {
  return apiRequest<MeResponse>('/auth/me', { token })
}

export function logoutUser(token: string) {
  return apiRequest<{ message: string }>('/auth/logout', { method: 'POST', token })
}
