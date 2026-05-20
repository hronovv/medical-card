import { useState } from 'react'
import { Layout } from '../components/Layout'
import { PatientAppointmentsPanel } from '../components/PatientAppointmentsPanel'
import { PatientCardView } from '../components/PatientCardView'

type PatientView = 'card' | 'appointments'

export function PatientPage() {
  const [view, setView] = useState<PatientView>('card')

  return (
    <Layout role="patient" title={view === 'card' ? 'Моя карта' : 'Запись на приём'}>
      <nav className="mc-tabs mc-cabinet-views" aria-label="Разделы кабинета">
        <button
          type="button"
          className={`mc-tab${view === 'card' ? ' mc-tab--active' : ''}`}
          onClick={() => setView('card')}
        >
          Моя карта
        </button>
        <button
          type="button"
          className={`mc-tab${view === 'appointments' ? ' mc-tab--active' : ''}`}
          onClick={() => setView('appointments')}
        >
          Запись на приём
        </button>
      </nav>

      {view === 'card' && <PatientCardView editable={false} />}
      {view === 'appointments' && <PatientAppointmentsPanel />}
    </Layout>
  )
}
