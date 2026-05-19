import { Link } from 'react-router-dom'
import logoUrl from '../assets/logo.svg'
import { PartnerLogo } from '../components/PartnerLogos'
import { HeroCardPreview } from '../components/HeroCardPreview'

const partners = [
  { name: 'Синапс', variant: 'synapse' as const, tag: 'Лаборатория' },
  { name: 'Кванта', variant: 'quanta' as const, tag: 'Клиника' },
  { name: 'Нова', variant: 'nova' as const, tag: 'Диагностика' },
  { name: 'Эффон', variant: 'effon' as const, tag: 'Лаборатория' },
  { name: 'Орион', variant: 'orion' as const, tag: 'Медцентр' },
] as const

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
            <img src={logoUrl} alt="Пульс" className="mc-landing-logo__img" width={32} height={32} />
            Пульс
          </Link>
          <nav className="mc-landing-nav__links">
            <a href="#features">Возможности</a>
            <Link to="/login" className="mc-btn mc-btn--ghost mc-btn--sm mc-landing-nav__cta">
              Войти
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
                <Link to="/login" className="mc-btn mc-btn--primary mc-btn--lg">
                  Войти
                </Link>
                <Link to="/register" className="mc-btn mc-btn--ghost mc-btn--lg">
                  Регистрация
                </Link>
              </div>
            </div>

            <HeroCardPreview />
          </div>
        </section>

        <section className="mc-landing-trust" aria-labelledby="trust-heading">
          <div className="mc-shell">
            <div className="mc-island mc-landing-trust__panel">
              <div className="mc-landing-trust__head">
                <h2 id="trust-heading" className="mc-landing-trust__title">
                  Нам доверяют
                </h2>
                <p className="mc-landing-trust__sub">
                  Примеры клиник и лабораторий, подключающих анализы к единой карте
                </p>
              </div>
              <ul className="mc-landing-trust__grid">
                {partners.map((p) => (
                  <li key={p.name} className="mc-landing-trust__item">
                    <PartnerLogo variant={p.variant} />
                    <div className="mc-landing-trust__meta">
                      <span className="mc-landing-trust__name">{p.name}</span>
                      <span className="mc-landing-trust__tag">{p.tag}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="features" className="mc-landing-features">
          <div className="mc-shell">
            <div className="mc-landing-section-head">
              <h2 className="mc-landing-section-title">Что внутри системы</h2>
              <p className="mc-landing-section-sub">
                Основные разделы после входа в аккаунт
              </p>
            </div>
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
              <p>Войдите или создайте аккаунт пациента.</p>
              <div className="mc-landing-cta__actions">
                <Link to="/login" className="mc-btn mc-btn--primary">
                  Войти →
                </Link>
                <Link to="/register" className="mc-btn mc-btn--ghost">
                  Регистрация
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mc-landing-footer">
        <div className="mc-shell">
          <p>© {new Date().getFullYear()} Пульс. Все права защищены.</p>
        </div>
      </footer>
    </div>
  )
}
