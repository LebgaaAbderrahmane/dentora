import { describe, expect, it } from 'vitest'
import { clinicScheduleSchema } from '@dentora/contracts'
import { DEFAULT_CLINIC_SCHEDULE, hhmmToMinutes, isWithinSchedule } from './clinicSchedule'

const base = { openTime: '08:00', closeTime: '16:00', workingDays: [0, 1, 2, 3, 4] }

describe('clinic schedule (ADR 037)', () => {
  it('defaults to 08:00–16:00 Sun–Thu', () => {
    expect(DEFAULT_CLINIC_SCHEDULE).toEqual(base)
    expect(clinicScheduleSchema.parse(DEFAULT_CLINIC_SCHEDULE)).toEqual(base)
  })

  it('rejects close before open and malformed times/days', () => {
    expect(
      clinicScheduleSchema.safeParse({ ...base, openTime: '17:00', closeTime: '09:00' }).success,
    ).toBe(false)
    expect(clinicScheduleSchema.safeParse({ ...base, openTime: '8:00' }).success).toBe(false)
    expect(clinicScheduleSchema.safeParse({ ...base, workingDays: [0, 7] }).success).toBe(false)
    expect(clinicScheduleSchema.safeParse({ ...base, workingDays: [] }).success).toBe(false)
  })

  it('accepts equal open/close only when open < close fails', () => {
    // equality is rejected by the refine (open must be strictly before close)
    expect(
      clinicScheduleSchema.safeParse({ ...base, openTime: '09:00', closeTime: '09:00' }).success,
    ).toBe(false)
  })

  it('hhmmToMinutes converts wall-clock strings', () => {
    expect(hhmmToMinutes('08:00')).toBe(480)
    expect(hhmmToMinutes('16:30')).toBe(990)
    expect(hhmmToMinutes('00:00')).toBe(0)
  })

  it('isWithinSchedule honours days and the half-open time window', () => {
    const schedule = clinicScheduleSchema.parse(base)
    // Sunday 2026-08-16 — a working day
    const sunday = (hhmm: string) => new Date(`2026-08-16T${hhmm}:00`)
    expect(isWithinSchedule(sunday('07:59'), schedule)).toBe(false)
    expect(isWithinSchedule(sunday('08:00'), schedule)).toBe(true)
    expect(isWithinSchedule(sunday('15:59'), schedule)).toBe(true)
    expect(isWithinSchedule(sunday('16:00'), schedule)).toBe(false)

    // Friday 2026-08-21 — weekend under the default Sun–Thu week
    const friday = (hhmm: string) => new Date(`2026-08-21T${hhmm}:00`)
    expect(isWithinSchedule(friday('10:00'), schedule)).toBe(false)
  })
})
