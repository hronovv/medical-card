import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { roleHomePathFor, useAuth } from '../context/AuthContext'
import type { Role } from '../types/auth'

type ProtectedRouteProps = {
  role: Role
  children: ReactNode
}

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { user, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return (
      <div className="medical-app">
        <div className="mc-shell">
          <p className="mc-readonly-hint">Проверка сессии…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user.role !== role) {
    return <Navigate to={roleHomePathFor(user.role)} replace />
  }

  return children
}
