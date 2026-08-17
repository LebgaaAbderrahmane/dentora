// Pure finance aggregation for the 2.5 close-out / P&L report (ADR 021).
// No prisma import — CI-testable. All values whole dinars; day buckets are fixed
// 24h steps from `from`, so the API stays timezone-agnostic (Algeria: UTC+1, no DST).
import { EXPENSE_CATEGORIES } from '@dentora/contracts'
import type {
  ExpenseCategory,
  FinanceByMethod,
  PaymentKind,
  PaymentMethod,
} from '@dentora/contracts'

export const DAY_MS = 86_400_000

export interface PaymentRow {
  kind: PaymentKind
  method: PaymentMethod
  amountDZD: number
  receivedAt: Date | string | number
}

export interface ExpenseRow {
  category: ExpenseCategory
  amountDZD: number
  incurredAt: Date | string | number
}

export function revenueStats(rows: readonly PaymentRow[]): {
  receiptsDZD: number
  refundsDZD: number
  netDZD: number
  byMethod: FinanceByMethod
} {
  const byMethod: FinanceByMethod = { CASH: 0, CHEQUE: 0, CARD: 0, TRANSFER: 0 }
  let receiptsDZD = 0
  let refundsDZD = 0
  for (const r of rows) {
    if (r.kind === 'RECEIPT') {
      receiptsDZD += r.amountDZD
      byMethod[r.method] += r.amountDZD
    } else {
      refundsDZD += r.amountDZD
      byMethod[r.method] -= r.amountDZD
    }
  }
  return { receiptsDZD, refundsDZD, netDZD: receiptsDZD - refundsDZD, byMethod }
}

export function expenseStats(rows: readonly ExpenseRow[]): {
  totalDZD: number
  count: number
  byCategory: Record<ExpenseCategory, number>
} {
  const byCategory = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0])) as Record<
    ExpenseCategory,
    number
  >
  let totalDZD = 0
  for (const r of rows) {
    totalDZD += r.amountDZD
    byCategory[r.category] += r.amountDZD
  }
  return { totalDZD, count: rows.length, byCategory }
}

// Start instants (ms) of every 24h bucket covering [fromMs, toMs).
export function dayGrid(fromMs: number, toMs: number): number[] {
  const days: number[] = []
  for (let s = fromMs; s < toMs; s += DAY_MS) days.push(s)
  return days
}

export interface FinanceDayRow {
  start: string
  receiptsDZD: number
  refundsDZD: number
  revenueDZD: number
  expensesDZD: number
  netDZD: number
}

export function dailySeries(
  payments: readonly PaymentRow[],
  expenses: readonly ExpenseRow[],
  fromMs: number,
  toMs: number,
): FinanceDayRow[] {
  const grid = dayGrid(fromMs, toMs)
  const days = grid.map((start) => ({
    start: new Date(start).toISOString(),
    receiptsDZD: 0,
    refundsDZD: 0,
    revenueDZD: 0,
    expensesDZD: 0,
    netDZD: 0,
  }))
  const bucketOf = (tMs: number) => Math.floor((tMs - fromMs) / DAY_MS)
  for (const p of payments) {
    const i = bucketOf(new Date(p.receivedAt).getTime())
    if (i < 0 || i >= days.length) continue
    if (p.kind === 'RECEIPT') days[i].receiptsDZD += p.amountDZD
    else days[i].refundsDZD += p.amountDZD
  }
  for (const e of expenses) {
    const i = bucketOf(new Date(e.incurredAt).getTime())
    if (i < 0 || i >= days.length) continue
    days[i].expensesDZD += e.amountDZD
  }
  for (const d of days) {
    d.revenueDZD = d.receiptsDZD - d.refundsDZD
    d.netDZD = d.revenueDZD - d.expensesDZD
  }
  return days
}
