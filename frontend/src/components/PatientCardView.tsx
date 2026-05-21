import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createPatientAnalysis,
  createPatientPrescription,
  createPatientVisit,
  deletePatientAnalysis,
  deletePatientPrescription,
  deletePatientVisit,
  createPatientDisease,
  deletePatientDisease,
  fetchMyPatientCard,
  fetchPatientCard,
  type PatientAnalysis,
  type PatientCardData,
  type PatientDisease,
  type PatientPrescription,
  type PatientVisit,
  updatePatientAnalysis,
  updatePatientDisease,
  updatePatientPrescription,
  updatePatientVisit,
} from '../api/patient'
import { fetchDiseaseCatalog, type CatalogDisease } from '../api/catalog'
import { ApiError } from '../api/client'
import { ListControls } from './ListControls'
import { FormMessages } from './FormMessages'
import { useErrorToast } from '../hooks/useErrorToast'
import { useClientList } from '../hooks/useClientList'
import { useAuth } from '../context/AuthContext'

type Tab = 'overview' | 'diseases' | 'analyses' | 'visits' | 'prescriptions'

type PatientCardViewProps = {
  editable: boolean
  patientId?: string
}

/** Синхронно с doctorCanEditVisit на бэкенде. */
function canDoctorEditVisit(
  visit: PatientVisit,
  doctorId: string,
  assignedDoctorId: string | undefined | null,
): boolean {
  if (visit.conductingDoctorId) {
    return visit.conductingDoctorId === doctorId
  }
  return assignedDoctorId === doctorId
}

function TableSection({
  title,
  editable,
  addLabel,
  headers,
  isEmpty,
  emptyText,
  children,
  onAddClick,
  controls,
}: {
  title: string
  editable: boolean
  addLabel: string
  headers: ReactNode
  isEmpty: boolean
  emptyText: string
  children: ReactNode
  onAddClick?: () => void
  controls?: ReactNode
}) {
  return (
    <>
      <div className="mc-island__head">
        <h2>{title}</h2>
        {editable && (
          <button
            type="button"
            className="mc-btn mc-btn--primary"
            onClick={onAddClick}
            disabled={!onAddClick}
          >
            {addLabel}
          </button>
        )}
      </div>
      {controls}
      <div className="mc-table-wrap">
        <table className="mc-table">
          <thead>
            <tr>{headers}</tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={99} className="mc-table__empty">
                  {emptyText}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function PatientCardView({ editable, patientId }: PatientCardViewProps) {
  const { user, isBootstrapping } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [card, setCard] = useState<PatientCardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [catalog, setCatalog] = useState<CatalogDisease[] | null>(null)
  const [catalogErr, setCatalogErr] = useState<string | null>(null)
  const [catalogFilter, setCatalogFilter] = useState('')
  const [showAddDisease, setShowAddDisease] = useState(false)
  const [addCatalogId, setAddCatalogId] = useState('')
  const [addDiagnosedAt, setAddDiagnosedAt] = useState('')
  const [diseaseBusy, setDiseaseBusy] = useState(false)
  const [diseaseFormErr, setDiseaseFormErr] = useState<string | null>(null)
  const [editingDiseaseId, setEditingDiseaseId] = useState<string | null>(null)
  const [editCatalogId, setEditCatalogId] = useState('')
  const [editDiagnosedAt, setEditDiagnosedAt] = useState('')

  const [medErr, setMedErr] = useState<string | null>(null)
  const [medBusy, setMedBusy] = useState(false)

  const [showAddAnalysis, setShowAddAnalysis] = useState(false)
  const [editAnalysisId, setEditAnalysisId] = useState<string | null>(null)
  const [aType, setAType] = useState('')
  const [aResult, setAResult] = useState('')
  const [aDate, setADate] = useState('')

  const [showAddVisit, setShowAddVisit] = useState(false)
  const [editVisitId, setEditVisitId] = useState<string | null>(null)
  const [vDate, setVDate] = useState('')
  const [vNotes, setVNotes] = useState('')

  const [showAddRx, setShowAddRx] = useState(false)
  const [editRxId, setEditRxId] = useState<string | null>(null)
  const [rxDrug, setRxDrug] = useState('')
  const [rxDosage, setRxDosage] = useState('')
  const [rxDur, setRxDur] = useState('')
  const [rxVDate, setRxVDate] = useState('')

  const reloadCard = useCallback(async () => {
    if (!user?.token) return
    const load = patientId
      ? fetchPatientCard(user.token, patientId)
      : fetchMyPatientCard(user.token)
    const data = await load
    setCard(data)
  }, [user?.token, patientId])

  useEffect(() => {
    if (isBootstrapping) return

    if (!user?.token) {
      setError('Требуется вход в аккаунт')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const load = patientId
      ? fetchPatientCard(user.token, patientId)
      : fetchMyPatientCard(user.token)

    load
      .then((data) => {
        if (!cancelled) setCard(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Не удалось загрузить карту')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.token, patientId, isBootstrapping])

  useEffect(() => {
    if (!editable || tab !== 'diseases' || !user?.token || !patientId) return
    if (user.role !== 'doctor' && user.role !== 'admin') return

    let cancelled = false
    setCatalogErr(null)
    fetchDiseaseCatalog(user.token, { limit: 100 })
      .then((res) => {
        if (!cancelled) setCatalog(res.diseases)
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogErr(err instanceof ApiError ? err.message : 'Не удалось загрузить справочник')
        }
      })

    return () => {
      cancelled = true
    }
  }, [editable, tab, user?.token, user?.role, patientId])

  useEffect(() => {
    setMedErr(null)
  }, [tab])

  const diseasesList = useClientList(
    card?.diseases ?? [],
    (d) => `${d.name} ${d.code ?? ''} ${d.diagnosedAt ?? ''}`,
  )
  const analysesList = useClientList(
    card?.analyses ?? [],
    (a) => `${a.type} ${a.result} ${a.date}`,
  )
  const visitsList = useClientList(
    card?.visits ?? [],
    (v) => `${v.date} ${v.doctor} ${v.notes ?? ''}`,
  )
  const prescriptionsList = useClientList(
    card?.prescriptions ?? [],
    (p) => `${p.drug} ${p.dosage} ${p.duration ?? ''} ${p.visitDate ?? ''}`,
  )

  const filteredCatalog = useMemo(() => {
    if (!catalog) return []
    const needle = catalogFilter.trim().toLowerCase()
    if (!needle) return catalog
    return catalog.filter((row) => `${row.code} ${row.name}`.toLowerCase().includes(needle))
  }, [catalog, catalogFilter])

  const usedCatalogIds = useMemo(() => {
    const list = card?.diseases ?? []
    const ids = new Set(
      list.map((d) => d.catalogId).filter((id): id is string => Boolean(id)),
    )
    if (editingDiseaseId) {
      const current = list.find((d) => d.id === editingDiseaseId)
      if (current?.catalogId) ids.delete(current.catalogId)
    }
    return ids
  }, [card?.diseases, editingDiseaseId])

  const selectableCatalog = useMemo(
    () => filteredCatalog.filter((row) => !usedCatalogIds.has(row.id)),
    [filteredCatalog, usedCatalogIds],
  )

  const showAssignedTherapist =
    user?.role === 'patient' && !patientId

  useErrorToast(error)

  if (isBootstrapping || (loading && user?.token)) {
    return <p className="mc-readonly-hint">Загрузка карты…</p>
  }

  if (error || !card) {
    return <p className="mc-readonly-hint">{error ? 'Не удалось загрузить карту' : 'Нет данных'}</p>
  }

  const { profile, assignedDoctor, diseases, analyses, visits } = card

  const doctorId = user?.id ?? ''
  const isMedcardEditor =
    editable && !!patientId && (user?.role === 'doctor' || user?.role === 'admin')
  const canEditVisitRow = (v: PatientVisit) =>
    isMedcardEditor &&
    (user?.role === 'admin' || canDoctorEditVisit(v, doctorId, assignedDoctor?.id))
  const visitsShowActionsColumn =
    isMedcardEditor &&
    (user?.role === 'admin' ||
      visits.some((v) => canDoctorEditVisit(v, doctorId, assignedDoctor?.id)))

  async function handleCreateDisease() {
    if (!user?.token || !patientId) return
    setDiseaseFormErr(null)
    if (!addCatalogId) {
      setDiseaseFormErr('Выберите диагноз из справочника МКБ')
      return
    }
    if (usedCatalogIds.has(addCatalogId)) {
      setDiseaseFormErr('Этот диагноз уже есть в карте пациента')
      return
    }
    setDiseaseBusy(true)
    try {
      await createPatientDisease(user.token, patientId, {
        catalogId: addCatalogId,
        ...(addDiagnosedAt.trim() ? { diagnosedAt: addDiagnosedAt.trim() } : {}),
      })
      await reloadCard()
      setShowAddDisease(false)
      setAddCatalogId('')
      setAddDiagnosedAt('')
    } catch (err) {
      setDiseaseFormErr(err instanceof ApiError ? err.message : 'Не удалось сохранить')
    } finally {
      setDiseaseBusy(false)
    }
  }

  function startEditDisease(d: PatientDisease) {
    setEditingDiseaseId(d.id)
    setEditCatalogId(d.catalogId ?? '')
    setEditDiagnosedAt(d.diagnosedAt ?? '')
    setDiseaseFormErr(null)
    setShowAddDisease(false)
  }

  function cancelDiseaseEditor() {
    setEditingDiseaseId(null)
    setEditCatalogId('')
    setEditDiagnosedAt('')
    setDiseaseFormErr(null)
  }

  async function handleSaveEditDisease() {
    if (!user?.token || !patientId || !editingDiseaseId) return
    setDiseaseFormErr(null)
    if (!editCatalogId.trim() && editDiagnosedAt.trim() === '') {
      setDiseaseFormErr('Укажите дату постановки и/или выберите диагноз из справочника')
      return
    }
    const body: { catalogId?: string; diagnosedAt: string } = {
      diagnosedAt: editDiagnosedAt.trim(),
    }
    if (editCatalogId.trim()) {
      if (usedCatalogIds.has(editCatalogId.trim())) {
        setDiseaseFormErr('Этот диагноз уже есть в карте пациента')
        return
      }
      body.catalogId = editCatalogId.trim()
    }
    setDiseaseBusy(true)
    try {
      await updatePatientDisease(user.token, patientId, editingDiseaseId, body)
      await reloadCard()
      cancelDiseaseEditor()
    } catch (err) {
      setDiseaseFormErr(err instanceof ApiError ? err.message : 'Не удалось сохранить')
    } finally {
      setDiseaseBusy(false)
    }
  }

  async function handleDeleteDisease(diseaseId: string) {
    if (!user?.token || !patientId) return
    if (!window.confirm('Удалить запись о диагнозе?')) return
    setDiseaseFormErr(null)
    setDiseaseBusy(true)
    try {
      await deletePatientDisease(user.token, patientId, diseaseId)
      await reloadCard()
      if (editingDiseaseId === diseaseId) cancelDiseaseEditor()
    } catch (err) {
      setDiseaseFormErr(err instanceof ApiError ? err.message : 'Не удалось удалить')
    } finally {
      setDiseaseBusy(false)
    }
  }

  function clearMedEditors() {
    setMedErr(null)
    setShowAddAnalysis(false)
    setEditAnalysisId(null)
    setAType('')
    setAResult('')
    setADate('')
    setShowAddVisit(false)
    setEditVisitId(null)
    setVDate('')
    setVNotes('')
    setShowAddRx(false)
    setEditRxId(null)
    setRxDrug('')
    setRxDosage('')
    setRxDur('')
    setRxVDate('')
  }

  async function runMed(
    fn: () => Promise<void>,
  ) {
    setMedErr(null)
    setMedBusy(true)
    try {
      await fn()
      await reloadCard()
    } catch (err) {
      setMedErr(err instanceof ApiError ? err.message : 'Ошибка сохранения')
    } finally {
      setMedBusy(false)
    }
  }

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
          <h1>{profile.fullName}</h1>
          <p className="mc-patient-meta">
            Дата рождения: {profile.birthDate} · {profile.phone}
          </p>
        </div>
      </section>

      {showAssignedTherapist &&
        (assignedDoctor ? (
          <section className="mc-island mc-assigned-doctor" aria-label="Закреплённый терапевт">
            <div className="mc-assigned-doctor__badge">Ваш терапевт</div>
            <div className="mc-assigned-doctor__body">
              <h2 className="mc-assigned-doctor__name">{assignedDoctor.fullName}</h2>
              <p className="mc-assigned-doctor__specialty">{assignedDoctor.specialty}</p>
              <p className="mc-assigned-doctor__contacts">
                {assignedDoctor.phone} · {assignedDoctor.email}
              </p>
            </div>
          </section>
        ) : (
          <section className="mc-island mc-assigned-doctor mc-assigned-doctor--empty">
            <p className="mc-readonly-hint">
              Терапевт не назначен. Обратитесь к администратору клиники.
            </p>
          </section>
        ))}

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
                {visits[0]
                  ? `${visits[0].date}, ${visits[0].doctor}`
                  : 'Пока нет визитов'}
              </p>
            </div>
            <div className="mc-stat-card">
              <h3>Активные болезни</h3>
              <p>
                {diseases.length > 0 ? `${diseases.length} записей` : 'Нет записей'}
              </p>
            </div>
            <div className="mc-stat-card">
              <h3>Последний анализ</h3>
              <p>
                {analyses[0]
                  ? `${analyses[0].type} — ${analyses[0].date}`
                  : 'Пока нет анализов'}
              </p>
            </div>
          </div>
        )}

        {tab === 'diseases' && (
          <>
            {isMedcardEditor && (
              <>
                <FormMessages errors={[catalogErr, diseaseFormErr]} />
                {showAddDisease && (
                  <div className="mc-disease-editor mc-island mc-island--nested">
                    <h3 className="mc-disease-editor__title">Новый диагноз</h3>
                    <div className="mc-disease-editor__grid">
                      <label className="mc-field">
                        <span className="mc-field__label">Поиск в справочнике</span>
                        <input
                          className="mc-field__input"
                          type="search"
                          value={catalogFilter}
                          onChange={(e) => setCatalogFilter(e.target.value)}
                          placeholder="Код или название…"
                          disabled={diseaseBusy}
                        />
                      </label>
                      <label className="mc-field">
                        <span className="mc-field__label">Из справочника МКБ</span>
                        <select
                          className="mc-field__input"
                          value={addCatalogId}
                          onChange={(e) => setAddCatalogId(e.target.value)}
                          disabled={diseaseBusy || selectableCatalog.length === 0}
                        >
                          <option value="">
                            {selectableCatalog.length === 0 ? 'Все диагнозы уже добавлены' : 'Выберите…'}
                          </option>
                          {selectableCatalog.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.code} — {row.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="mc-field">
                        <span className="mc-field__label">Дата постановки (ДД.ММ.ГГГГ)</span>
                        <input
                          className="mc-field__input"
                          value={addDiagnosedAt}
                          onChange={(e) => setAddDiagnosedAt(e.target.value)}
                          placeholder="например, 15.03.2024"
                          disabled={diseaseBusy}
                        />
                      </label>
                    </div>
                    <div className="mc-disease-editor__actions">
                      <button
                        type="button"
                        className="mc-btn mc-btn--primary mc-btn--sm"
                        disabled={diseaseBusy}
                        onClick={() => void handleCreateDisease()}
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className="mc-btn mc-btn--ghost mc-btn--sm"
                        disabled={diseaseBusy}
                        onClick={() => {
                          setShowAddDisease(false)
                          setAddCatalogId('')
                          setAddDiagnosedAt('')
                          setDiseaseFormErr(null)
                        }}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
                {editingDiseaseId && (
                  <div className="mc-disease-editor mc-island mc-island--nested">
                    <h3 className="mc-disease-editor__title">Изменить диагноз</h3>
                    <div className="mc-disease-editor__grid">
                      <label className="mc-field">
                        <span className="mc-field__label">Поиск в справочнике</span>
                        <input
                          className="mc-field__input"
                          type="search"
                          value={catalogFilter}
                          onChange={(e) => setCatalogFilter(e.target.value)}
                          placeholder="Код или название…"
                          disabled={diseaseBusy}
                        />
                      </label>
                      <label className="mc-field">
                        <span className="mc-field__label">Из справочника МКБ</span>
                        <select
                          className="mc-field__input"
                          value={editCatalogId}
                          onChange={(e) => setEditCatalogId(e.target.value)}
                          disabled={diseaseBusy || selectableCatalog.length === 0}
                        >
                          <option value="">Без смены справочника</option>
                          {selectableCatalog.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.code} — {row.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="mc-field">
                        <span className="mc-field__label">Дата постановки (ДД.ММ.ГГГГ)</span>
                        <input
                          className="mc-field__input"
                          value={editDiagnosedAt}
                          onChange={(e) => setEditDiagnosedAt(e.target.value)}
                          placeholder="оставьте пустым, чтобы сбросить дату"
                          disabled={diseaseBusy}
                        />
                      </label>
                    </div>
                    <div className="mc-disease-editor__actions">
                      <button
                        type="button"
                        className="mc-btn mc-btn--primary mc-btn--sm"
                        disabled={diseaseBusy}
                        onClick={() => void handleSaveEditDisease()}
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className="mc-btn mc-btn--ghost mc-btn--sm"
                        disabled={diseaseBusy}
                        onClick={cancelDiseaseEditor}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            <TableSection
              title="Болезни"
              editable={isMedcardEditor}
              addLabel="+ Добавить"
              onAddClick={() => {
                setDiseaseFormErr(null)
                setShowAddDisease(true)
                setEditingDiseaseId(null)
                setEditCatalogId('')
                setEditDiagnosedAt('')
              }}
              isEmpty={diseasesList.totalFiltered === 0}
              emptyText={diseasesList.q.trim() ? 'Записей не найдено' : 'Записей пока нет'}
              controls={
                <ListControls
                  q={diseasesList.q}
                  onQChange={diseasesList.setQ}
                  pagination={diseasesList.pagination}
                  onPageChange={diseasesList.setPage}
                  placeholder="Поиск по названию, коду…"
                />
              }
              headers={
                <>
                  <th>Название</th>
                  <th>Код МКБ</th>
                  <th>Дата постановки</th>
                  {isMedcardEditor && <th>Действия</th>}
                </>
              }
            >
              {diseasesList.items.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.code}</td>
                  <td>{d.diagnosedAt ?? '—'}</td>
                  {isMedcardEditor && (
                    <td>
                      <div className="mc-actions">
                        <button
                          type="button"
                          className="mc-btn mc-btn--ghost mc-btn--sm"
                          disabled={diseaseBusy}
                          onClick={() => startEditDisease(d)}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          className="mc-btn mc-btn--danger mc-btn--sm"
                          disabled={diseaseBusy}
                          onClick={() => void handleDeleteDisease(d.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </TableSection>
          </>
        )}

        {tab === 'analyses' && (
          <>
            {isMedcardEditor && (
              <>
                <FormMessages errors={[medErr]} />
                {showAddAnalysis && (
                  <div className="mc-disease-editor mc-island mc-island--nested">
                    <h3 className="mc-disease-editor__title">Новый анализ</h3>
                    <div className="mc-disease-editor__grid">
                      <label className="mc-field">
                        <span className="mc-field__label">Тип</span>
                        <input
                          className="mc-field__input"
                          value={aType}
                          onChange={(e) => setAType(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                      <label className="mc-field">
                        <span className="mc-field__label">Дата (ДД.ММ.ГГГГ)</span>
                        <input
                          className="mc-field__input"
                          value={aDate}
                          onChange={(e) => setADate(e.target.value)}
                          disabled={medBusy}
                          placeholder="10.05.2026"
                        />
                      </label>
                      <label className="mc-field" style={{ gridColumn: '1 / -1' }}>
                        <span className="mc-field__label">Результат</span>
                        <input
                          className="mc-field__input"
                          value={aResult}
                          onChange={(e) => setAResult(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                    </div>
                    <div className="mc-disease-editor__actions">
                      <button
                        type="button"
                        className="mc-btn mc-btn--primary mc-btn--sm"
                        disabled={medBusy}
                        onClick={() =>
                          void runMed(async () => {
                            if (!user.token || !patientId) return
                            await createPatientAnalysis(user.token, patientId, {
                              type: aType.trim(),
                              result: aResult.trim(),
                              date: aDate.trim(),
                            })
                            clearMedEditors()
                          })
                        }
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className="mc-btn mc-btn--ghost mc-btn--sm"
                        disabled={medBusy}
                        onClick={clearMedEditors}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
                {editAnalysisId && (
                  <div className="mc-disease-editor mc-island mc-island--nested">
                    <h3 className="mc-disease-editor__title">Изменить анализ</h3>
                    <div className="mc-disease-editor__grid">
                      <label className="mc-field">
                        <span className="mc-field__label">Тип</span>
                        <input
                          className="mc-field__input"
                          value={aType}
                          onChange={(e) => setAType(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                      <label className="mc-field">
                        <span className="mc-field__label">Дата</span>
                        <input
                          className="mc-field__input"
                          value={aDate}
                          onChange={(e) => setADate(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                      <label className="mc-field" style={{ gridColumn: '1 / -1' }}>
                        <span className="mc-field__label">Результат</span>
                        <input
                          className="mc-field__input"
                          value={aResult}
                          onChange={(e) => setAResult(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                    </div>
                    <div className="mc-disease-editor__actions">
                      <button
                        type="button"
                        className="mc-btn mc-btn--primary mc-btn--sm"
                        disabled={medBusy}
                        onClick={() =>
                          void runMed(async () => {
                            if (!user.token || !patientId || !editAnalysisId) return
                            await updatePatientAnalysis(user.token, patientId, editAnalysisId, {
                              type: aType.trim(),
                              result: aResult.trim(),
                              date: aDate.trim(),
                            })
                            clearMedEditors()
                          })
                        }
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className="mc-btn mc-btn--ghost mc-btn--sm"
                        disabled={medBusy}
                        onClick={clearMedEditors}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            <TableSection
              title="Анализы"
              editable={isMedcardEditor}
              addLabel="+ Добавить"
              onAddClick={() => {
                clearMedEditors()
                setShowAddAnalysis(true)
              }}
              isEmpty={analysesList.totalFiltered === 0}
              emptyText={analysesList.q.trim() ? 'Записей не найдено' : 'Анализов пока нет'}
              controls={
                <ListControls
                  q={analysesList.q}
                  onQChange={analysesList.setQ}
                  pagination={analysesList.pagination}
                  onPageChange={analysesList.setPage}
                  placeholder="Поиск по типу, результату…"
                />
              }
              headers={
                <>
                  <th>Дата</th>
                  <th>Тип</th>
                  <th>Результат</th>
                  {isMedcardEditor && <th>Действия</th>}
                </>
              }
            >
              {analysesList.items.map((a: PatientAnalysis) => (
                <tr key={a.id}>
                  <td>{a.date}</td>
                  <td>{a.type}</td>
                  <td>{a.result}</td>
                  {isMedcardEditor && (
                    <td>
                      <div className="mc-actions">
                        <button
                          type="button"
                          className="mc-btn mc-btn--ghost mc-btn--sm"
                          disabled={medBusy}
                          onClick={() => {
                            clearMedEditors()
                            setEditAnalysisId(a.id)
                            setAType(a.type)
                            setAResult(a.result)
                            setADate(a.date)
                          }}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          className="mc-btn mc-btn--danger mc-btn--sm"
                          disabled={medBusy}
                          onClick={() =>
                            void runMed(async () => {
                              if (!user?.token || !patientId || !window.confirm('Удалить запись?'))
                                return
                              await deletePatientAnalysis(user.token, patientId, a.id)
                            })
                          }
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </TableSection>
          </>
        )}

        {tab === 'visits' && (
          <>
            {isMedcardEditor && (
              <>
                <FormMessages errors={[medErr]} />
                {showAddVisit && (
                  <div className="mc-disease-editor mc-island mc-island--nested">
                    <h3 className="mc-disease-editor__title">Новый визит</h3>
                    <p className="mc-readonly-hint">
                      {user?.role === 'admin'
                        ? 'Если у пациента назначен терапевт, визит будет записан на него. Иначе — от имени администратора.'
                        : 'Визит будет записан на вас как на принимающего врача.'}
                    </p>
                    <div className="mc-disease-editor__grid">
                      <label className="mc-field">
                        <span className="mc-field__label">Дата приёма (ДД.ММ.ГГГГ)</span>
                        <input
                          className="mc-field__input"
                          value={vDate}
                          onChange={(e) => setVDate(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                      <label className="mc-field" style={{ gridColumn: '1 / -1' }}>
                        <span className="mc-field__label">Заметки</span>
                        <input
                          className="mc-field__input"
                          value={vNotes}
                          onChange={(e) => setVNotes(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                    </div>
                    <div className="mc-disease-editor__actions">
                      <button
                        type="button"
                        className="mc-btn mc-btn--primary mc-btn--sm"
                        disabled={medBusy}
                        onClick={() =>
                          void runMed(async () => {
                            if (!user.token || !patientId) return
                            await createPatientVisit(user.token, patientId, {
                              date: vDate.trim(),
                              notes: vNotes.trim() || undefined,
                            })
                            clearMedEditors()
                          })
                        }
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className="mc-btn mc-btn--ghost mc-btn--sm"
                        disabled={medBusy}
                        onClick={clearMedEditors}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
                {editVisitId && (
                  <div className="mc-disease-editor mc-island mc-island--nested">
                    <h3 className="mc-disease-editor__title">Изменить визит</h3>
                    {user?.role === 'doctor' && (
                      <p className="mc-readonly-hint">
                        Можно править только визиты, где вы указаны как принимающий врач (или старые записи
                        терапевта по закреплённым пациентам).
                      </p>
                    )}
                    <div className="mc-disease-editor__grid">
                      <label className="mc-field">
                        <span className="mc-field__label">Дата</span>
                        <input
                          className="mc-field__input"
                          value={vDate}
                          onChange={(e) => setVDate(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                      <label className="mc-field" style={{ gridColumn: '1 / -1' }}>
                        <span className="mc-field__label">Заметки</span>
                        <input
                          className="mc-field__input"
                          value={vNotes}
                          onChange={(e) => setVNotes(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                    </div>
                    <div className="mc-disease-editor__actions">
                      <button
                        type="button"
                        className="mc-btn mc-btn--primary mc-btn--sm"
                        disabled={medBusy}
                        onClick={() =>
                          void runMed(async () => {
                            if (!user.token || !patientId || !editVisitId) return
                            await updatePatientVisit(user.token, patientId, editVisitId, {
                              date: vDate.trim(),
                              notes: vNotes,
                            })
                            clearMedEditors()
                          })
                        }
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className="mc-btn mc-btn--ghost mc-btn--sm"
                        disabled={medBusy}
                        onClick={clearMedEditors}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            <TableSection
              title="Посещения"
              editable={isMedcardEditor}
              addLabel="+ Новый визит"
              onAddClick={() => {
                clearMedEditors()
                setShowAddVisit(true)
              }}
              isEmpty={visitsList.totalFiltered === 0}
              emptyText={visitsList.q.trim() ? 'Записей не найдено' : 'Посещений пока нет'}
              controls={
                <ListControls
                  q={visitsList.q}
                  onQChange={visitsList.setQ}
                  pagination={visitsList.pagination}
                  onPageChange={visitsList.setPage}
                  placeholder="Поиск по дате, врачу…"
                />
              }
              headers={
                <>
                  <th>Дата</th>
                  <th>Врач</th>
                  <th>Заметки</th>
                  {visitsShowActionsColumn && <th>Действия</th>}
                </>
              }
            >
              {visitsList.items.map((v: PatientVisit) => (
                <tr key={v.id}>
                  <td>{v.date}</td>
                  <td>{v.doctor}</td>
                  <td>{v.notes}</td>
                  {visitsShowActionsColumn && (
                    <td>
                      {canEditVisitRow(v) && (
                        <div className="mc-actions">
                          <button
                            type="button"
                            className="mc-btn mc-btn--ghost mc-btn--sm"
                            disabled={medBusy}
                            onClick={() => {
                              clearMedEditors()
                              setEditVisitId(v.id)
                              setVDate(v.date)
                              setVNotes(v.notes ?? '')
                            }}
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="mc-btn mc-btn--danger mc-btn--sm"
                            disabled={medBusy}
                            onClick={() =>
                              void runMed(async () => {
                                if (!user?.token || !patientId || !window.confirm('Удалить визит?'))
                                  return
                                await deletePatientVisit(user.token, patientId, v.id)
                              })
                            }
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </TableSection>
          </>
        )}

        {tab === 'prescriptions' && (
          <>
            {isMedcardEditor && (
              <>
                <FormMessages errors={[medErr]} />
                {showAddRx && (
                  <div className="mc-disease-editor mc-island mc-island--nested">
                    <h3 className="mc-disease-editor__title">Новый рецепт</h3>
                    <div className="mc-disease-editor__grid">
                      <label className="mc-field">
                        <span className="mc-field__label">Препарат</span>
                        <input
                          className="mc-field__input"
                          value={rxDrug}
                          onChange={(e) => setRxDrug(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                      <label className="mc-field">
                        <span className="mc-field__label">Дозировка</span>
                        <input
                          className="mc-field__input"
                          value={rxDosage}
                          onChange={(e) => setRxDosage(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                      <label className="mc-field">
                        <span className="mc-field__label">Срок / курс</span>
                        <input
                          className="mc-field__input"
                          value={rxDur}
                          onChange={(e) => setRxDur(e.target.value)}
                          disabled={medBusy}
                          placeholder="необязательно"
                        />
                      </label>
                      <label className="mc-field">
                        <span className="mc-field__label">Дата визита (ДД.ММ.ГГГГ)</span>
                        <input
                          className="mc-field__input"
                          value={rxVDate}
                          onChange={(e) => setRxVDate(e.target.value)}
                          disabled={medBusy}
                          placeholder="необязательно"
                        />
                      </label>
                    </div>
                    <div className="mc-disease-editor__actions">
                      <button
                        type="button"
                        className="mc-btn mc-btn--primary mc-btn--sm"
                        disabled={medBusy}
                        onClick={() =>
                          void runMed(async () => {
                            if (!user.token || !patientId) return
                            await createPatientPrescription(user.token, patientId, {
                              drug: rxDrug.trim(),
                              dosage: rxDosage.trim(),
                              duration: rxDur.trim() || undefined,
                              visitDate: rxVDate.trim() || undefined,
                            })
                            clearMedEditors()
                          })
                        }
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className="mc-btn mc-btn--ghost mc-btn--sm"
                        disabled={medBusy}
                        onClick={clearMedEditors}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
                {editRxId && (
                  <div className="mc-disease-editor mc-island mc-island--nested">
                    <h3 className="mc-disease-editor__title">Изменить рецепт</h3>
                    <div className="mc-disease-editor__grid">
                      <label className="mc-field">
                        <span className="mc-field__label">Препарат</span>
                        <input
                          className="mc-field__input"
                          value={rxDrug}
                          onChange={(e) => setRxDrug(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                      <label className="mc-field">
                        <span className="mc-field__label">Дозировка</span>
                        <input
                          className="mc-field__input"
                          value={rxDosage}
                          onChange={(e) => setRxDosage(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                      <label className="mc-field">
                        <span className="mc-field__label">Срок</span>
                        <input
                          className="mc-field__input"
                          value={rxDur}
                          onChange={(e) => setRxDur(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                      <label className="mc-field">
                        <span className="mc-field__label">Дата визита (пусто — сброс)</span>
                        <input
                          className="mc-field__input"
                          value={rxVDate}
                          onChange={(e) => setRxVDate(e.target.value)}
                          disabled={medBusy}
                        />
                      </label>
                    </div>
                    <div className="mc-disease-editor__actions">
                      <button
                        type="button"
                        className="mc-btn mc-btn--primary mc-btn--sm"
                        disabled={medBusy}
                        onClick={() =>
                          void runMed(async () => {
                            if (!user.token || !patientId || !editRxId) return
                            await updatePatientPrescription(user.token, patientId, editRxId, {
                              drug: rxDrug.trim(),
                              dosage: rxDosage.trim(),
                              duration: rxDur.trim(),
                              visitDate: rxVDate.trim(),
                            })
                            clearMedEditors()
                          })
                        }
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        className="mc-btn mc-btn--ghost mc-btn--sm"
                        disabled={medBusy}
                        onClick={clearMedEditors}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            <TableSection
              title="Рецепты"
              editable={isMedcardEditor}
              addLabel="+ Рецепт"
              onAddClick={() => {
                clearMedEditors()
                setShowAddRx(true)
              }}
              isEmpty={prescriptionsList.totalFiltered === 0}
              emptyText={prescriptionsList.q.trim() ? 'Записей не найдено' : 'Рецептов пока нет'}
              controls={
                <ListControls
                  q={prescriptionsList.q}
                  onQChange={prescriptionsList.setQ}
                  pagination={prescriptionsList.pagination}
                  onPageChange={prescriptionsList.setPage}
                  placeholder="Поиск по препарату, дозировке…"
                />
              }
              headers={
                <>
                  <th>Визит</th>
                  <th>Препарат</th>
                  <th>Дозировка</th>
                  <th>Срок</th>
                  {isMedcardEditor && <th>Действия</th>}
                </>
              }
            >
              {prescriptionsList.items.map((p: PatientPrescription) => (
                <tr key={p.id}>
                  <td>{p.visitDate ?? '—'}</td>
                  <td>{p.drug}</td>
                  <td>{p.dosage}</td>
                  <td>{p.duration}</td>
                  {isMedcardEditor && (
                    <td>
                      <div className="mc-actions">
                        <button
                          type="button"
                          className="mc-btn mc-btn--ghost mc-btn--sm"
                          disabled={medBusy}
                          onClick={() => {
                            clearMedEditors()
                            setEditRxId(p.id)
                            setRxDrug(p.drug)
                            setRxDosage(p.dosage)
                            setRxDur(p.duration ?? '')
                            setRxVDate(p.visitDate ?? '')
                          }}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          className="mc-btn mc-btn--danger mc-btn--sm"
                          disabled={medBusy}
                          onClick={() =>
                            void runMed(async () => {
                              if (!user?.token || !patientId || !window.confirm('Удалить рецепт?'))
                                return
                              await deletePatientPrescription(user.token, patientId, p.id)
                            })
                          }
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </TableSection>
          </>
        )}
      </section>
    </>
  )
}
