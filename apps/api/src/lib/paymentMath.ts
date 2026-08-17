// Pure money math for payments — no prisma import so it is unit-testable without a
// DATABASE_URL (same CI-safe split as invoiceStatus.ts). paidDZD is always derived:
// receipts are money in, refunds money out, never negative, all whole dinars (ADR 017/019).
export type Kind = 'RECEIPT' | 'REFUND'

// Net paid amount for a set of payment rows (rows may be either kind).
export function netPaid(rows: Array<{ kind: Kind; amountDZD: number }>): number {
  return rows.reduce((sum, p) => (p.kind === 'RECEIPT' ? sum + p.amountDZD : sum - p.amountDZD), 0)
}

// How much of a receipt is still refundable given what has already been refunded.
export function refundableRemaining(receiptAmountDZD: number, refundedDZD: number): number {
  return Math.max(0, receiptAmountDZD - refundedDZD)
}

// Outstanding balance after payments; clamps so it can never read negative.
export function balanceDue(totalDZD: number, paidDZD: number): number {
  return Math.max(0, totalDZD - paidDZD)
}
