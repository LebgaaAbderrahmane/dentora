import { clinicScheduleSchema, type ClinicSchedule } from '@dentora/contracts'
import { prisma } from './prisma'

// Per-branch `Setting` row (`clinic.schedule`) holds the clinic's opening
// window and working days (ADR 037). The appointments calendar renders from it;
// nothing here is instant-math — times are local wall-clock HH:mm strings and
// weekdays follow the FullCalendar/JS convention (0 = Sunday … 6 = Saturday).
// Corrupt or partial stored values fall back to the defaults on read, mirroring
// the audit-retention precedent (ADR 034).
const CONFIG_KEY = 'clinic.schedule'

export const DEFAULT_CLINIC_SCHEDULE: ClinicSchedule = {
  openTime: '08:00',
  closeTime: '16:00',
  // Algeria's weekend is Friday–Saturday; Sunday–Thursday is the default week.
  workingDays: [0, 1, 2, 3, 4],
}

export async function loadClinicSchedule(branchId: string): Promise<ClinicSchedule> {
  const row = await prisma.setting.findUnique({
    where: { branchId_key: { branchId, key: CONFIG_KEY } },
  })
  if (!row?.value) return DEFAULT_CLINIC_SCHEDULE
  try {
    return clinicScheduleSchema.parse(JSON.parse(row.value))
  } catch {
    return DEFAULT_CLINIC_SCHEDULE
  }
}

export async function saveClinicSchedule(
  branchId: string,
  schedule: ClinicSchedule,
): Promise<void> {
  const value = JSON.stringify(schedule)
  await prisma.setting.upsert({
    where: { branchId_key: { branchId, key: CONFIG_KEY } },
    create: { branchId, key: CONFIG_KEY, value },
    update: { value },
  })
}

// Pure helpers for the calendar + dialog (unit-tested without a DB).

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
