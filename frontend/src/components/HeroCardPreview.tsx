import {
  mockPatient,
  mockDiseases,
  mockAnalyses,
  mockVisits,
} from '../mock/patient'

const previewTabs = ['Обзор', 'Анализы', 'Рецепты'] as const

function PreviewCard() {
  const lastVisit = mockVisits[0]
  const lastAnalysis = mockAnalyses[0]

  return (
    <div className="mc-island mc-landing-preview">
      <div className="mc-landing-preview__patient">
        <p className="mc-landing-preview__name">{mockPatient.fullName}</p>
        <p className="mc-landing-preview__meta">
          {mockPatient.birthDate} · Пациент
        </p>
      </div>

      <nav className="mc-tabs mc-landing-preview__tabs">
        {previewTabs.map((label, i) => (
          <span
            key={label}
            className={`mc-tab ${i === 0 ? 'mc-tab--active' : ''}`}
          >
            {label}
          </span>
        ))}
      </nav>

      <div className="mc-landing-preview__stats">
        <div className="mc-stat-card">
          <h3>Последний визит</h3>
          <p>
            {lastVisit.date}, {lastVisit.doctor}
          </p>
        </div>
        <div className="mc-stat-card">
          <h3>Активные болезни</h3>
          <p>{mockDiseases.length} записи</p>
        </div>
        <div className="mc-stat-card mc-landing-preview__stat--wide">
          <h3>Последний анализ</h3>
          <p>
            {lastAnalysis.type} — {lastAnalysis.result}
          </p>
        </div>
      </div>
    </div>
  )
}

export function HeroCardPreview() {
  return (
    <div className="mc-landing-preview-stage" aria-hidden>
      <div className="mc-landing-preview-glow" />
      <div className="mc-landing-preview-tilt">
        <div className="mc-landing-preview-back" />
        <PreviewCard />
      </div>
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
