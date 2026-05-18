import { Layout } from '../components/Layout'
import { PatientCardView } from '../components/PatientCardView'

export function DoctorPage() {
  return (
    <Layout role="doctor" title="Карта пациента">
      <PatientCardView editable />
    </Layout>
  )
}
