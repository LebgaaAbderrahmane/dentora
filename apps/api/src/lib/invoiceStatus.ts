// Payment status is derived, never stored: amounts come from payments (Phase 2.3);
// until then the paid amount is 0 so any issued invoice is UNPAID. Calling this
// out of the status enum means a paid/partial state cannot drift from reality.
// Pure module (no prisma import) so it is unit-testable without a DATABASE_URL.
export function invoiceStatus(input: {
  paidDZD: number
  subtotalDZD: number
  voidedAt: Date | null
}): 'UNPAID' | 'PARTIAL' | 'PAID' | 'VOID' {
  if (input.voidedAt) return 'VOID'
  if (input.paidDZD >= input.subtotalDZD && input.subtotalDZD > 0) return 'PAID'
  if (input.paidDZD > 0) return 'PARTIAL'
  return 'UNPAID'
}
