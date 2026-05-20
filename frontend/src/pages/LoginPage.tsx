import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthPageShell } from '../components/AuthPageShell'
import { PasswordInput } from '../components/PasswordInput'
import { roleHomePathFor, useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login, user, isBootstrapping } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isBootstrapping && user) {
    return <Navigate to={roleHomePathFor(user.role)} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session = await login(email, password)
      const target = from && from !== '/login' ? from : roleHomePathFor(session.role)
      navigate(target, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell
      title="Вход"
      subtitle="Войдите в аккаунт Пульс"
      footer={
        <p>
          Нет аккаунта?{' '}
          <Link to="/register" className="mc-auth-link">
            Зарегистрироваться
          </Link>
        </p>
      }
    >
      <form className="mc-auth-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="mc-auth-form__error" role="alert">
            {error}
          </p>
        )}

        <label className="mc-field">
          <span className="mc-field__label">Email</span>
          <input
            className="mc-field__input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <PasswordInput
          label="Пароль"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="mc-btn mc-btn--primary mc-auth-form__submit" disabled={loading}>
          {loading ? 'Вход…' : 'Войти'}
        </button>
      </form>

      <details className="mc-auth-hint">
        <summary>Тестовые аккаунты</summary>
        <ul>
          <li>
            <strong>Пациенты:</strong> patient@pulse.ru, patient2@…, patient3@…, patient4@… / patient123
          </li>
          <li>
            <strong>Врачи:</strong> doctor@pulse.ru, doctor2@pulse.ru / doctor123
          </li>
          <li>
            <strong>Админ:</strong> admin@pulse.ru / admin123
          </li>
        </ul>
        <p className="mc-auth-form__note" style={{ marginTop: '0.5rem' }}>
          Пароли: patient123 / doctor123 / admin123
        </p>
      </details>
    </AuthPageShell>
  )
}
