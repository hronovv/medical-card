import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="medical-app">
      <div className="mc-shell">
        <main className="mc-home">
          <div className="mc-home__hero">
            <h1>Медицинская карта</h1>
            <p>Выберите роль для просмотра макета интерфейса</p>
          </div>

          <div className="mc-role-grid">
            <Link to="/patient" className="mc-role-card">
              <span className="mc-role-card__icon" aria-hidden>
                👤
              </span>
              <h2>Пациент</h2>
              <span>Только просмотр своей карты</span>
            </Link>

            <Link to="/doctor" className="mc-role-card">
              <span className="mc-role-card__icon" aria-hidden>
                🩺
              </span>
              <h2>Врач</h2>
              <span>Редактирование карты пациента</span>
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
