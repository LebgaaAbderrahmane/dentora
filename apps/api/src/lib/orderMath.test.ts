import { describe, expect, it } from 'vitest'
import { poLineTotal, poRemaining, poStatus, poTotalDZD } from './orderMath'

const line = (
  unitPriceDZD: number,
  quantity: number,
  receivedQuantity: number,
): Parameters<typeof poStatus>[0][number] => ({ unitPriceDZD, quantity, receivedQuantity })

describe('poTotalDZD / poLineTotal', () => {
  it('sums unit price × quantity, all whole dinars', () => {
    expect(poLineTotal({ unitPriceDZD: 1000, quantity: 12 })).toBe(12_000)
    expect(
      poTotalDZD([
        { unitPriceDZD: 1000, quantity: 12 },
        { unitPriceDZD: 500, quantity: 2 },
      ]),
    ).toBe(13_000)
    expect(poTotalDZD([])).toBe(0)
  })
})

describe('poRemaining', () => {
  it('is quantity minus received, clamped at nothing over', () => {
    expect(poRemaining(line(0, 10, 4))).toBe(6)
    expect(poRemaining(line(0, 10, 10))).toBe(0)
  })
})

describe('poStatus', () => {
  it('is ORDERED when nothing has been received', () => {
    expect(poStatus([line(1, 10, 0), line(1, 5, 0)])).toBe('ORDERED')
  })
  it('is PARTIALLY_RECEIVED when some but not all is in', () => {
    expect(poStatus([line(1, 10, 4), line(1, 5, 0)])).toBe('PARTIALLY_RECEIVED')
  })
  it('is RECEIVED when every line is fully received', () => {
    expect(poStatus([line(1, 10, 10), line(1, 5, 5)])).toBe('RECEIVED')
  })
  it('falls back to ORDERED for an empty order', () => {
    expect(poStatus([])).toBe('ORDERED')
  })
})
