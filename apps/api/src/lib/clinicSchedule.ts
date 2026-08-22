import type { ClinicSchedule } from '@dentora/contracts'

// Pure clinic-schedule helpers (ADR 037) — no prisma import so this module stays
// unit-testable without a DATABASE_URL, mirroring lib/alerts and lib/auditMath.
// The Setting-backed load/save lives in routes/schedule.ts (alerts precedent).
export const CONFIG_KEY = 'clinic.schedule'

// Algeria's weekend is Friday–Saturday; Sunday–Thursday is the default week.
// Times are local wall-clock HH:mm strings and weekdays follow the
// FullCalendar/JS convention (0 = Sunday … 6 = Saturday).
export const DEFAULT_CLINIC_SCHEDULE: ClinicSchedule = {
  openTime: '08:00',
  closeTime: '16:00',
  workingDays: [0, 1, 2, 3, 4],
}

// "08:30" -> minutes since midnight.
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Is this local wall-clock moment inside the clinic's window? `date` carries the
// caller's locale — the admin passes its own "now", so no server TZ conversion.
export function isWithinSchedule(date: Date, schedule: ClinicSchedule): boolean {
  if (!schedule.workingDays.includes(date.getDay())) return false
  const minutes = date.getHours() * 60 + date.getMinutes()
  return minutes >= hhmmToMinutes(schedule.openTime) && minutes < hhmmToMinutes(schedule.closeTime)
}
