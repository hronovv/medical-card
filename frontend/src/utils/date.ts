/** Parse DD.MM.YYYY; returns null if invalid. */
export function parseDDMMYYYY(value: string): Date | null {
  const s = value.trim()
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null
  }
  return d
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function isDateNotBeforeToday(value: string): boolean {
  const parsed = parseDDMMYYYY(value)
  if (!parsed) return false
  const today = startOfDay(new Date())
  return startOfDay(parsed).getTime() >= today.getTime()
}

export function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

export function todayDDMMYYYY(): string {
  return formatDDMMYYYY(new Date())
}

/** ISO YYYY-MM-DD for input type="date" max attribute */
export function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export const BIRTH_DATE_MIN_ISO = '1900-01-01'

export function ddmmyyyyToISO(value: string): string {
  const parsed = parseDDMMYYYY(value)
  if (!parsed) return ''
  const yyyy = parsed.getFullYear()
  const mm = String(parsed.getMonth() + 1).padStart(2, '0')
  const dd = String(parsed.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function isoToDDMMYYYY(iso: string): string | null {
  const s = iso.trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null
  }
  return formatDDMMYYYY(d)
}

/** Validates HTML date input value (YYYY-MM-DD). */
export function validateBirthDateISO(iso: string): string | null {
  if (!iso.trim()) return 'Укажите дату рождения'
  const parsed = isoToDDMMYYYY(iso)
  if (!parsed) return 'Укажите корректную дату рождения'
  const d = parseDDMMYYYY(parsed)!
  const today = startOfDay(new Date())
  if (startOfDay(d).getTime() > today.getTime()) {
    return 'Дата рождения не может быть в будущем'
  }
  const min = new Date(1900, 0, 1)
  if (startOfDay(d).getTime() < startOfDay(min).getTime()) {
    return 'Укажите корректную дату рождения'
  }
  return null
}

export function birthDateISOForApi(iso: string): string {
  const err = validateBirthDateISO(iso)
  if (err) throw new Error(err)
  const formatted = isoToDDMMYYYY(iso)
  if (!formatted) throw new Error('Укажите корректную дату рождения')
  return formatted
}

export function validateAppointmentDate(value: string): string | null {
  if (!value.trim()) return 'Укажите дату'
  if (!parseDDMMYYYY(value)) return 'Дата должна быть в формате ДД.ММ.ГГГГ'
  if (!isDateNotBeforeToday(value)) return 'Нельзя выбрать прошедшую дату'
  return null
}
