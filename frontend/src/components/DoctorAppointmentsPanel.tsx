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
import { Modal } from '../components/Modal'
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
  const [modalError, setModalError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [approveTarget, setApproveTarget] = useState<Appointment | null>(null)
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
    setApproveTarget(null)
  }, [filter])

  function openApproveModal(appointment: Appointment) {
    setModalError(null)
    setApproveTarget(appointment)
    setApproveDates((prev) => ({
      ...prev,
      [appointment.id]: prev[appointment.id] || appointment.preferredDate,
    }))
  }

  function closeApproveModal() {
    if (actionId) return
    setModalError(null)
    setApproveTarget(null)
  }

  async function handleApprove() {
    if (!user?.token || !approveTarget) return
    const id = approveTarget.id
    const preferredDate = approveTarget.preferredDate
    const visitDate = approveDates[id] || preferredDate
    const dateErr = validateAppointmentDate(visitDate)
    if (dateErr) {
      setModalError(dateErr)
      return
    }
    setActionId(id)
    setModalError(null)
    try {
      await approveAppointment(user.token, id, {
        visitDate,
        notes: approveNotes[id]?.trim() || undefined,
      })
      setApproveTarget(null)
      await load()
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Не удалось принять заявку')
    } finally {
      setActionId(null)
    }
  }

  async function handleReject(id: string) {
    if (!user?.token) return
    if (!window.confirm('Отклонить заявку на приём?')) return
    setActionId(id)
    setApproveTarget(null)
    try {
      await rejectAppointment(user.token, id)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отклонить заявку')
    } finally {
      setActionId(null)
    }
  }

  const modalBusy = approveTarget ? actionId === approveTarget.id : false

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

      {!initialLoading && appointments.length > 0 && (
        <div className="mc-table-wrap">
          <table className="mc-table mc-table--appointments">
            <thead>
              <tr>
                <th>Пациент</th>
                <th>Желаемая дата</th>
                <th>Создана</th>
                <th>Статус</th>
                <th>Комментарий</th>
                {filter === 'pending' && <th className="mc-col-actions">Действия</th>}
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
                          <button
                            type="button"
                            className="mc-btn mc-btn--primary mc-btn--sm"
                            disabled={actionId === a.id}
                            onClick={() => openApproveModal(a)}
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

      <Modal
        open={approveTarget !== null}
        title="Подтверждение приёма"
        onClose={closeApproveModal}
      >
        {approveTarget && (
          <>
            <div className="mc-modal-meta">
              <p className="mc-modal-meta__row">
                <span>Пациент</span>
                <strong>{approveTarget.patientName}</strong>
              </p>
              <p className="mc-modal-meta__row">
                <span>Желаемая дата</span>
                <strong>{approveTarget.preferredDate}</strong>
              </p>
              {approveTarget.notes && (
                <p className="mc-modal-meta__comment">{approveTarget.notes}</p>
              )}
            </div>

            <FormMessages
              errors={[modalError]}
              suppressToast
              className="mc-form-messages--modal"
            />

            <div className="mc-modal-form">
              <label className="mc-field">
                <span className="mc-field__label">Дата приёма</span>
                <input
                  className="mc-field__input"
                  type="text"
                  placeholder="ДД.ММ.ГГГГ"
                  value={approveDates[approveTarget.id] ?? approveTarget.preferredDate}
                  onChange={(e) => {
                    setModalError(null)
                    setApproveDates((prev) => ({ ...prev, [approveTarget.id]: e.target.value }))
                  }}
                />
              </label>
              <label className="mc-field">
                <span className="mc-field__label">Заметки к визиту</span>
                <input
                  className="mc-field__input"
                  type="text"
                  placeholder="Необязательно"
                  value={approveNotes[approveTarget.id] ?? ''}
                  onChange={(e) =>
                    setApproveNotes((prev) => ({ ...prev, [approveTarget.id]: e.target.value }))
                  }
                />
              </label>
            </div>

            <div className="mc-modal__actions">
              <button
                type="button"
                className="mc-btn mc-btn--primary"
                disabled={modalBusy}
                onClick={() => void handleApprove()}
              >
                {modalBusy ? 'Сохранение…' : 'Подтвердить приём'}
              </button>
              <button
                type="button"
                className="mc-btn mc-btn--ghost"
                disabled={modalBusy}
                onClick={closeApproveModal}
              >
                Отмена
              </button>
            </div>
          </>
        )}
      </Modal>
    </section>
  )
}
