import { Link } from 'react-router-dom'

export function RoleSelectPage() {
  return (
    <div className="medical-app">
      <div className="mc-shell">
        <header className="mc-header mc-header--center">
          <Link to="/" className="mc-back">
            ← На главную
          </Link>
        </header>

        <main className="mc-home">
          <div className="mc-home__hero">
            <h1>Выбор роли</h1>
            <p>Войдите как пациент, врач или администратор</p>
          </div>

          <div className="mc-role-grid">
            <Link to="/patient" className="mc-role-card">
              <span className="mc-role-card__icon" aria-hidden>
                👤
              </span>
              <h2>Пациент</h2>
              <span>Просмотр медицинской карты</span>
            </Link>

            <Link to="/doctor" className="mc-role-card">
              <span className="mc-role-card__icon" aria-hidden>
                🩺
              </span>
              <h2>Врач</h2>
              <span>Ведение карты пациента</span>
            </Link>

            <Link to="/admin" className="mc-role-card">
              <span className="mc-role-card__icon" aria-hidden>
                ⚙️
              </span>
              <h2>Администратор</h2>
              <span>Пациенты, врачи, справочники</span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
