import { describe, expect, it } from 'vitest'
import type { StaffScheduleRow } from '@dentora/contracts'
import {
  isHhMm,
  minutesToTime,
  sortScheduleRows,
  timeToMinutes,
  validateScheduleRows,
} from './scheduleMath'

function row(
  weekday: StaffScheduleRow['weekday'],
  startTime: string,
  endTime: string,
  active = true,
): StaffScheduleRow {
  return { weekday, startTime, endTime, active }
}

describe('scheduleMath time helpers', () => {
  it('accepts HH:mm within the day and rejects malformed values', () => {
    expect(isHhMm('09:00')).toBe(true)
    expect(isHhMm('23:59')).toBe(true)
    expect(isHhMm('24:00')).toBe(false)
    expect(isHhMm('9:00')).toBe(false)
    expect(isHhMm('09:60')).toBe(false)
    expect(isHhMm('abcd')).toBe(false)
  })

  it('converts HH:mm to minutes since midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('08:30')).toBe(510)
    expect(timeToMinutes('12:15')).toBe(735)
    expect(timeToMinutes('23:59')).toBe(1439)
  })

  it('converts minutes back to HH:mm and round-trips', () => {
    expect(minutesToTime(0)).toBe('00:00')
    expect(minutesToTime(510)).toBe('08:30')
    expect(minutesToTime(1439)).toBe('23:59')
    expect(minutesToTime(timeToMinutes('17:45'))).toBe('17:45')
  })
})

describe('validateScheduleRows', () => {
  it('accepts an empty template as "no schedule / cleared"', () => {
    expect(validateScheduleRows([])).toEqual({ ok: true, rows: [] })
  })

  it('rejects invalid HH:mm start/end', () => {
    expect(validateScheduleRows([row('MONDAY', '09:00', '7:00')])).toEqual({
      ok: false,
      error: 'INVALID_TIME',
    })
  })

  it('rejects end before or equal to start', () => {
    expect(validateScheduleRows([row('MONDAY', '09:00', '09:00')])).toEqual({
      ok: false,
      error: 'END_BEFORE_START',
    })
    expect(validateScheduleRows([row('MONDAY', '17:00', '09:00')])).toEqual({
      ok: false,
      error: 'END_BEFORE_START',
    })
  })

  it('rejects overlapping slots on the same weekday', () => {
    expect(
      validateScheduleRows([row('MONDAY', '08:00', '12:00'), row('MONDAY', '11:00', '13:00')]),
    ).toEqual({ ok: false, error: 'OVERLAP' })
  })

  it('accepts adjacent and non-overlapping slots on the same weekday', () => {
    const res = validateScheduleRows([
      row('MONDAY', '08:00', '12:00'),
      row('MONDAY', '12:00', '13:00'),
      row('MONDAY', '14:00', '18:00'),
    ])
    expect(res.ok).toBe(true)
  })

  it('accepts overlapping slots on different weekdays', () => {
    const res = validateScheduleRows([
      row('MONDAY', '08:00', '12:00'),
      row('TUESDAY', '08:00', '12:00'),
    ])
    expect(res.ok).toBe(true)
  })

  it('normalizes then sorts by weekday order and start time, defaulting active', () => {
    const res = validateScheduleRows([
      row('SUNDAY', '10:00', '12:00', false),
      row('MONDAY', '14:00', '18:00'),
      row('TUESDAY', '08:00', '09:00'),
      row('MONDAY', '08:00', '09:00'),
    ])
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows.map((r) => `${r.weekday}:${r.startTime}`)).toEqual([
      'MONDAY:08:00',
      'MONDAY:14:00',
      'TUESDAY:08:00',
      'SUNDAY:10:00',
    ])
    expect(res.rows[0].active).toBe(true)
    expect(res.rows[3].active).toBe(false)
  })
})

describe('sortScheduleRows', () => {
  it('orders by weekday then start time', () => {
    const sorted = sortScheduleRows([
      { weekday: 'WEDNESDAY', startTime: '09:00', endTime: '12:00', active: true },
      { weekday: 'MONDAY', startTime: '14:00', endTime: '18:00', active: true },
      { weekday: 'MONDAY', startTime: '08:00', endTime: '12:00', active: true },
    ])
    expect(sorted.map((r) => `${r.weekday}:${r.startTime}`)).toEqual([
      'MONDAY:08:00',
      'MONDAY:14:00',
      'WEDNESDAY:09:00',
    ])
  })
})
