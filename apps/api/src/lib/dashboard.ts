import type { AppointmentStatus, AppointmentStatusCounts } from '@dentora/contracts'

// appointments that still occupy a time-slot on the day schedule
export const BLOCKING_VISIT_STATUSES: readonly AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
]

const ZERO_COUNTS: AppointmentStatusCounts = {
  PENDING: 0,
  CONFIRMED: 0,
  COMPLETED: 0,
  CANCELLED: 0,
  NOSHOW: 0,
}

export function statusCounts(
  rows: readonly { status: AppointmentStatus }[],
): AppointmentStatusCounts {
  const counts: AppointmentStatusCounts = { ...ZERO_COUNTS }
  for (const row of rows) counts[row.status] += 1
  return counts
}

// start of the day that contains dateLike, in the server's local timezone
export function startOfDay(dateLike: string | Date): Date {
  const d = new Date(dateLike)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
