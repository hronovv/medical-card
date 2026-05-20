import { useCallback, useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { DoctorAppointmentsPanel } from '../components/DoctorAppointmentsPanel'
import { DoctorProfileCard } from '../components/DoctorProfileCard'
import { FormMessages } from '../components/FormMessages'
import { ListControls } from '../components/ListControls'
import { PatientCardView } from '../components/PatientCardView'
import { fetchPatientsList, type PatientListItem } from '../api/patient'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_LIST_LIMIT, type PaginationMeta } from '../types/pagination'

type DoctorView = 'patients' | 'appointments'

const emptyPagination = (page = 1, limit = DEFAULT_LIST_LIMIT): PaginationMeta => ({
  page,
  limit,
  total: 0,
  totalPages: 0,
})

export function DoctorPage() {
  const { user } = useAuth()
  const [view, setView] = useState<DoctorView>('patients')
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(() => emptyPagination())
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPatients = useCallback(async () => {
    if (!user?.token) return
    setError(null)
    try {
      const data = await fetchPatientsList(user.token, { q, page, limit: DEFAULT_LIST_LIMIT })
      setPatients(data.patients)
      setPagination(data.pagination)
      setSelectedId((prev) => {
        if (data.patients.some((p) => p.id === prev)) return prev
        return data.patients[0]?.id ?? null
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить список пациентов')
    } finally {
      setInitialLoading(false)
    }
  }, [user?.token, q, page])

  useEffect(() => {
    if (view !== 'patients') return
    void loadPatients()
  }, [loadPatients, view])

  const onQChange = useCallback((value: string) => {
    setQ(value)
    setPage(1)
  }, [])

  return (
    <Layout role="doctor" title={view === 'patients' ? 'Кабинет врача' : 'Записи на приём'}>
      {user && <DoctorProfileCard doctor={user} />}

      <nav className="mc-tabs mc-cabinet-views" aria-label="Разделы кабинета">
        <button
          type="button"
          className={`mc-tab${view === 'patients' ? ' mc-tab--active' : ''}`}
          onClick={() => setView('patients')}
        >
          Пациенты
        </button>
        <button
          type="button"
          className={`mc-tab${view === 'appointments' ? ' mc-tab--active' : ''}`}
          onClick={() => setView('appointments')}
        >
          Записи
        </button>
      </nav>

      {view === 'appointments' && <DoctorAppointmentsPanel />}

      {view === 'patients' && (
        <ListControls
          q={q}
          onQChange={onQChange}
          pagination={pagination}
          onPageChange={setPage}
          placeholder="Поиск по ФИО, email, телефону…"
        />
      )}

      {view === 'patients' && initialLoading && (
        <p className="mc-readonly-hint">Загрузка пациентов…</p>
      )}
      <FormMessages className="mc-page-messages" errors={[view === 'patients' ? error : null]} />

      {view === 'patients' && !initialLoading && !error && patients.length === 0 && (
        <p className="mc-readonly-hint">
          {q.trim()
            ? 'По запросу пациентов не найдено.'
            : user?.specialty === 'Терапевт'
              ? 'Нет пациентов, закреплённых за вами как за терапевтом.'
              : 'Нет пациентов, у которых в карте есть ваш приём. После добавления визита пациент появится здесь.'}
        </p>
      )}

      {view === 'patients' && !initialLoading && !error && patients.length > 0 && (
        <>
          <div className="mc-island mc-doctor-picker">
            <label className="mc-field">
              <span className="mc-field__label">Пациент</span>
              <select
                className="mc-field__input"
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedId && <PatientCardView key={selectedId} editable patientId={selectedId} />}
        </>
      )}
    </Layout>
  )
}
