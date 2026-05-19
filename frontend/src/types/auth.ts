export type Role = 'patient' | 'doctor' | 'admin'

export type User = {
  id: string
  email: string
  password: string
  fullName: string
  role: Role
}

export type SessionUser = Pick<User, 'id' | 'email' | 'fullName' | 'role'>
