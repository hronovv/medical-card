import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { REGISTERED_USERS_STORAGE_KEY, SEED_USERS } from '../mock/users'
import type { Role, SessionUser, User } from '../types/auth'

const SESSION_STORAGE_KEY = 'pulse_session'

type AuthContextValue = {
  user: SessionUser | null
  login: (email: string, password: string) => Promise<SessionUser>
  register: (fullName: string, email: string, password: string) => Promise<SessionUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readRegisteredUsers(): User[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as User[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRegisteredUsers(users: User[]) {
  localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(users))
}

function loadAllUsers(): User[] {
  const registered = readRegisteredUsers()
  const byEmail = new Map<string, User>()
  for (const user of [...SEED_USERS, ...registered]) {
    byEmail.set(user.email.toLowerCase(), user)
  }
  return [...byEmail.values()]
}

function readSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

function writeSession(user: SessionUser | null) {
  if (!user) {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    return
  }
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user))
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  }
}

function roleHomePath(role: Role): string {
  switch (role) {
    case 'patient':
      return '/patient'
    case 'doctor':
      return '/doctor'
    case 'admin':
      return '/admin'
  }
}

export function roleHomePathFor(role: Role): string {
  return roleHomePath(role)
}

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SessionUser | null>(() => readSession())

  const login = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const found = loadAllUsers().find(
      (u) => u.email.toLowerCase() === normalizedEmail && u.password === password,
    )
    if (!found) {
      throw new Error('Неверный email или пароль')
    }
    const session = toSessionUser(found)
    writeSession(session)
    setUser(session)
    return session
  }, [])

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase()
      const trimmedName = fullName.trim()
      if (!trimmedName) {
        throw new Error('Укажите ФИО')
      }
      if (password.length < 8) {
        throw new Error('Пароль должен быть не короче 8 символов')
      }

      const exists = loadAllUsers().some((u) => u.email.toLowerCase() === normalizedEmail)
      if (exists) {
        throw new Error('Пользователь с таким email уже зарегистрирован')
      }

      const newUser: User = {
        id: `user-${crypto.randomUUID()}`,
        email: normalizedEmail,
        password,
        fullName: trimmedName,
        role: 'patient',
      }

      const registered = readRegisteredUsers()
      writeRegisteredUsers([...registered, newUser])

      const session = toSessionUser(newUser)
      writeSession(session)
      setUser(session)
      return session
    },
    [],
  )

  const logout = useCallback(() => {
    writeSession(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, login, register, logout }),
    [user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
