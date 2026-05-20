import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type LogoutButtonProps = {
  className?: string
}

export function LogoutButton({ className = '' }: LogoutButtonProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return null
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <button
      type="button"
      className={`mc-btn mc-btn--ghost mc-btn--sm ${className}`.trim()}
      onClick={handleLogout}
    >
      Выйти
    </button>
  )
}
