import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import logoUrl from '../assets/logo.svg'

type AuthPageShellProps = {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthPageShell({ title, subtitle, children, footer }: AuthPageShellProps) {
  return (
    <div className="medical-app mc-auth-page">
      <div className="mc-auth-page__wrap">
        <Link to="/" className="mc-auth-page__brand">
          <img src={logoUrl} alt="Пульс" width={36} height={36} />
          <span>Пульс</span>
        </Link>

        <div className="mc-island mc-auth-card">
          <div className="mc-auth-card__head">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {children}
        </div>

        {footer && <div className="mc-auth-page__footer">{footer}</div>}
      </div>
    </div>
  )
}
