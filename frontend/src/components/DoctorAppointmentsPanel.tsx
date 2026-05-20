import { useCallback, useEffect, useState } from 'react'
import {
  approveAppointment,
  appointmentStatusLabel,
  fetchAppointments,
  rejectAppointment,
  type Appointment,
} from '../api/appointments'
import { ApiError } from '../api/client'
import { FormMessages } from '../components/FormMessages'
import { ListControls } from '../components/ListControls'
import { useAuth } from '../context/AuthContext'
import { validateAppointmentDate } from '../utils/date'
import { DEFAULT_LIST_LIMIT, type PaginationMeta } from '../types/pagination'

type Filter = 'pending' | 'all'

const emptyPagination = (page = 1, limit = DEFAULT_LIST_LIMIT): PaginationMeta => ({
  page,
  limit,
  total: 0,
  totalPages: 0,
})

export function DoctorAppointmentsPanel() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<Filter>('pending')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(() => emptyPagination())
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [approveNotes, setApproveNotes] = useState<Record<string, string>>({})
  const [approveDates, setApproveDates] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!user?.token) return
    setError(null)
    try {
      const res = await fetchAppointments(user.token, {
        status: filter === 'pending' ? 'pending' : undefined,
        q,
        page,
        limit: DEFAULT_LIST_LIMIT,
      })
      setAppointments(res.appointments)
      setPagination(res.pagination)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить заявки')
    } finally {
      setInitialLoading(false)
    }
  }, [user?.token, filter, q, page])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [filter])

  async function handleApprove(id: string, preferredDate: string) {
    if (!user?.token) return
    const visitDate = approveDates[id] || preferredDate
    const dateErr = validateAppointmentDate(visitDate)
    if (dateErr) {
      setError(dateErr)
      return
    }
    setActionId(id)
    setError(null)
    try {
      await approveAppointment(user.token, id, {
        visitDate,
        notes: approveNotes[id]?.trim() || undefined,
      })
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось принять заявку')
    } finally {
      setActionId(null)
    }
  }

  async function handleReject(id: string) {
    if (!user?.token) return
    setActionId(id)
    try {
      await rejectAppointment(user.token, id)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отклонить заявку')
    } finally {
      setActionId(null)
    }
  }

  return (
    <section className="mc-island mc-appointments">
      <div className="mc-island__head">
        <h2>Записи на приём</h2>
        <div className="mc-tabs mc-tabs--inline">
          <button
            type="button"
            className={`mc-tab${filter === 'pending' ? ' mc-tab--active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Ожидающие
          </button>
          <button
            type="button"
            className={`mc-tab${filter === 'all' ? ' mc-tab--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Все
          </button>
        </div>
      </div>

      <ListControls
        q={q}
        onQChange={(value) => {
          setQ(value)
          setPage(1)
        }}
        pagination={pagination}
        onPageChange={setPage}
        placeholder="Поиск по пациенту, дате, комментарию…"
      />

      {initialLoading && <p className="mc-readonly-hint">Загрузка…</p>}
      <FormMessages errors={[error]} />

      {!initialLoading && !error && appointments.length === 0 && (
        <p className="mc-readonly-hint">
          {q.trim()
            ? 'Заявок не найдено.'
            : filter === 'pending'
              ? 'Нет ожидающих заявок.'
              : 'Заявок пока нет.'}
        </p>
      )}

      {!initialLoading && !error && appointments.length > 0 && (
        <div className="mc-table-wrap">
          <table className="mc-table">
            <thead>
              <tr>
                <th>Пациент</th>
                <th>Желаемая дата</th>
                <th>Создана</th>
                <th>Статус</th>
                <th>Комментарий</th>
                {filter === 'pending' && <th>Действия</th>}
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.patientName}</td>
                  <td>{a.preferredDate}</td>
                  <td>{a.requestedAt}</td>
                  <td>
                    <span className={`mc-badge mc-badge--appt-${a.status}`}>
                      {appointmentStatusLabel[a.status]}
                    </span>
                  </td>
                  <td>{a.notes || '—'}</td>
                  {filter === 'pending' && (
                    <td className="mc-table__actions">
                      {a.status === 'pending' ? (
                        <div className="mc-appt-actions">
                          <input
                            className="mc-field__input mc-field__input--sm"
                            type="text"
                            placeholder={a.preferredDate}
                            value={approveDates[a.id] ?? ''}
                            onChange={(e) =>
                              setApproveDates((prev) => ({ ...prev, [a.id]: e.target.value }))
                            }
                            title="Дата приёма (ДД.ММ.ГГГГ)"
                          />
                          <input
                            className="mc-field__input mc-field__input--sm"
                            type="text"
                            placeholder="Заметки"
                            value={approveNotes[a.id] ?? ''}
                            onChange={(e) =>
                              setApproveNotes((prev) => ({ ...prev, [a.id]: e.target.value }))
                            }
                          />
                          <button
                            type="button"
                            className="mc-btn mc-btn--primary mc-btn--sm"
                            disabled={actionId === a.id}
                            onClick={() => void handleApprove(a.id, a.preferredDate)}
                          >
                            Принять
                          </button>
                          <button
                            type="button"
                            className="mc-btn mc-btn--ghost mc-btn--sm"
                            disabled={actionId === a.id}
                            onClick={() => void handleReject(a.id)}
                          >
                            Отклонить
                          </button>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
