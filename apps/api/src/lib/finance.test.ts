import { describe, expect, it } from 'vitest'
import {
  dailySeries,
  dayGrid,
  expenseStats,
  revenueStats,
  type ExpenseRow,
  type PaymentRow,
} from './finance'

const pay = (
  kind: 'RECEIPT' | 'REFUND',
  method: PaymentRow['method'],
  amountDZD: number,
  receivedAt: string,
): PaymentRow => ({ kind, method, amountDZD, receivedAt })

describe('revenueStats', () => {
  it('sums receipts minus refunds, net per method', () => {
    const rows = [
      pay('RECEIPT', 'CASH', 1000, '2026-08-17T09:00:00.000Z'),
      pay('RECEIPT', 'CARD', 2500, '2026-08-17T09:00:00.000Z'),
      pay('REFUND', 'CASH', 400, '2026-08-17T10:00:00.000Z'),
    ]
    const s = revenueStats(rows)
    expect(s.receiptsDZD).toBe(3500)
    expect(s.refundsDZD).toBe(400)
    expect(s.netDZD).toBe(3100)
    expect(s.byMethod).toEqual({ CASH: 600, CHEQUE: 0, CARD: 2500, TRANSFER: 0 })
  })

  it('is all zeros for an empty window', () => {
    const s = revenueStats([])
    expect(s.netDZD).toBe(0)
    expect(s.byMethod).toEqual({ CASH: 0, CHEQUE: 0, CARD: 0, TRANSFER: 0 })
  })
})

describe('expenseStats', () => {
  it('totals by category with all nine keys present', () => {
    const rows: ExpenseRow[] = [
      { category: 'RENT', amountDZD: 120000, incurredAt: '2026-08-17T00:00:00.000Z' },
      { category: 'SUPPLIES', amountDZD: 5000, incurredAt: '2026-08-17T00:00:00.000Z' },
      { category: 'RENT', amountDZD: 5000, incurredAt: '2026-08-18T00:00:00.000Z' },
    ]
    const s = expenseStats(rows)
    expect(s.totalDZD).toBe(130000)
    expect(s.count).toBe(3)
    expect(s.byCategory.RENT).toBe(125000)
    expect(s.byCategory.SUPPLIES).toBe(5000)
    expect(s.byCategory.OTHER).toBe(0)
    expect(Object.keys(s.byCategory).length).toBe(9)
  })
})

describe('dayGrid + dailySeries', () => {
  const from = Date.parse('2026-08-17T00:00:00.000Z')
  const to = from + 3 * 86_400_000

  it('dayGrid covers every 24h bucket of the window', () => {
    expect(dayGrid(from, to)).toEqual([
      Date.parse('2026-08-17T00:00:00.000Z'),
      Date.parse('2026-08-18T00:00:00.000Z'),
      Date.parse('2026-08-19T00:00:00.000Z'),
    ])
  })

  it('buckets payments and expenses into their days and nets each', () => {
    const payments = [
      pay('RECEIPT', 'CASH', 1000, '2026-08-17T12:00:00.000Z'),
      pay('RECEIPT', 'CASH', 800, '2026-08-18T12:00:00.000Z'),
      pay('REFUND', 'CASH', 200, '2026-08-18T13:00:00.000Z'),
    ]
    const expenses: ExpenseRow[] = [
      { category: 'RENT', amountDZD: 500, incurredAt: '2026-08-17T08:00:00.000Z' },
    ]
    const days = dailySeries(payments, expenses, from, to)
    expect(days).toHaveLength(3)
    expect(days[0]).toMatchObject({
      receiptsDZD: 1000,
      refundsDZD: 0,
      revenueDZD: 1000,
      expensesDZD: 500,
      netDZD: 500,
    })
    expect(days[1]).toMatchObject({
      receiptsDZD: 800,
      refundsDZD: 200,
      revenueDZD: 600,
      expensesDZD: 0,
      netDZD: 600,
    })
    expect(days[2]).toMatchObject({ receiptsDZD: 0, revenueDZD: 0, expensesDZD: 0, netDZD: 0 })
  })

  it('a partial last day still captures its rows', () => {
    const partialTo = from + 2 * 86_400_000 + 3_600_000
    const days = dailySeries(
      [pay('RECEIPT', 'CARD', 700, '2026-08-19T02:00:00.000Z')],
      [],
      from,
      partialTo,
    )
    expect(days).toHaveLength(3)
    expect(days[2].receiptsDZD).toBe(700)
  })
})
