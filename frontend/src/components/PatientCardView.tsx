import { useState, type ReactNode } from 'react'
import {
  mockPatient,
  mockDiseases,
  mockAnalyses,
  mockVisits,
  mockPrescriptions,
} from '../mock/patient'

type Tab = 'overview' | 'diseases' | 'analyses' | 'visits' | 'prescriptions'

type PatientCardViewProps = {
  editable: boolean
}

function TableSection({
  title,
  editable,
  addLabel,
  headers,
  children,
}: {
  title: string
  editable: boolean
  addLabel: string
  headers: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <div className="mc-island__head">
        <h2>{title}</h2>
        {editable && (
          <button type="button" className="mc-btn mc-btn--primary">
            {addLabel}
          </button>
        )}
      </div>
      <div className="mc-table-wrap">
        <table className="mc-table">
          <thead>
            <tr>{headers}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </>
  )
}

export function PatientCardView({ editable }: PatientCardViewProps) {
  const [tab, setTab] = useState<Tab>('overview')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Обзор' },
    { id: 'diseases', label: 'Болезни' },
    { id: 'analyses', label: 'Анализы' },
    { id: 'visits', label: 'Посещения' },
    { id: 'prescriptions', label: 'Рецепты' },
  ]

  return (
    <>
      <section className="mc-island mc-patient-hero">
        <div>
          <h1>{mockPatient.fullName}</h1>
          <p className="mc-patient-meta">
            Дата рождения: {mockPatient.birthDate} · {mockPatient.phone}
          </p>
        </div>
      </section>

      {!editable && (
        <p className="mc-readonly-hint">Режим просмотра — только ваша медицинская карта.</p>
      )}

      <nav className="mc-tabs" aria-label="Разделы карты">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mc-tab ${tab === t.id ? 'mc-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="mc-island">
        {tab === 'overview' && (
          <div className="mc-overview-grid">
            <div className="mc-stat-card">
              <h3>Последний визит</h3>
              <p>
                {mockVisits[0].date}, {mockVisits[0].doctor}
              </p>
            </div>
            <div className="mc-stat-card">
              <h3>Активные болезни</h3>
              <p>{mockDiseases.length} записей</p>
            </div>
            <div className="mc-stat-card">
              <h3>Последний анализ</h3>
              <p>
                {mockAnalyses[0].type} — {mockAnalyses[0].date}
              </p>
            </div>
          </div>
        )}

        {tab === 'diseases' && (
          <TableSection
            title="Болезни"
            editable={editable}
            addLabel="+ Добавить"
            headers={
              <>
                <th>Название</th>
                <th>Код МКБ</th>
                <th>Дата постановки</th>
                {editable && <th>Действия</th>}
              </>
            }
          >
            {mockDiseases.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.code}</td>
                <td>{d.diagnosedAt}</td>
                {editable && (
                  <td>
                    <div className="mc-actions">
                      <button type="button" className="mc-btn mc-btn--ghost mc-btn--sm">
                        Изменить
                      </button>
                      <button type="button" className="mc-btn mc-btn--danger mc-btn--sm">
                        Удалить
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </TableSection>
        )}

        {tab === 'analyses' && (
          <TableSection
            title="Анализы"
            editable={editable}
            addLabel="+ Добавить"
            headers={
              <>
                <th>Дата</th>
                <th>Тип</th>
                <th>Результат</th>
                {editable && <th>Действия</th>}
              </>
            }
          >
            {mockAnalyses.map((a) => (
              <tr key={a.id}>
                <td>{a.date}</td>
                <td>{a.type}</td>
                <td>{a.result}</td>
                {editable && (
                  <td>
                    <div className="mc-actions">
                      <button type="button" className="mc-btn mc-btn--ghost mc-btn--sm">
                        Изменить
                      </button>
                      <button type="button" className="mc-btn mc-btn--danger mc-btn--sm">
                        Удалить
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </TableSection>
        )}

        {tab === 'visits' && (
          <TableSection
            title="Посещения"
            editable={editable}
            addLabel="+ Новый визит"
            headers={
              <>
                <th>Дата</th>
                <th>Врач</th>
                <th>Заметки</th>
                {editable && <th>Действия</th>}
              </>
            }
          >
            {mockVisits.map((v) => (
              <tr key={v.id}>
                <td>{v.date}</td>
                <td>{v.doctor}</td>
                <td>{v.notes}</td>
                {editable && (
                  <td>
                    <div className="mc-actions">
                      <button type="button" className="mc-btn mc-btn--ghost mc-btn--sm">
                        Изменить
                      </button>
                      <button type="button" className="mc-btn mc-btn--danger mc-btn--sm">
                        Удалить
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </TableSection>
        )}

        {tab === 'prescriptions' && (
          <TableSection
            title="Рецепты"
            editable={editable}
            addLabel="+ Рецепт"
            headers={
              <>
                <th>Визит</th>
                <th>Препарат</th>
                <th>Дозировка</th>
                <th>Срок</th>
                {editable && <th>Действия</th>}
              </>
            }
          >
            {mockPrescriptions.map((p) => (
              <tr key={p.id}>
                <td>{p.visitDate}</td>
                <td>{p.drug}</td>
                <td>{p.dosage}</td>
                <td>{p.duration}</td>
                {editable && (
                  <td>
                    <div className="mc-actions">
                      <button type="button" className="mc-btn mc-btn--ghost mc-btn--sm">
                        Изменить
                      </button>
                      <button type="button" className="mc-btn mc-btn--danger mc-btn--sm">
                        Удалить
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </TableSection>
        )}
      </section>
    </>
  )
}
