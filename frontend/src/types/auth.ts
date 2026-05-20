export type Role = 'patient' | 'doctor' | 'admin'

export type SessionUser = {
  id: string
  email: string
  fullName: string
  role: Role
  birthDate?: string
  phone?: string
  specialty?: string
  token: string
}
