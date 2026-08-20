import { describe, expect, it } from 'vitest'
import { retentionCutoff, retentionDaysClamped, retentionPurgeWhere } from './auditMath'

describe('auditMath (6.2, ADR 034)', () => {
  it('clamps days into the safe window', () => {
    expect(retentionDaysClamped(365)).toBe(365)
    expect(retentionDaysClamped(0)).toBe(1)
    expect(retentionDaysClamped(-5)).toBe(1)
    expect(retentionDaysClamped(1)).toBe(1)
    expect(retentionDaysClamped(99999)).toBe(3650)
    expect(retentionDaysClamped(7.6)).toBe(8)
  })

  it('computes the cutoff strictly inside the window (days before now)', () => {
    const now = new Date('2026-08-20T12:00:00.000Z')
    const cutoff = retentionCutoff(365, now)
    expect(cutoff.toISOString()).toBe('2025-08-20T12:00:00.000Z')
  })

  it('coerces an out-of-range days value before computing the cutoff', () => {
    const now = new Date('2026-08-20T12:00:00.000Z')
    expect(retentionCutoff(0, now).toISOString()).toBe('2026-08-19T12:00:00.000Z')
  })

  it('builds a prisma where that is branch-scoped and older-than the cutoff', () => {
    const now = new Date('2026-08-20T12:00:00.000Z')
    const where = retentionPurgeWhere('branch-1', 30, now)
    expect(where).toEqual({
      branchId: 'branch-1',
      createdAt: { lt: new Date('2026-07-21T12:00:00.000Z') },
    })
  })
})
