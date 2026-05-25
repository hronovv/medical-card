import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { FormMessages } from '../components/FormMessages'
import { Layout } from '../components/Layout'
import { ListControls } from '../components/ListControls'
import { PatientCardView } from '../components/PatientCardView'
import { PasswordInput } from '../components/PasswordInput'
import { useErrorToast } from '../hooks/useErrorToast'
import { fetchDiseaseCatalog, type CatalogDisease } from '../api/catalog'
import {
  createAdminDoctor,
  createAdminPatient,
  createCatalogDisease,
  deleteCatalogDisease,
  deleteAdminDoctor,
  deleteAdminPatient,
  fetchAdminDashboard,
  updateAdminDoctor,
  updateAdminPatient,
  updateCatalogDisease,
  updatePatientAssignment,
  type AdminDashboard,
  type DoctorListItem,
} from '../api/admin'
import type { PatientListItem } from '../api/patient'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_LIST_LIMIT, type PaginationMeta } from '../types/pagination'
import {
  BIRTH_DATE_MIN_ISO,
  birthDateISOForApi,
  ddmmyyyyToISO,
  todayISO,
  validateBirthDateISO,
} from '../utils/date'
import { useToast } from '../context/ToastContext'

const emptyPagination = (page = 1, limit = DEFAULT_LIST_LIMIT): PaginationMeta => ({
  page,
  limit,
  total: 0,
  totalPages: 0,
})

function AdminFormPanel({
  title,
  children,
  onCancel,
  onSave,
  busy,
  saveLabel = 'Сохранить',
}: {
  title: string
  children: ReactNode
  onCancel: () => void
  onSave: () => void
  busy: boolean
  saveLabel?: string
}) {
  return (
    <div className="mc-disease-editor mc-island mc-island--nested">
      <h3 className="mc-disease-editor__title">{title}</h3>
      {children}
      <div className="mc-disease-editor__actions">
        <button
          type="button"
          className="mc-btn mc-btn--primary mc-btn--sm"
          disabled={busy}
          onClick={onSave}
        >
          {saveLabel}
        </button>
        <button
          type="button"
          className="mc-btn mc-btn--ghost mc-btn--sm"
          disabled={busy}
          onClick={onCancel}
        >
          Отмена
        </button>
      </div>
    </div>
  )
}

export function AdminPage() {
  const { user } = useAuth()
  const { pushError } = useToast()
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [catalog, setCatalog] = useState<CatalogDisease[]>([])
  const [catalogPagination, setCatalogPagination] = useState<PaginationMeta>(() => emptyPagination())
  const [patientsQ, setPatientsQ] = useState('')
  const [patientsPage, setPatientsPage] = useState(1)
  const [doctorsQ, setDoctorsQ] = useState('')
  const [doctorsPage, setDoctorsPage] = useState(1)
  const [catalogQ, setCatalogQ] = useState('')
  const [catalogPage, setCatalogPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [showAddPatient, setShowAddPatient] = useState(false)
  const [editPatientId, setEditPatientId] = useState<string | null>(null)
  const [showAddDoctor, setShowAddDoctor] = useState(false)
  const [editDoctorId, setEditDoctorId] = useState<string | null>(null)
  const [showAddCatalog, setShowAddCatalog] = useState(false)
  const [editCatalogId, setEditCatalogId] = useState<string | null>(null)
  const [cardPatientId, setCardPatientId] = useState<string | null>(null)
  const [cardPatientName, setCardPatientName] = useState('')

  const [pFullName, setPFullName] = useState('')
  const [pEmail, setPEmail] = useState('')
  const [pBirthDate, setPBirthDate] = useState('')
  const [pPhone, setPPhone] = useState('')
  const [pPassword, setPPassword] = useState('')
  const [pConfirm, setPConfirm] = useState('')

  const [dFullName, setDFullName] = useState('')
  const [dEmail, setDEmail] = useState('')
  const [dBirthDate, setDBirthDate] = useState('')
  const [dPhone, setDPhone] = useState('')
  const [dSpecialty, setDSpecialty] = useState('')
  const [dPassword, setDPassword] = useState('')
  const [dConfirm, setDConfirm] = useState('')

  const [catName, setCatName] = useState('')
  const [catCode, setCatCode] = useState('')

  const reload = useCallback(async () => {
    if (!user?.token) return
    const [dashboard, catalogRes] = await Promise.all([
      fetchAdminDashboard(user.token, {
        patientsQ,
        patientsPage,
        doctorsQ,
        doctorsPage,
      }),
      fetchDiseaseCatalog(user.token, { q: catalogQ, page: catalogPage, limit: DEFAULT_LIST_LIMIT }),
    ])
    setData(dashboard)
    setCatalog(catalogRes.diseases)
    setCatalogPagination(catalogRes.pagination)
  }, [user?.token, patientsQ, patientsPage, doctorsQ, doctorsPage, catalogQ, catalogPage])

  useEffect(() => {
    if (!user?.token) return
    let cancelled = false
    if (!hasLoadedRef.current) setLoading(true)
    reload()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Не удалось загрузить данные')
        }
      })
      .finally(() => {
        if (!cancelled) {
          hasLoadedRef.current = true
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [user?.token, reload])

  function clearPatientForm() {
    setShowAddPatient(false)
    setEditPatientId(null)
    setPFullName('')
    setPEmail('')
    setPBirthDate('')
    setPPhone('')
    setPPassword('')
    setPConfirm('')
  }

  function clearDoctorForm() {
    setShowAddDoctor(false)
    setEditDoctorId(null)
    setDFullName('')
    setDEmail('')
    setDBirthDate('')
    setDPhone('')
    setDSpecialty('')
    setDPassword('')
    setDConfirm('')
  }

  function clearCatalogForm() {
    setShowAddCatalog(false)
    setEditCatalogId(null)
    setCatName('')
    setCatCode('')
  }

  function startEditCatalog(row: CatalogDisease) {
    clearPatientForm()
    clearDoctorForm()
    setEditCatalogId(row.id)
    setCatName(row.name)
    setCatCode(row.code)
  }

  async function runAction(fn: () => Promise<void>) {
    setError(null)
    setBusy(true)
    try {
      await fn()
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка операции')
    } finally {
      setBusy(false)
    }
  }

  async function handleAssignmentChange(patientId: string, doctorId: string) {
    if (!user?.token || !data) return
    const nextDoctorId = doctorId === '' ? null : doctorId
    setAssigningId(patientId)
    setError(null)
    try {
      const result = await updatePatientAssignment(user.token, patientId, nextDoctorId)
      setData({
        ...data,
        patients: data.patients.map((p) =>
          p.id === patientId
            ? {
                ...p,
                assignedDoctorId: result.assignedDoctorId,
                assignedDoctorName: result.assignedDoctorName || undefined,
              }
            : p,
        ),
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось обновить привязку')
    } finally {
      setAssigningId(null)
    }
  }

  function startEditPatient(p: PatientListItem) {
    clearDoctorForm()
    clearCatalogForm()
    setEditPatientId(p.id)
    setPFullName(p.fullName)
    setPEmail(p.email ?? '')
    setPBirthDate(ddmmyyyyToISO(p.birthDate ?? ''))
    setPPhone(p.phone ?? '')
  }

  function startEditDoctor(d: DoctorListItem) {
    clearPatientForm()
    clearCatalogForm()
    setEditDoctorId(d.id)
    setDFullName(d.fullName)
    setDEmail(d.email)
    setDBirthDate(ddmmyyyyToISO(d.birthDate))
    setDPhone(d.phone)
    setDSpecialty(d.specialty)
  }

  function requireBirthDateISO(iso: string): string {
    const err = validateBirthDateISO(iso)
    if (err) {
      pushError(err)
      throw new ApiError(err, 400)
    }
    return birthDateISOForApi(iso)
  }

  useErrorToast(error && !data ? error : null)

  const therapistSelectWidthCh = useMemo(() => {
    const therapists = data?.therapists ?? []
    const labels = ['Не назначен', ...therapists.map((d) => d.fullName)]
    const longest = labels.reduce((max, label) => Math.max(max, label.length), 0)
    return longest + 4
  }, [data?.therapists])

  if (loading) {
    return (
      <Layout role="admin" title="Панель администратора">
        <p className="mc-readonly-hint">Загрузка…</p>
      </Layout>
    )
  }

  if (error && !data) {
    return (
      <Layout role="admin" title="Панель администратора">
        <p className="mc-readonly-hint">Не удалось загрузить панель. Обновите страницу.</p>
      </Layout>
    )
  }

  if (!data) {
    return (
      <Layout role="admin" title="Панель администратора">
        <p className="mc-readonly-hint">Нет данных</p>
      </Layout>
    )
  }

  if (cardPatientId) {
    return (
      <Layout role="admin" title={`Медкарта — ${cardPatientName}`}>
        <div className="mc-admin-card-view">
          <button
            type="button"
            className="mc-back mc-admin-card-view__back"
            onClick={() => {
              setError(null)
              setCardPatientId(null)
              setCardPatientName('')
            }}
          >
            ← К панели администратора
          </button>
          <PatientCardView key={cardPatientId} editable patientId={cardPatientId} />
        </div>
      </Layout>
    )
  }

  const therapists = data.therapists

  return (
    <Layout role="admin" title="Панель администратора">
      <FormMessages className="mc-page-messages" errors={[error]} />

      <div className="mc-admin-stats">
        <div className="mc-island mc-admin-stat">
          <div className="mc-admin-stat__value">{data.stats.patients}</div>
          <div className="mc-admin-stat__label">Пациентов</div>
        </div>
        <div className="mc-island mc-admin-stat">
          <div className="mc-admin-stat__value">{data.stats.doctors}</div>
          <div className="mc-admin-stat__label">Врачей</div>
        </div>
        <div className="mc-island mc-admin-stat">
          <div className="mc-admin-stat__value">{data.stats.diseaseCatalog}</div>
          <div className="mc-admin-stat__label">Болезней в справочнике</div>
        </div>
      </div>

      <div className="mc-admin-stack">
        <section className="mc-island">
          <div className="mc-island__head">
            <h2>Пациенты</h2>
            <button
              type="button"
              className="mc-btn mc-btn--primary"
              onClick={() => {
                clearPatientForm()
                clearDoctorForm()
                setShowAddPatient(true)
              }}
            >
              + Добавить пациента
            </button>
          </div>

          {showAddPatient && (
            <AdminFormPanel
              title="Новый пациент"
              busy={busy}
              onCancel={clearPatientForm}
              onSave={() =>
                void runAction(async () => {
                  if (!user?.token) return
                  if (pPassword !== pConfirm) throw new ApiError('Пароли не совпадают', 400)
                  await createAdminPatient(user.token, {
                    fullName: pFullName.trim(),
                    email: pEmail.trim(),
                    password: pPassword,
                    confirmPassword: pConfirm,
                    birthDate: requireBirthDateISO(pBirthDate),
                    phone: pPhone.trim(),
                  })
                  clearPatientForm()
                })
              }
            >
              <div className="mc-disease-editor__grid">
                <label className="mc-field">
                  <span className="mc-field__label">ФИО</span>
                  <input className="mc-field__input" value={pFullName} onChange={(e) => setPFullName(e.target.value)} />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Email</span>
                  <input className="mc-field__input" value={pEmail} onChange={(e) => setPEmail(e.target.value)} />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Дата рождения</span>
                  <input
                    className="mc-field__input"
                    type="date"
                    min={BIRTH_DATE_MIN_ISO}
                    max={todayISO()}
                    value={pBirthDate}
                    onChange={(e) => setPBirthDate(e.target.value)}
                    required
                  />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Телефон</span>
                  <input className="mc-field__input" value={pPhone} onChange={(e) => setPPhone(e.target.value)} />
                </label>
                <PasswordInput label="Пароль" value={pPassword} onChange={(e) => setPPassword(e.target.value)} />
                <PasswordInput label="Повтор пароля" value={pConfirm} onChange={(e) => setPConfirm(e.target.value)} />
              </div>
            </AdminFormPanel>
          )}

          {editPatientId && (
            <AdminFormPanel
              title="Изменить пациента"
              busy={busy}
              onCancel={clearPatientForm}
              onSave={() =>
                void runAction(async () => {
                  if (!user?.token || !editPatientId) return
                  await updateAdminPatient(user.token, editPatientId, {
                    fullName: pFullName.trim(),
                    email: pEmail.trim(),
                    birthDate: requireBirthDateISO(pBirthDate),
                    phone: pPhone.trim(),
                  })
                  clearPatientForm()
                })
              }
            >
              <div className="mc-disease-editor__grid">
                <label className="mc-field">
                  <span className="mc-field__label">ФИО</span>
                  <input className="mc-field__input" value={pFullName} onChange={(e) => setPFullName(e.target.value)} />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Email</span>
                  <input className="mc-field__input" value={pEmail} onChange={(e) => setPEmail(e.target.value)} />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Дата рождения</span>
                  <input
                    className="mc-field__input"
                    type="date"
                    min={BIRTH_DATE_MIN_ISO}
                    max={todayISO()}
                    value={pBirthDate}
                    onChange={(e) => setPBirthDate(e.target.value)}
                    required
                  />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Телефон</span>
                  <input className="mc-field__input" value={pPhone} onChange={(e) => setPPhone(e.target.value)} />
                </label>
              </div>
            </AdminFormPanel>
          )}

          <ListControls
            q={patientsQ}
            onQChange={(value) => {
              setPatientsQ(value)
              setPatientsPage(1)
            }}
            pagination={data.patientsPagination}
            onPageChange={setPatientsPage}
            placeholder="Поиск пациентов…"
          />

          <div className="mc-table-wrap">
            <table className="mc-table mc-table--patients">
              <colgroup>
                <col />
                <col className="mc-col-birth" />
                <col />
                <col className="mc-col-therapist" />
                <col className="mc-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Дата рождения</th>
                  <th>Email</th>
                  <th>Терапевт</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {data.patients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="mc-table__empty">
                      {patientsQ.trim() ? 'Пациентов не найдено' : 'Пациентов нет'}
                    </td>
                  </tr>
                ) : (
                  data.patients.map((p) => (
                    <tr key={p.id}>
                      <td>{p.fullName}</td>
                      <td>{p.birthDate}</td>
                      <td>{p.email}</td>
                      <td className="mc-table__cell--therapist">
                        <select
                          className="mc-field__input mc-table__therapist-select"
                          style={{ width: `${therapistSelectWidthCh}ch` }}
                          value={p.assignedDoctorId ?? ''}
                          disabled={assigningId === p.id || busy}
                          onChange={(e) => handleAssignmentChange(p.id, e.target.value)}
                        >
                          <option value="">Не назначен</option>
                          {therapists.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.fullName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="mc-actions">
                          <button
                            type="button"
                            className="mc-btn mc-btn--primary mc-btn--sm"
                            disabled={busy}
                            onClick={() => {
                              setError(null)
                              setCardPatientId(p.id)
                              setCardPatientName(p.fullName)
                            }}
                          >
                            Карта
                          </button>
                          <button
                            type="button"
                            className="mc-btn mc-btn--ghost mc-btn--sm"
                            disabled={busy}
                            onClick={() => startEditPatient(p)}
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="mc-btn mc-btn--danger mc-btn--sm"
                            disabled={busy}
                            onClick={() =>
                              void runAction(async () => {
                                if (!user?.token || !window.confirm(`Удалить пациента ${p.fullName}?`)) return
                                await deleteAdminPatient(user.token, p.id)
                              })
                            }
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mc-island">
          <div className="mc-island__head">
            <h2>Врачи</h2>
            <button
              type="button"
              className="mc-btn mc-btn--primary"
              onClick={() => {
                clearDoctorForm()
                clearPatientForm()
                setShowAddDoctor(true)
              }}
            >
              + Добавить врача
            </button>
          </div>

          {showAddDoctor && (
            <AdminFormPanel
              title="Новый врач"
              busy={busy}
              onCancel={clearDoctorForm}
              onSave={() =>
                void runAction(async () => {
                  if (!user?.token) return
                  if (dPassword !== dConfirm) throw new ApiError('Пароли не совпадают', 400)
                  await createAdminDoctor(user.token, {
                    fullName: dFullName.trim(),
                    email: dEmail.trim(),
                    password: dPassword,
                    confirmPassword: dConfirm,
                    birthDate: requireBirthDateISO(dBirthDate),
                    phone: dPhone.trim(),
                    specialty: dSpecialty.trim(),
                  })
                  clearDoctorForm()
                })
              }
            >
              <div className="mc-disease-editor__grid">
                <label className="mc-field">
                  <span className="mc-field__label">ФИО</span>
                  <input className="mc-field__input" value={dFullName} onChange={(e) => setDFullName(e.target.value)} />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Специальность</span>
                  <input className="mc-field__input" value={dSpecialty} onChange={(e) => setDSpecialty(e.target.value)} placeholder="Терапевт, Кардиолог…" />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Email</span>
                  <input className="mc-field__input" value={dEmail} onChange={(e) => setDEmail(e.target.value)} />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Дата рождения</span>
                  <input
                    className="mc-field__input"
                    type="date"
                    min={BIRTH_DATE_MIN_ISO}
                    max={todayISO()}
                    value={dBirthDate}
                    onChange={(e) => setDBirthDate(e.target.value)}
                    required
                  />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Телефон</span>
                  <input className="mc-field__input" value={dPhone} onChange={(e) => setDPhone(e.target.value)} />
                </label>
                <PasswordInput label="Пароль" value={dPassword} onChange={(e) => setDPassword(e.target.value)} />
                <PasswordInput label="Повтор пароля" value={dConfirm} onChange={(e) => setDConfirm(e.target.value)} />
              </div>
            </AdminFormPanel>
          )}

          {editDoctorId && (
            <AdminFormPanel
              title="Изменить врача"
              busy={busy}
              onCancel={clearDoctorForm}
              onSave={() =>
                void runAction(async () => {
                  if (!user?.token || !editDoctorId) return
                  await updateAdminDoctor(user.token, editDoctorId, {
                    fullName: dFullName.trim(),
                    email: dEmail.trim(),
                    birthDate: requireBirthDateISO(dBirthDate),
                    phone: dPhone.trim(),
                    specialty: dSpecialty.trim(),
                  })
                  clearDoctorForm()
                })
              }
            >
              <div className="mc-disease-editor__grid">
                <label className="mc-field">
                  <span className="mc-field__label">ФИО</span>
                  <input className="mc-field__input" value={dFullName} onChange={(e) => setDFullName(e.target.value)} />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Специальность</span>
                  <input className="mc-field__input" value={dSpecialty} onChange={(e) => setDSpecialty(e.target.value)} />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Email</span>
                  <input className="mc-field__input" value={dEmail} onChange={(e) => setDEmail(e.target.value)} />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Дата рождения</span>
                  <input
                    className="mc-field__input"
                    type="date"
                    min={BIRTH_DATE_MIN_ISO}
                    max={todayISO()}
                    value={dBirthDate}
                    onChange={(e) => setDBirthDate(e.target.value)}
                    required
                  />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Телефон</span>
                  <input className="mc-field__input" value={dPhone} onChange={(e) => setDPhone(e.target.value)} />
                </label>
              </div>
            </AdminFormPanel>
          )}

          <ListControls
            q={doctorsQ}
            onQChange={(value) => {
              setDoctorsQ(value)
              setDoctorsPage(1)
            }}
            pagination={data.doctorsPagination}
            onPageChange={setDoctorsPage}
            placeholder="Поиск врачей…"
          />

          <div className="mc-table-wrap">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Специальность</th>
                  <th>Email</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {data.doctors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="mc-table__empty">
                      {doctorsQ.trim() ? 'Врачей не найдено' : 'Врачей нет'}
                    </td>
                  </tr>
                ) : (
                  data.doctors.map((d) => (
                    <tr key={d.id}>
                      <td>{d.fullName}</td>
                      <td>{d.specialty}</td>
                      <td>{d.email}</td>
                      <td>
                        <div className="mc-actions">
                          <button
                            type="button"
                            className="mc-btn mc-btn--ghost mc-btn--sm"
                            disabled={busy}
                            onClick={() => startEditDoctor(d)}
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="mc-btn mc-btn--danger mc-btn--sm"
                            disabled={busy}
                            onClick={() =>
                              void runAction(async () => {
                                if (!user?.token || !window.confirm(`Удалить врача ${d.fullName}?`)) return
                                await deleteAdminDoctor(user.token, d.id)
                              })
                            }
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mc-island">
          <div className="mc-island__head">
            <h2>Справочник болезней</h2>
            <button
              type="button"
              className="mc-btn mc-btn--primary"
              onClick={() => {
                clearCatalogForm()
                setShowAddCatalog(true)
              }}
            >
              + Болезнь
            </button>
          </div>

          {showAddCatalog && (
            <AdminFormPanel
              title="Новая запись МКБ"
              busy={busy}
              onCancel={clearCatalogForm}
              onSave={() =>
                void runAction(async () => {
                  if (!user?.token) return
                  await createCatalogDisease(user.token, {
                    name: catName.trim(),
                    code: catCode.trim(),
                  })
                  clearCatalogForm()
                })
              }
            >
              <div className="mc-disease-editor__grid">
                <label className="mc-field">
                  <span className="mc-field__label">Название</span>
                  <input className="mc-field__input" value={catName} onChange={(e) => setCatName(e.target.value)} />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Код МКБ</span>
                  <input className="mc-field__input" value={catCode} onChange={(e) => setCatCode(e.target.value)} placeholder="I10" />
                </label>
              </div>
            </AdminFormPanel>
          )}

          {editCatalogId && (
            <AdminFormPanel
              title="Изменить запись МКБ"
              busy={busy}
              onCancel={clearCatalogForm}
              onSave={() =>
                void runAction(async () => {
                  if (!user?.token || !editCatalogId) return
                  await updateCatalogDisease(user.token, editCatalogId, {
                    name: catName.trim(),
                    code: catCode.trim(),
                  })
                  clearCatalogForm()
                })
              }
            >
              <div className="mc-disease-editor__grid">
                <label className="mc-field">
                  <span className="mc-field__label">Название</span>
                  <input className="mc-field__input" value={catName} onChange={(e) => setCatName(e.target.value)} />
                </label>
                <label className="mc-field">
                  <span className="mc-field__label">Код МКБ</span>
                  <input className="mc-field__input" value={catCode} onChange={(e) => setCatCode(e.target.value)} placeholder="I10" />
                </label>
              </div>
            </AdminFormPanel>
          )}

          <ListControls
            q={catalogQ}
            onQChange={(value) => {
              setCatalogQ(value)
              setCatalogPage(1)
            }}
            pagination={catalogPagination}
            onPageChange={setCatalogPage}
            placeholder="Поиск по коду или названию…"
          />

          <div className="mc-table-wrap">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Название</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {catalog.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="mc-table__empty">
                      {catalogQ.trim() ? 'Записей не найдено' : 'Справочник пуст'}
                    </td>
                  </tr>
                ) : (
                  catalog.map((row) => (
                    <tr key={row.id}>
                      <td>{row.code}</td>
                      <td>{row.name}</td>
                      <td>
                        <div className="mc-actions">
                          <button
                            type="button"
                            className="mc-btn mc-btn--ghost mc-btn--sm"
                            disabled={busy}
                            onClick={() => startEditCatalog(row)}
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="mc-btn mc-btn--danger mc-btn--sm"
                            disabled={busy}
                            onClick={() =>
                              void runAction(async () => {
                                if (!user?.token) return
                                const msg =
                                  `Удалить «${row.code} — ${row.name}» из справочника?\n\n` +
                                  'Все диагнозы пациентов, связанные с этой записью, тоже будут удалены.'
                                if (!window.confirm(msg)) return
                                await deleteCatalogDisease(user.token, row.id)
                              })
                            }
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  )
}
