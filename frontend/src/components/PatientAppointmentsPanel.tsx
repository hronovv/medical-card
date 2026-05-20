import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  appointmentStatusLabel,
  cancelAppointment,
  createAppointment,
  fetchAppointments,
  fetchDoctors,
  type Appointment,
  type DoctorListItem,
} from '../api/appointments'
import { ApiError } from '../api/client'
import { FormMessages } from '../components/FormMessages'
import { ListControls } from '../components/ListControls'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAuth } from '../context/AuthContext'
import { todayDDMMYYYY, validateAppointmentDate } from '../utils/date'
import { DEFAULT_LIST_LIMIT, type PaginationMeta } from '../types/pagination'

const emptyPagination = (page = 1, limit = DEFAULT_LIST_LIMIT): PaginationMeta => ({
  page,
  limit,
  total: 0,
  totalPages: 0,
})

export function PatientAppointmentsPanel() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [apptPagination, setApptPagination] = useState<PaginationMeta>(() => emptyPagination())
  const [apptQ, setApptQ] = useState('')
  const [apptPage, setApptPage] = useState(1)
  const [doctors, setDoctors] = useState<DoctorListItem[]>([])
  const [doctorQ, setDoctorQ] = useState('')
  const debouncedDoctorQ = useDebouncedValue(doctorQ)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [doctorId, setDoctorId] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [notes, setNotes] = useState('')

  const loadAppointments = useCallback(async () => {
    if (!user?.token) return
    setError(null)
    try {
      const apptRes = await fetchAppointments(user.token, {
        q: apptQ,
        page: apptPage,
        limit: DEFAULT_LIST_LIMIT,
      })
      setAppointments(apptRes.appointments)
      setApptPagination(apptRes.pagination)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить записи')
    } finally {
      setInitialLoading(false)
    }
  }, [user?.token, apptQ, apptPage])

  const loadDoctors = useCallback(async () => {
    if (!user?.token) return
    try {
      const docRes = await fetchDoctors(user.token, { q: debouncedDoctorQ, limit: 100 })
      setDoctors(docRes.doctors)
      if (docRes.doctors.length > 0) {
        setDoctorId((prev) => (docRes.doctors.some((d) => d.id === prev) ? prev : docRes.doctors[0].id))
      } else {
        setDoctorId('')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить список врачей')
    }
  }, [user?.token, debouncedDoctorQ])

  useEffect(() => {
    void loadAppointments()
  }, [loadAppointments])

  useEffect(() => {
    void loadDoctors()
  }, [loadDoctors])

  async function reloadAll() {
    await Promise.all([loadAppointments(), loadDoctors()])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.token || !doctorId) return

    const dateErr = validateAppointmentDate(preferredDate)
    if (dateErr) {
      setFormError(dateErr)
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      await createAppointment(user.token, {
        doctorId,
        preferredDate: preferredDate.trim(),
        notes: notes.trim() || undefined,
      })
      setPreferredDate('')
      setNotes('')
      await reloadAll()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Не удалось отправить заявку')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(id: string) {
    if (!user?.token || !window.confirm('Отменить заявку на приём?')) return
    setCancelId(id)
    setFormError(null)
    try {
      await cancelAppointment(user.token, id)
      await reloadAll()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Не удалось отменить заявку')
    } finally {
      setCancelId(null)
    }
  }

  const minDateHint = todayDDMMYYYY()

  return (
    <section className="mc-island mc-appointments">
      <div className="mc-island__head">
        <h2>Запись на приём</h2>
      </div>

      <FormMessages
        hints={[
          'Можно записаться к любому узкому специалисту и к вашему закреплённому терапевту.',
        ]}
      />

      <FormMessages errors={[error]} />

      {initialLoading && <p className="mc-readonly-hint">Загрузка…</p>}

      {!initialLoading && !error && (
        <>
          {doctors.length === 0 && !doctorQ.trim() ? (
            <p className="mc-readonly-hint">
              Нет доступных врачей для записи. Назначьте терапевта в админке или дождитесь появления
              специалистов.
            </p>
          ) : (
            <form className="mc-form mc-form--inline" onSubmit={handleSubmit}>
              <label className="mc-field">
                <span className="mc-field__label">Поиск врача</span>
                <input
                  className="mc-field__input"
                  type="search"
                  value={doctorQ}
                  onChange={(e) => setDoctorQ(e.target.value)}
                  placeholder="ФИО, специальность…"
                />
              </label>
              <label className="mc-field">
                <span className="mc-field__label">Специалист</span>
                <select
                  className="mc-field__input"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  required
                  disabled={doctors.length === 0}
                >
                  {doctors.length === 0 ? (
                    <option value="">Не найдено</option>
                  ) : (
                    doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName}
                        {d.specialty ? ` — ${d.specialty}` : ''}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="mc-field">
                <span className="mc-field__label">Желаемая дата</span>
                <input
                  className="mc-field__input"
                  type="text"
                  placeholder={minDateHint}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  required
                />
              </label>
              <label className="mc-field mc-field--wide">
                <span className="mc-field__label">Комментарий</span>
                <input
                  className="mc-field__input"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Необязательно"
                />
              </label>
              <button
                type="submit"
                className="mc-btn mc-btn--primary"
                disabled={submitting || !doctorId}
              >
                {submitting ? 'Отправка…' : 'Записаться'}
              </button>
            </form>
          )}
          <FormMessages errors={[formError]} />

          <ListControls
            q={apptQ}
            onQChange={(value) => {
              setApptQ(value)
              setApptPage(1)
            }}
            pagination={apptPagination}
            onPageChange={setApptPage}
            placeholder="Поиск по врачу, дате, комментарию…"
          />

          <div className="mc-table-wrap mc-appointments__list">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Врач</th>
                  <th>Желаемая дата</th>
                  <th>Создана</th>
                  <th>Статус</th>
                  <th>Комментарий</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="mc-table__empty">
                      {apptQ.trim() ? 'Заявок не найдено' : 'Заявок пока нет'}
                    </td>
                  </tr>
                ) : (
                  appointments.map((a) => (
                    <tr key={a.id}>
                      <td>
                        {a.doctorName}
                        {a.doctorSpecialty ? ` (${a.doctorSpecialty})` : ''}
                      </td>
                      <td>{a.preferredDate}</td>
                      <td>{a.requestedAt}</td>
                      <td>
                        <span className={`mc-badge mc-badge--appt-${a.status}`}>
                          {appointmentStatusLabel[a.status]}
                        </span>
                      </td>
                      <td>{a.notes || '—'}</td>
                      <td>
                        {a.status === 'pending' && (
                          <button
                            type="button"
                            className="mc-btn mc-btn--ghost mc-btn--sm"
                            disabled={cancelId === a.id}
                            onClick={() => void handleCancel(a.id)}
                          >
                            Отменить
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
