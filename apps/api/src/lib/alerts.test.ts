import { describe, expect, it } from 'vitest'
import { computeExpiringLots, computeLowStock } from './alerts'

const day = 24 * 60 * 60 * 1000
const NOW = new Date('2026-08-18T00:00:00.000Z')

function product(overrides: Partial<Parameters<typeof computeLowStock>[0][number]> = {}) {
  return {
    id: 'p1',
    name: 'Gants nitrile M',
    unit: 'BOX',
    category: 'DISPOSABLES',
    quantityOnHand: 3,
    reorderLevel: 5,
    archivedAt: null,
    ...overrides,
  }
}

describe('computeLowStock', () => {
  it('flags active products at or below a configured threshold', () => {
    const alerts = computeLowStock([
      product({ id: 'a', name: 'Alpha', quantityOnHand: 3, reorderLevel: 5 }),
      product({ id: 'b', name: 'Beta', quantityOnHand: 5, reorderLevel: 5 }),
      product({ id: 'c', name: 'Gamma', quantityOnHand: 6, reorderLevel: 5 }),
    ])
    expect(alerts.map((a) => a.productId)).toEqual(['a', 'b'])
  })

  it('ignores archived products and rows with no configured threshold', () => {
    const alerts = computeLowStock([
      product({ id: 'a', archivedAt: new Date(), quantityOnHand: 0, reorderLevel: 5 }),
      product({ id: 'b', quantityOnHand: 0, reorderLevel: 0 }),
      product({ id: 'c', quantityOnHand: 4, reorderLevel: 5 }),
    ])
    expect(alerts.map((a) => a.productId)).toEqual(['c'])
  })
})

function entry(overrides: Partial<Parameters<typeof computeExpiringLots>[0][number]> = {}) {
  return {
    productId: 'p1',
    type: 'IN' as const,
    quantity: 10,
    batch: null,
    expiryDate: null,
    ...overrides,
  }
}

describe('computeExpiringLots', () => {
  it('returns lots expiring within the horizon with remaining stock', () => {
    const now = NOW
    const lots = computeExpiringLots(
      [
        entry({ batch: 'LOT-FAR', expiryDate: new Date(now.getTime() + 60 * day), quantity: 10 }),
        entry({ batch: 'LOT-NEAR', expiryDate: new Date(now.getTime() + 5 * day), quantity: 4 }),
      ],
      30 * day,
      now,
    )
    expect(lots).toHaveLength(1)
    expect(lots[0].batch).toBe('LOT-NEAR')
    expect(lots[0].remaining).toBe(4)
    expect(lots[0].expired).toBe(false)
  })

  it('drains consumption FEFO: soonest-expiring lot depleted first', () => {
    const now = NOW
    const lots = computeExpiringLots(
      [
        entry({ batch: 'OLD', expiryDate: new Date(now.getTime() + 10 * day), quantity: 4 }),
        entry({ batch: 'NEW', expiryDate: new Date(now.getTime() + 20 * day), quantity: 10 }),
        entry({ type: 'OUT', quantity: 8 }),
      ],
      30 * day,
      now,
    )
    expect(lots).toHaveLength(1)
    expect(lots[0]).toMatchObject({ batch: 'NEW', remaining: 6 })
  })

  it('flags already-expired lots that still hold stock', () => {
    const now = NOW
    const lots = computeExpiringLots(
      [entry({ batch: 'GONE', expiryDate: new Date(now.getTime() - 2 * day), quantity: 5 })],
      30 * day,
      now,
    )
    expect(lots).toHaveLength(1)
    expect(lots[0].expired).toBe(true)
  })

  it('excludes batchless lots and lots outside the horizon', () => {
    const now = NOW
    const lots = computeExpiringLots(
      [
        entry({ batch: null, expiryDate: new Date(now.getTime() + 5 * day), quantity: 5 }),
        entry({ batch: 'LATE', expiryDate: new Date(now.getTime() + 40 * day), quantity: 5 }),
        entry({ batch: 'INWINDOW', expiryDate: new Date(now.getTime() + 5 * day), quantity: 3 }),
      ],
      30 * day,
      now,
    )
    expect(lots).toHaveLength(1)
    expect(lots[0].batch).toBe('INWINDOW')
  })

  it('handles negative ADJUST as consumption and never returns negative remaining', () => {
    const now = NOW
    const overConsumed = computeExpiringLots(
      [
        entry({ batch: 'A', expiryDate: new Date(now.getTime() + 5 * day), quantity: 3 }),
        entry({ type: 'ADJUST', quantity: -10 }),
      ],
      30 * day,
      now,
    )
    expect(overConsumed).toHaveLength(0)
    const partial = computeExpiringLots(
      [
        entry({ batch: 'B', expiryDate: new Date(now.getTime() + 5 * day), quantity: 3 }),
        entry({ type: 'ADJUST', quantity: -1 }),
      ],
      30 * day,
      now,
    )
    expect(partial).toHaveLength(1)
    expect(partial[0].remaining).toBe(2)
  })
})
