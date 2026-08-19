import { describe, expect, it } from 'vitest'
import { payCheckError, payrollDateError, payslipNetDZD, payslipWorkedMinutes } from './payrollMath'

describe('payrollMath', () => {
  it('payrollDateError rejects an inverted period', () => {
    expect(payrollDateError('2026-07-31', '2026-07-01')).toBe('PERIOD_END_BEFORE_START')
    expect(payrollDateError('2026-07-01', '2026-07-31')).toBeNull()
    expect(payrollDateError(null, null)).toBeNull()
    expect(payrollDateError(new Date('2026-07-01'), new Date('2026-07-01'))).toBeNull()
  })

  it('payCheckError allows a zero net but rejects deductions over base+bonus', () => {
    expect(payCheckError(1000, 0, 1000)).toBeNull()
    expect(payCheckError(1000, 500, 1500)).toBeNull()
    expect(payCheckError(1000, 0, 1001)).toBe('NEGATIVE_NET')
  })

  it('payslipNetDZD is base + bonus - deductions', () => {
    expect(payslipNetDZD(180000, 20000, 5000)).toBe(195000)
    expect(payslipNetDZD(180000, 0, 0)).toBe(180000)
  })

  it('payslipWorkedMinutes sums closed records and skips open/inverted', () => {
    const logs = [
      { checkIn: new Date('2026-07-01T08:00:00'), checkOut: new Date('2026-07-01T17:00:00') },
      { checkIn: new Date('2026-07-02T09:00:00'), checkOut: null },
      { checkIn: null, checkOut: new Date('2026-07-03T16:00:00') },
      { checkIn: new Date('2026-07-04T16:00:00'), checkOut: new Date('2026-07-04T09:00:00') },
    ]
    expect(payslipWorkedMinutes(logs)).toBe(540)
  })
})
