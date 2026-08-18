import { describe, expect, it } from 'vitest'
import {
  internCompletedMinutes,
  internDateError,
  internProgressPct,
  internRemainingMinutes,
} from './internMath'

describe('internDateError', () => {
  it('accepts open-ended and equal boundaries', () => {
    expect(internDateError('2026-05-01', null)).toBeNull()
    expect(internDateError(null, '2026-10-01')).toBeNull()
    expect(internDateError('2026-05-01', '2026-05-01')).toBeNull()
  })

  it('rejects an inverted window', () => {
    expect(internDateError('2026-10-01', '2026-05-01')).toBe('END_BEFORE_START')
    expect(internDateError(new Date('2026-10-01'), new Date('2026-05-01'))).toBe('END_BEFORE_START')
  })
})

describe('internCompletedMinutes', () => {
  const at = (h: number) => new Date(2026, 7, 18, h, 0, 0)

  it('sums closed records', () => {
    expect(
      internCompletedMinutes([
        { checkIn: at(8), checkOut: at(10) },
        { checkIn: at(11), checkOut: at(12) },
      ]),
    ).toBe(180)
  })

  it('skips open and incomplete records', () => {
    expect(
      internCompletedMinutes([
        { checkIn: at(8), checkOut: null },
        { checkIn: null, checkOut: at(10) },
        { checkIn: null, checkOut: null },
      ]),
    ).toBe(0)
  })

  it('skips inverted records and an empty list', () => {
    expect(internCompletedMinutes([{ checkIn: at(10), checkOut: at(8) }])).toBe(0)
    expect(internCompletedMinutes([])).toBe(0)
  })
})

describe('internRemainingMinutes', () => {
  it('subtracts completed from target', () => {
    expect(internRemainingMinutes(120, 200)).toBe(200 * 60 - 120)
  })

  it('never returns negative', () => {
    expect(internRemainingMinutes(200 * 60 + 30, 200)).toBe(0)
  })
})

describe('internProgressPct', () => {
  it('computes the ratio', () => {
    expect(internProgressPct(7200, 200)).toBe(60)
    expect(internProgressPct(0, 200)).toBe(0)
  })

  it('is not capped above 100 and guards a zero target', () => {
    expect(internProgressPct(12000, 200)).toBe(100)
    expect(internProgressPct(13000, 200)).toBe(108)
    expect(internProgressPct(100, 0)).toBe(0)
  })
})
