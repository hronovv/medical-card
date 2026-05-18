import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type Role = 'patient' | 'doctor' | 'admin'

const badgeClass: Record<Role, string> = {
  patient: 'mc-badge--patient',
  doctor: 'mc-badge--doctor',
  admin: 'mc-badge--admin',
}

const badgeLabel: Record<Role, string> = {
  patient: 'Пациент',
  doctor: 'Врач',
  admin: 'Администратор',
}

type LayoutProps = {
  role: Role
  title?: string
  children: ReactNode
}

export function Layout({ role, title, children }: LayoutProps) {
  return (
    <div className="medical-app">
      <div className="mc-shell">
        <header className="mc-header">
          <div className="mc-header__left">
            <Link to="/" className="mc-back">
              ← На главную
            </Link>
            {title && <h1>{title}</h1>}
          </div>
          <span className={`mc-badge ${badgeClass[role]}`}>{badgeLabel[role]}</span>
        </header>
        <main className="mc-main">{children}</main>
      </div>
    </div>
  )
}
