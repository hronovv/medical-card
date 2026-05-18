import { Layout } from '../components/Layout'
import { PatientCardView } from '../components/PatientCardView'

export function PatientPage() {
  return (
    <Layout role="patient" title="Моя карта">
      <PatientCardView editable={false} />
    </Layout>
  )
}
