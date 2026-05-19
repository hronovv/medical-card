import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthPageShell } from '../components/AuthPageShell'
import { roleHomePathFor, useAuth } from '../context/AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    setLoading(true)
    try {
      const session = await register(fullName, email, password)
      navigate(roleHomePathFor(session.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось зарегистрироваться')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell
      title="Регистрация"
      subtitle="Создайте аккаунт пациента"
      footer={
        <p>
          Уже есть аккаунт?{' '}
          <Link to="/login" className="mc-auth-link">
            Войти
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
          <span className="mc-field__label">ФИО</span>
          <input
            className="mc-field__input"
            type="text"
            name="fullName"
            autoComplete="name"
            placeholder="Иванов Иван Иванович"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>

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
            autoComplete="new-password"
            placeholder="Не менее 8 символов"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>

        <label className="mc-field">
          <span className="mc-field__label">Повторите пароль</span>
          <input
            className="mc-field__input"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>

        <p className="mc-auth-form__note">
          Регистрация доступна только для пациентов. Врачи и администраторы входят по
          выданным учётным данным.
        </p>

        <button type="submit" className="mc-btn mc-btn--primary mc-auth-form__submit" disabled={loading}>
          {loading ? 'Создание…' : 'Зарегистрироваться'}
        </button>
      </form>
    </AuthPageShell>
  )
}
