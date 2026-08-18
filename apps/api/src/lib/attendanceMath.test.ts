import { describe, expect, it } from 'vitest'
import {
  attendanceTimeError,
  attendanceWorkedMinutes,
  isOpenRecord,
  minutesToHoursLabel,
} from './attendanceMath'

const T = (h: number, m = 0) => new Date(Date.UTC(2026, 7, 18, h, m))

describe('attendanceTimeError', () => {
  it('accepts a check-out strictly after check-in', () => {
    expect(attendanceTimeError(T(8, 30), T(17, 0))).toBeNull()
  })

  it('rejects check-out before or equal to check-in', () => {
    expect(attendanceTimeError(T(9, 0), T(9, 0))).toBe('CHECKOUT_BEFORE_CHECKIN')
    expect(attendanceTimeError(T(17, 0), T(8, 30))).toBe('CHECKOUT_BEFORE_CHECKIN')
  })

  it('rejects a check-out without a check-in', () => {
    expect(attendanceTimeError(null, T(17, 0))).toBe('CHECKOUT_WITHOUT_CHECKIN')
  })

  it('is fine when times are missing', () => {
    expect(attendanceTimeError(null, null)).toBeNull()
    expect(attendanceTimeError(undefined, undefined)).toBeNull()
  })
})

describe('attendanceWorkedMinutes', () => {
  it('computes whole minutes between the pair', () => {
    expect(attendanceWorkedMinutes(T(8, 30), T(17, 0))).toBe(510)
    expect(attendanceWorkedMinutes(T(9, 0), T(9, 45))).toBe(45)
  })

  it('returns null when either time is missing or the pair is invalid', () => {
    expect(attendanceWorkedMinutes(null, T(17, 0))).toBeNull()
    expect(attendanceWorkedMinutes(T(9, 0), null)).toBeNull()
    expect(attendanceWorkedMinutes(T(17, 0), T(8, 0))).toBeNull()
  })
})

describe('isOpenRecord', () => {
  it('is open when clocked in but not out', () => {
    expect(isOpenRecord(T(9, 0), null)).toBe(true)
    expect(isOpenRecord(T(9, 0), T(17, 0))).toBe(false)
    expect(isOpenRecord(null, null)).toBe(false)
  })
})

describe('minutesToHoursLabel', () => {
  it('formats compact hour/minute labels', () => {
    expect(minutesToHoursLabel(0)).toBe('0min')
    expect(minutesToHoursLabel(45)).toBe('45min')
    expect(minutesToHoursLabel(60)).toBe('1h')
    expect(minutesToHoursLabel(90)).toBe('1h30')
    expect(minutesToHoursLabel(480)).toBe('8h')
    expect(minutesToHoursLabel(-5)).toBe('0min')
  })
})
