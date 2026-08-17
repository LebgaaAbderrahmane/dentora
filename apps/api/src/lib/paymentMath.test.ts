import { describe, expect, it } from 'vitest'
import { balanceDue, netPaid, refundableRemaining } from './paymentMath'

describe('payment math', () => {
  it('netPaid sums receipts and subtracts refunds', () => {
    const rows = [
      { kind: 'RECEIPT' as const, amountDZD: 5000 },
      { kind: 'RECEIPT' as const, amountDZD: 3000 },
      { kind: 'REFUND' as const, amountDZD: 1000 },
    ]
    expect(netPaid(rows)).toBe(7000)
    expect(netPaid([])).toBe(0)
  })

  it('refundableRemaining never goes negative', () => {
    expect(refundableRemaining(5000, 2000)).toBe(3000)
    expect(refundableRemaining(5000, 5000)).toBe(0)
    expect(refundableRemaining(5000, 9000)).toBe(0)
  })

  it('balanceDue clamps at zero', () => {
    expect(balanceDue(10000, 4000)).toBe(6000)
    expect(balanceDue(10000, 10000)).toBe(0)
    expect(balanceDue(10000, 12000)).toBe(0)
  })
})
