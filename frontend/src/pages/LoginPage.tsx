import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthPageShell } from '../components/AuthPageShell'
import { roleHomePathFor, useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session = await login(email, password)
      navigate(roleHomePathFor(session.role), { replace: true })
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

        <label className="mc-field">
          <span className="mc-field__label">Пароль</span>
          <input
            className="mc-field__input"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit" className="mc-btn mc-btn--primary mc-auth-form__submit" disabled={loading}>
          {loading ? 'Вход…' : 'Войти'}
        </button>
      </form>

      <details className="mc-auth-hint">
        <summary>Тестовые аккаунты</summary>
        <ul>
          <li>
            <strong>Пациент:</strong> patient@pulse.ru / patient123
          </li>
          <li>
            <strong>Врач:</strong> doctor@pulse.ru / doctor123
          </li>
          <li>
            <strong>Админ:</strong> admin@pulse.ru / admin123
          </li>
        </ul>
      </details>
    </AuthPageShell>
  )
}
