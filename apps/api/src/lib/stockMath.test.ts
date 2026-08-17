import { describe, expect, it } from 'vitest'
import { applyStock, stockDelta } from './stockMath'

describe('stockDelta', () => {
  it('OPENING and IN add their magnitude', () => {
    expect(stockDelta('OPENING', 12)).toBe(12)
    expect(stockDelta('IN', 5)).toBe(5)
  })

  it('OUT removes its magnitude', () => {
    expect(stockDelta('OUT', 3)).toBe(-3)
  })

  it('ADJUST keeps the signed direction', () => {
    expect(stockDelta('ADJUST', 4)).toBe(4)
    expect(stockDelta('ADJUST', -2)).toBe(-2)
  })
})

describe('applyStock', () => {
  it('opens and adds without touching the invariant', () => {
    expect(applyStock(0, 'OPENING', 10)).toEqual({ ok: true, onHand: 10 })
    expect(applyStock(10, 'IN', 5)).toEqual({ ok: true, onHand: 15 })
  })

  it('OUT subtracts and never below zero', () => {
    expect(applyStock(10, 'OUT', 4)).toEqual({ ok: true, onHand: 6 })
    expect(applyStock(3, 'OUT', 4)).toEqual({ ok: false, error: 'INSUFFICIENT_STOCK' })
  })

  it('positive ADJUST adds, negative ADJUST removes and guards zero', () => {
    expect(applyStock(6, 'ADJUST', 2)).toEqual({ ok: true, onHand: 8 })
    expect(applyStock(8, 'ADJUST', -8)).toEqual({ ok: true, onHand: 0 })
    expect(applyStock(1, 'ADJUST', -2)).toEqual({ ok: false, error: 'INSUFFICIENT_STOCK' })
  })

  it('exact depletion is allowed', () => {
    expect(applyStock(5, 'OUT', 5)).toEqual({ ok: true, onHand: 0 })
  })
})
