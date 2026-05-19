import type { User } from '../types/auth'

export const SEED_USERS: User[] = [
  {
    id: 'user-patient',
    email: 'patient@pulse.ru',
    password: 'patient123',
    fullName: 'Иванова Анна Сергеевна',
    role: 'patient',
  },
  {
    id: 'user-doctor',
    email: 'doctor@pulse.ru',
    password: 'doctor123',
    fullName: 'Петров Алексей Николаевич',
    role: 'doctor',
  },
  {
    id: 'user-admin',
    email: 'admin@pulse.ru',
    password: 'admin123',
    fullName: 'Смирнова Елена Викторовна',
    role: 'admin',
  },
]

export const REGISTERED_USERS_STORAGE_KEY = 'pulse_registered_users'
