import { paymentSchema, type Payment, type PaymentKind } from '@dentora/contracts'
import { prisma } from './prisma'

export function toPayment(row: {
  id: string
  invoiceId: string
  kind: PaymentKind
  method: Payment['method']
  amountDZD: number
  reference: string | null
  notes: string | null
  receivedAt: Date
  refundsId: string | null
  createdAt: Date
  createdById: string | null
}): Payment {
  return paymentSchema.parse({
    id: row.id,
    invoiceId: row.invoiceId,
    kind: row.kind,
    method: row.method,
    amountDZD: row.amountDZD,
    reference: row.reference,
    notes: row.notes,
    receivedAt: row.receivedAt.toISOString(),
    refundsId: row.refundsId,
    createdAt: row.createdAt.toISOString(),
    createdById: row.createdById,
  })
}

// Derived paid amount per invoice: one groupBy with both kinds, then receipts minus
// refunds. Used by the invoices list/detail/void and the payment create/refund guards —
// a single derived figure, never a stored counter (ADR 014/019).
export async function paidForInvoices(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map()
  const groups = await prisma.payment.groupBy({
    by: ['invoiceId', 'kind'],
    _sum: { amountDZD: true },
    where: { invoiceId: { in: ids } },
  })
  const paid = new Map<string, number>()
  for (const g of groups) {
    const amount = g._sum.amountDZD ?? 0
    paid.set(g.invoiceId, (paid.get(g.invoiceId) ?? 0) + (g.kind === 'RECEIPT' ? amount : -amount))
  }
  return paid
}

export async function paymentNetFor(invoiceId: string): Promise<number> {
  return (await paidForInvoices([invoiceId])).get(invoiceId) ?? 0
}

// Total already refunded against one receipt — bounds a new refund (ADR 019).
export async function refundedForPayment(paymentId: string): Promise<number> {
  const agg = await prisma.payment.aggregate({
    where: { refundsId: paymentId },
    _sum: { amountDZD: true },
  })
  return agg._sum.amountDZD ?? 0
}
