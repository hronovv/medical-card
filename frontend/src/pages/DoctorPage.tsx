import { Layout } from '../components/Layout'
import { PatientCardView } from '../components/PatientCardView'

export function DoctorPage() {
  return (
    <Layout role="doctor" title="Карта пациента">
      <p className="mc-readonly-hint" style={{ marginTop: 0 }}>
        Врач может добавлять и изменять записи в карте.
      </p>
      <PatientCardView editable />
    </Layout>
  )
}
