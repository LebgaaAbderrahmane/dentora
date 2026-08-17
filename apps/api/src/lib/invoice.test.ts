import { describe, expect, it } from 'vitest'
import { invoiceStatus } from './invoice'

describe('invoiceStatus', () => {
  it('an issued, unpaid invoice is UNPAID', () => {
    expect(invoiceStatus({ paidDZD: 0, subtotalDZD: 2500, voidedAt: null })).toBe('UNPAID')
  })

  it('a zero-total invoice is UNPAID rather than PAID', () => {
    expect(invoiceStatus({ paidDZD: 0, subtotalDZD: 0, voidedAt: null })).toBe('UNPAID')
  })

  it('is PARTIAL once payments cover less than the total', () => {
    expect(invoiceStatus({ paidDZD: 1000, subtotalDZD: 2500, voidedAt: null })).toBe('PARTIAL')
  })

  it('is PAID once payments cover the total', () => {
    expect(invoiceStatus({ paidDZD: 2500, subtotalDZD: 2500, voidedAt: null })).toBe('PAID')
    expect(invoiceStatus({ paidDZD: 3000, subtotalDZD: 2500, voidedAt: null })).toBe('PAID')
  })

  it('void always wins over any amount state', () => {
    expect(invoiceStatus({ paidDZD: 2500, subtotalDZD: 2500, voidedAt: new Date() })).toBe('VOID')
    expect(invoiceStatus({ paidDZD: 0, subtotalDZD: 0, voidedAt: new Date() })).toBe('VOID')
  })
})
