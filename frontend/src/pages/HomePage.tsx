import { Link } from 'react-router-dom'

const features = [
  {
    icon: '📋',
    title: 'Единая карта',
    text: 'Болезни, анализы, визиты и рецепты в одном месте.',
  },
  {
    icon: '🩺',
    title: 'Для врачей',
    text: 'Ведение записей и назначений по пациентам.',
  },
  {
    icon: '🔒',
    title: 'Безопасность',
    text: 'Доступ по ролям: пациент видит только свои данные.',
  },
  {
    icon: '⚡',
    title: 'Быстрый обзор',
    text: 'Сводка и история — без лишних переходов.',
  },
]

export function HomePage() {
  return (
    <div className="medical-app">
      <header className="mc-landing-nav">
        <div className="mc-shell mc-landing-nav__inner">
          <Link to="/" className="mc-landing-logo">
            <span className="mc-landing-logo__mark" aria-hidden />
            МедКарта
          </Link>
          <nav className="mc-landing-nav__links">
            <a href="#features">Возможности</a>
            <Link to="/demo" className="mc-btn mc-btn--ghost mc-btn--sm">
              Демо
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mc-landing-hero">
          <div className="mc-shell mc-landing-hero__grid">
            <div className="mc-landing-hero__content">
              <p className="mc-landing-eyebrow">Электронная медицинская карта</p>
              <h1>
                Здоровье под контролем —{' '}
                <span className="mc-landing-hero__accent">удобно и наглядно</span>
              </h1>
              <p className="mc-landing-hero__lead">
                Сервис для хранения медицинской истории: диагнозы, анализы, приёмы и
                рецепты. Для пациентов и клиник.
              </p>
              <div className="mc-landing-hero__actions">
                <Link to="/demo" className="mc-btn mc-btn--primary mc-btn--lg">
                  Войти
                </Link>
                <Link to="/demo" className="mc-btn mc-btn--ghost mc-btn--lg">
                  Демо-режим
                </Link>
              </div>
            </div>

            <div className="mc-island mc-landing-preview" aria-hidden>
              <div className="mc-landing-preview__bar" />
              <div className="mc-landing-preview__row">
                <span className="mc-landing-preview__pill mc-landing-preview__pill--active" />
                <span className="mc-landing-preview__pill" />
                <span className="mc-landing-preview__pill" />
              </div>
              <div className="mc-landing-preview__cards">
                <div className="mc-landing-preview__card" />
                <div className="mc-landing-preview__card" />
                <div className="mc-landing-preview__card mc-landing-preview__card--wide" />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mc-landing-features">
          <div className="mc-shell">
            <h2 className="mc-landing-section-title">Что внутри системы</h2>
            <p className="mc-landing-section-sub">
              Основные разделы после входа в аккаунт
            </p>
            <div className="mc-landing-features__grid">
              {features.map((f) => (
                <article key={f.title} className="mc-island mc-landing-feature">
                  <span className="mc-landing-feature__icon" aria-hidden>
                    {f.icon}
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mc-landing-cta">
          <div className="mc-shell">
            <div className="mc-island mc-landing-cta__box">
              <h2>Готовы начать?</h2>
              <p>Выберите роль и откройте медицинскую карту.</p>
              <Link to="/demo" className="mc-btn mc-btn--primary">
                Перейти в систему →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mc-landing-footer">
        <div className="mc-shell">
          <p>© МедКарта</p>
        </div>
      </footer>
    </div>
  )
}
