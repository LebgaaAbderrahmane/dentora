export type AttendanceTimeError = 'CHECKOUT_BEFORE_CHECKIN' | 'CHECKOUT_WITHOUT_CHECKIN'

export type TimeInput = Date | string | null | undefined

function toMillis(value: Exclude<TimeInput, null | undefined>): number {
  return value instanceof Date ? value.getTime() : Date.parse(value)
}

export function attendanceTimeError(
  checkIn: TimeInput,
  checkOut: TimeInput,
): AttendanceTimeError | null {
  if (checkOut != null && checkIn == null) return 'CHECKOUT_WITHOUT_CHECKIN'
  if (checkIn == null || checkOut == null) return null
  if (toMillis(checkOut) <= toMillis(checkIn)) return 'CHECKOUT_BEFORE_CHECKIN'
  return null
}

// Whole minutes between check-in and check-out; null when either is missing or
// the pair is invalid.
export function attendanceWorkedMinutes(checkIn: TimeInput, checkOut: TimeInput): number | null {
  if (attendanceTimeError(checkIn, checkOut) !== null) return null
  if (checkIn == null || checkOut == null) return null
  return Math.round((toMillis(checkOut) - toMillis(checkIn)) / 60000)
}

// A record is "open" when the staff member has clocked in but not out.
export function isOpenRecord(checkIn: TimeInput, checkOut: TimeInput): boolean {
  return checkIn != null && checkOut == null
}

// Compact worked-hours label, e.g. 7h30 / 45min / 8h — used by the UI only.
export function minutesToHoursLabel(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}
