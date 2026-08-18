export type InternDateError = 'END_BEFORE_START'

export type DateInput = Date | string | null | undefined

function toMillis(value: Exclude<DateInput, null | undefined>): number {
  return value instanceof Date ? value.getTime() : Date.parse(value)
}

// Insert-hierarchy guard: refuse profiles whose counting window is inverted.
export function internDateError(start: DateInput, end: DateInput): InternDateError | null {
  if (start == null || end == null) return null
  if (toMillis(end) < toMillis(start)) return 'END_BEFORE_START'
  return null
}

// Whole minutes actually clocked by an intern from closed attendance records.
// Open records (check-in without check-out) are excluded because their worked
// time is not settled. Mirrors attendanceWorkedMinutes for consistency.
export function internCompletedMinutes(
  logs: Array<{ checkIn: Date | null; checkOut: Date | null }>,
): number {
  let total = 0
  for (const log of logs) {
    if (log.checkIn == null || log.checkOut == null) continue
    const diff = log.checkOut.getTime() - log.checkIn.getTime()
    if (diff <= 0) continue
    total += Math.round(diff / 60000)
  }
  return total
}

// Hours still to clock before the internship target is met; never negative.
export function internRemainingMinutes(completedMinutes: number, requiredHours: number): number {
  return Math.max(0, requiredHours * 60 - completedMinutes)
}

// Progress toward the required-hours target as a percentage (not capped: an
// intern can over-perform beyond 100%).
export function internProgressPct(completedMinutes: number, requiredHours: number): number {
  if (requiredHours <= 0) return 0
  return Math.round((completedMinutes / (requiredHours * 60)) * 100)
}
