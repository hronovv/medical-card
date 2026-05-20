import { useCallback, useRef, useState, type ReactNode, type TouchEvent } from 'react'

type PreviewTabId = 'overview' | 'diseases' | 'analyses' | 'visits' | 'prescriptions'

const tabs: { id: PreviewTabId; label: string }[] = [
  { id: 'overview', label: 'Обзор' },
  { id: 'diseases', label: 'Болезни' },
  { id: 'analyses', label: 'Анализы' },
  { id: 'visits', label: 'Посещения' },
  { id: 'prescriptions', label: 'Рецепты' },
]

const patient = {
  fullName: 'Григорьев Андрей Иванович',
  birthDate: '12.03.1990',
  phone: '+7 (999) 123-45-67',
}

const SWIPE_THRESHOLD = 40

function PreviewTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <div className="mc-table-wrap mc-landing-preview__table-wrap">
      <table className="mc-table mc-landing-preview__table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells) => (
            <tr key={cells.join('|')}>
              {cells.map((cell, i) => (
                <td key={`${headers[i]}-${cell}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function slideContent(tab: PreviewTabId): ReactNode {
  switch (tab) {
    case 'overview':
      return (
        <div className="mc-overview-grid mc-landing-preview__overview">
          <div className="mc-stat-card">
            <h3>Последний визит</h3>
            <p>10.05.2026, Петров А.Н.</p>
          </div>
          <div className="mc-stat-card">
            <h3>Активные болезни</h3>
            <p>2 записи</p>
          </div>
          <div className="mc-stat-card mc-landing-preview__stat--wide">
            <h3>Последний анализ</h3>
            <p>Глюкоза натощак — 10.05.2026</p>
          </div>
        </div>
      )
    case 'diseases':
      return (
        <PreviewTable
          headers={['Название', 'Код МКБ', 'Дата постановки']}
          rows={[
            ['Гипертония', 'I10', '01.08.2023'],
            ['Сахарный диабет 2 типа', 'E11', '15.11.2022'],
          ]}
        />
      )
    case 'analyses':
      return (
        <PreviewTable
          headers={['Дата', 'Тип', 'Результат']}
          rows={[
            ['10.05.2026', 'Глюкоза натощак', '5.8 ммоль/л'],
            ['10.05.2026', 'HbA1c', '6.4 %'],
          ]}
        />
      )
    case 'visits':
      return (
        <PreviewTable
          headers={['Дата', 'Врач', 'Заметки']}
          rows={[
            ['10.05.2026', 'Петров А.Н.', 'Контроль АД и сахара'],
            ['12.02.2026', 'Петров А.Н.', 'Диспансерный приём'],
          ]}
        />
      )
    case 'prescriptions':
      return (
        <PreviewTable
          headers={['Визит', 'Препарат', 'Дозировка', 'Срок']}
          rows={[
            ['10.05.2026', 'Эналаприл', '10 мг', '30 дней'],
            ['10.05.2026', 'Метформин', '500 мг 2 раза в день', '90 дней'],
          ]}
        />
      )
  }
}

function NavArrow({
  direction,
  onClick,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`mc-landing-preview-nav mc-landing-preview-nav--${direction}`}
      onClick={onClick}
      aria-label={direction === 'prev' ? 'Предыдущая вкладка' : 'Следующая вкладка'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {direction === 'prev' ? (
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  )
}

export function HeroCardPreview() {
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const goTo = useCallback((next: number) => {
    setIndex((next + tabs.length) % tabs.length)
  }, [])

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index])
  const goNext = useCallback(() => goTo(index + 1), [goTo, index])

  function onTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  function onTouchEnd(e: TouchEvent) {
    if (touchStartX.current == null) return
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current
    const delta = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    if (delta < 0) goNext()
    else goPrev()
  }

  const activeTab = tabs[index].id

  return (
    <div className="mc-landing-preview-stage" role="region" aria-label="Пример медицинской карты">
      <div className="mc-landing-preview-glow" aria-hidden />

      <NavArrow direction="prev" onClick={goPrev} />

      <div className="mc-landing-preview-tilt">
        <div className="mc-landing-preview-back" aria-hidden />

        <div
          className="mc-island mc-landing-preview"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="mc-landing-preview__head">
            <h1>{patient.fullName}</h1>
            <p className="mc-patient-meta">
              Дата рождения: {patient.birthDate} · {patient.phone}
            </p>
          </div>

          <nav className="mc-tabs mc-landing-preview__tabs" aria-hidden>
            {tabs.map((t) => (
              <span
                key={t.id}
                className={`mc-tab${t.id === activeTab ? ' mc-tab--active' : ''}`}
              >
                {t.label}
              </span>
            ))}
          </nav>

          <div className="mc-landing-preview__viewport">
            <div
              className="mc-landing-preview-track"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {tabs.map((t) => (
                <div key={t.id} className="mc-landing-preview-slide">
                  {slideContent(t.id)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <NavArrow direction="next" onClick={goNext} />

      <img
        src="/cursor-pointer.svg"
        alt=""
        className="mc-landing-preview-cursor"
        width={32}
        height={32}
      />
    </div>
  )
}
