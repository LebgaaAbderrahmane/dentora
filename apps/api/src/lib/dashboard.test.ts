import { describe, expect, it } from 'vitest'
import { addDays, startOfDay, statusCounts } from './dashboard'

describe('dashboard aggregates', () => {
  it('statusCounts tallies every known status', () => {
    const rows = [
      { status: 'PENDING' },
      { status: 'PENDING' },
      { status: 'CONFIRMED' },
      { status: 'CANCELLED' },
      { status: 'CANCELLED' as const },
    ] as const
    const counts = statusCounts([...rows, { status: 'NOSHOW' }])
    expect(counts.PENDING).toBe(2)
    expect(counts.CONFIRMED).toBe(1)
    expect(counts.NOSHOW).toBe(1)
    expect(counts.COMPLETED).toBe(0)
  })

  it('statusCounts returns zeros for an empty day', () => {
    expect(statusCounts([])).toEqual({
      PENDING: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      NOSHOW: 0,
    })
  })

  it('startOfDay zeroes the time part', () => {
    const d = startOfDay(new Date(2026, 7, 16, 14, 30, 45))
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(16)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
  })

  it('addDays shifts across month boundaries', () => {
    expect(addDays(new Date(2026, 7, 31), 1).getDate()).toBe(1)
    expect(addDays(new Date(2026, 7, 31), 1).getMonth()).toBe(8)
  })
})
