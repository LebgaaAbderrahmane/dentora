// Pure expense math for close-out / P&L (2.5) — no prisma import so it is unit-testable
// without a DATABASE_URL (CI-safe split, same as invoiceStatus/paymentMath). All whole dinars.
export type ExpenseCategoryKey =
  | 'SALARY'
  | 'RENT'
  | 'SUPPLIES'
  | 'EQUIPMENT'
  | 'UTILITIES'
  | 'MAINTENANCE'
  | 'MARKETING'
  | 'TAXES'
  | 'OTHER'

export function expenseSums(
  rows: Array<{ category: ExpenseCategoryKey; amountDZD: number }>,
): Map<ExpenseCategoryKey, number> {
  const sums = new Map<ExpenseCategoryKey, number>()
  for (const r of rows) {
    sums.set(r.category, (sums.get(r.category) ?? 0) + r.amountDZD)
  }
  return sums
}

export function expenseTotal(rows: Array<{ amountDZD: number }>): number {
  return rows.reduce((sum, r) => sum + r.amountDZD, 0)
}
