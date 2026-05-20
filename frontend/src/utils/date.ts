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

export function validateAppointmentDate(value: string): string | null {
  if (!value.trim()) return 'Укажите дату'
  if (!parseDDMMYYYY(value)) return 'Дата должна быть в формате ДД.ММ.ГГГГ'
  if (!isDateNotBeforeToday(value)) return 'Нельзя выбрать прошедшую дату'
  return null
}
