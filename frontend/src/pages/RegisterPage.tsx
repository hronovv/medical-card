import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthPageShell } from '../components/AuthPageShell'
import { PasswordInput } from '../components/PasswordInput'
import { roleHomePathFor, useAuth } from '../context/AuthContext'

export function RegisterPage() {
  const { register, user, isBootstrapping } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isBootstrapping && user) {
    return <Navigate to={roleHomePathFor(user.role)} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    setLoading(true)
    try {
      const session = await register(fullName, email, password, birthDate, phone)
      navigate(roleHomePathFor(session.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось зарегистрироваться')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell
      registerLayout
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
      <form className="mc-auth-form mc-auth-form--register" onSubmit={handleSubmit} noValidate>
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

        <div className="mc-auth-form__row">
          <label className="mc-field">
            <span className="mc-field__label">Дата рождения</span>
            <input
              className="mc-field__input"
              type="date"
              name="birthDate"
              autoComplete="bday"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </label>

          <label className="mc-field">
            <span className="mc-field__label">Телефон</span>
            <input
              className="mc-field__input"
              type="tel"
              name="phone"
              autoComplete="tel"
              placeholder="+7 (999) 123-45-67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
        </div>

        <PasswordInput
          label="Пароль"
          name="password"
          autoComplete="new-password"
          placeholder="Не менее 8 символов"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />

        <PasswordInput
          label="Повторите пароль"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={8}
          required
        />

        <p className="mc-auth-form__note">
          Регистрация только для пациентов. Врачи входят по выданным учётным данным.
        </p>

        <button
          type="submit"
          className="mc-btn mc-btn--primary mc-auth-form__submit"
          disabled={loading}
        >
          {loading ? 'Создание…' : 'Зарегистрироваться'}
        </button>
      </form>
    </AuthPageShell>
  )
}
