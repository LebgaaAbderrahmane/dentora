import type { StaffScheduleRow, Weekday } from '@dentora/contracts'

export const TIME_HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export const WEEKDAY_ORDER: Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

export interface NormalizedScheduleRow {
  weekday: Weekday
  startTime: string
  endTime: string
  active: boolean
}

export type ScheduleValidation =
  | { ok: true; rows: NormalizedScheduleRow[] }
  | { ok: false; error: 'INVALID_TIME' | 'END_BEFORE_START' | 'OVERLAP' }

export function isHhMm(value: string): boolean {
  return TIME_HHMM_RE.test(value)
}

export function timeToMinutes(time: string): number {
  const match = TIME_HHMM_RE.exec(time)
  if (!match) return NaN
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours * 60 + minutes
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function sortScheduleRows(rows: NormalizedScheduleRow[]): NormalizedScheduleRow[] {
  return [...rows].sort((a, b) => {
    const dayDiff = WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday)
    if (dayDiff !== 0) return dayDiff
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  })
}

function sameDayRows(rows: NormalizedScheduleRow[], day: Weekday): NormalizedScheduleRow[] {
  return rows
    .filter((r) => r.weekday === day)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
}

// Validates a full weekly template: HH:mm times, end after start, and no
// overlapping/touching slot pairs on the same weekday. An empty input is valid
// and means "no schedule / cleared" (bulk-replace semantics). Returns a
// sorted, normalized set ready for storage.
export function validateScheduleRows(rows: StaffScheduleRow[]): ScheduleValidation {
  if (!rows || rows.length === 0) {
    return { ok: true, rows: [] }
  }

  const normalized: NormalizedScheduleRow[] = rows.map((r) => ({
    weekday: r.weekday,
    startTime: r.startTime,
    endTime: r.endTime,
    active: r.active ?? true,
  }))

  for (const r of normalized) {
    if (!isHhMm(r.startTime) || !isHhMm(r.endTime)) {
      return { ok: false, error: 'INVALID_TIME' }
    }
    if (timeToMinutes(r.endTime) <= timeToMinutes(r.startTime)) {
      return { ok: false, error: 'END_BEFORE_START' }
    }
  }

  for (const day of WEEKDAY_ORDER) {
    const rowsOnDay = sameDayRows(normalized, day)
    for (let i = 1; i < rowsOnDay.length; i += 1) {
      const prevEnd = timeToMinutes(rowsOnDay[i - 1].endTime)
      const nextStart = timeToMinutes(rowsOnDay[i].startTime)
      if (nextStart < prevEnd) {
        return { ok: false, error: 'OVERLAP' }
      }
    }
  }

  return { ok: true, rows: sortScheduleRows(normalized) }
}
