import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { fetchMe, loginUser, logoutUser, registerUser, type AuthUser } from '../api/auth'
import { ApiError } from '../api/client'
import type { Role, SessionUser } from '../types/auth'

const SESSION_STORAGE_KEY = 'pulse_session'

type AuthContextValue = {
  user: SessionUser | null
  isBootstrapping: boolean
  login: (email: string, password: string) => Promise<SessionUser>
  register: (
    fullName: string,
    email: string,
    password: string,
    birthDate: string,
    phone: string,
  ) => Promise<SessionUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

function writeStoredSession(user: SessionUser | null) {
  if (!user) {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    return
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user))
}

function toSessionUser(user: AuthUser, token: string): SessionUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    birthDate: user.birthDate,
    phone: user.phone,
    specialty: user.specialty,
    token,
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
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const bootstrapIdRef = useRef(0)

  useEffect(() => {
    const stored = readStoredSession()
    if (!stored?.token) {
      setUser(null)
      setIsBootstrapping(false)
      return
    }

    const bootstrapId = ++bootstrapIdRef.current
    let cancelled = false

    // Показываем кэш из localStorage; сбрасываем только при 401 (не при сетевых ошибках dev).
    setUser(stored)
    setIsBootstrapping(true)

    fetchMe(stored.token)
      .then(({ user: fresh }) => {
        if (cancelled || bootstrapId !== bootstrapIdRef.current) return
        const session = toSessionUser(fresh, stored.token)
        writeStoredSession(session)
        setUser(session)
      })
      .catch((err) => {
        if (cancelled || bootstrapId !== bootstrapIdRef.current) return
        if (err instanceof ApiError && err.status === 401) {
          writeStoredSession(null)
          setUser(null)
        } else {
          setUser(stored)
        }
      })
      .finally(() => {
        if (!cancelled && bootstrapId === bootstrapIdRef.current) {
          setIsBootstrapping(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await loginUser({ email, password })
      const session = toSessionUser(result.user, result.token)
      writeStoredSession(session)
      setUser(session)
      return session
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message)
      }
      throw new Error('Не удалось связаться с сервером')
    }
  }, [])

  const register = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      birthDate: string,
      phone: string,
    ) => {
      try {
        const result = await registerUser({
          fullName,
          email,
          password,
          birthDate,
          phone,
        })
        const session = toSessionUser(result.user, result.token)
        writeStoredSession(session)
        setUser(session)
        return session
      } catch (err) {
        if (err instanceof ApiError) {
          throw new Error(err.message)
        }
        throw new Error('Не удалось связаться с сервером')
      }
    },
    [],
  )

  const logout = useCallback(async () => {
    const token = user?.token ?? readStoredSession()?.token
    if (token) {
      try {
        await logoutUser(token)
      } catch {
      }
    }
    writeStoredSession(null)
    setUser(null)
  }, [user])

  const value = useMemo(
    () => ({ user, isBootstrapping, login, register, logout }),
    [user, isBootstrapping, login, register, logout],
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
