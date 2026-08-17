import { Router } from 'express'
import {
  paymentCreateSchema,
  paymentListSchema,
  paymentQuerySchema,
  refundCreateSchema,
  type PaymentMethod,
} from '@dentora/contracts'
import { requireAuth, requireRole, assertAuth } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { balanceDue, refundableRemaining } from '../lib/paymentMath'
import { paymentNetFor, refundedForPayment, toPayment } from '../lib/payments'

const router = Router()

// Money is a checkout/finance-desk activity: clinical trio + ACCOUNTANT read the ledger;
// only ADMIN and RECEPTIONIST collect payments or issue refunds (same desk as create/void).
router.use(requireAuth, requireRole('ADMIN', 'RECEPTIONIST', 'ACCOUNTANT', 'DENTIST'))
const canWrite = requireRole('ADMIN', 'RECEPTIONIST')

function invoiceTotals(lines: Array<{ priceDZD: number; quantity: number }>): {
  subtotalDZD: number
  totalDZD: number
} {
  const subtotalDZD = lines.reduce((sum, l) => sum + l.priceDZD * l.quantity, 0)
  return { subtotalDZD, totalDZD: subtotalDZD }
}

router.get('/', async (req, res) => {
  const parsed = paymentQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { invoiceId, invoiceNumber, limit, offset } = parsed.data

  const where: Record<string, unknown> = { branchId }
  if (invoiceId) where.invoiceId = invoiceId
  if (invoiceNumber) where.invoice = { invoiceNumber }

  const [total, rows] = await prisma.$transaction([
    prisma.payment.count({ where: where as never }),
    prisma.payment.findMany({
      where: where as never,
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ])

  res.json(paymentListSchema.parse({ items: rows.map(toPayment), total }))
})

// Records a receipt (money in). No payment on a voided invoice; never overpays the
// invoice total; the running paid amount is derived, never stored (ADR 019).
router.post('/', canWrite, async (req, res) => {
  const parsed = paymentCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId, id: actorId } = assertAuth(req).user
  const input = parsed.data

  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, branchId },
    include: {
      lines: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  })
  if (!invoice) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  if (invoice.voidedAt) {
    res.status(400).json({ error: 'INVOICE_VOIDED' })
    return
  }
  const { totalDZD } = invoiceTotals(invoice.lines)
  const paidSoFar = await paymentNetFor(invoice.id)
  if (paidSoFar + input.amountDZD > totalDZD) {
    res.status(400).json({ error: 'PAYMENT_EXCEEDS_BALANCE' })
    return
  }

  const created = await prisma.payment.create({
    data: {
      branchId: invoice.branchId,
      invoiceId: invoice.id,
      kind: 'RECEIPT',
      method: input.method as PaymentMethod,
      amountDZD: input.amountDZD,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
      createdById: actorId,
    },
  })

  const patientName = `${invoice.patient.firstName} ${invoice.patient.lastName}`.trim()
  await recordAuditFor(req)({
    action: 'PAYMENT_CREATE',
    targetType: 'INVOICE',
    targetId: invoice.id,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      patientName,
      amountDZD: created.amountDZD,
      method: created.method,
      balanceDZD: balanceDue(totalDZD, paidSoFar + created.amountDZD),
    },
  })
  res.status(201).json(toPayment(created))
})

// Issues a refund (money out) against a receipt. Refunds are immutable rows that reverse
// the referenced receipt and are bounded by its remaining net — no over-refund (ADR 019).
router.post('/:id/refund', canWrite, async (req, res) => {
  const parsed = refundCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId, id: actorId } = assertAuth(req).user
  const input = parsed.data

  const receipt = await prisma.payment.findFirst({
    where: { id: req.params.id as string, branchId, kind: 'RECEIPT' },
    include: {
      invoice: {
        select: { invoiceNumber: true, patient: { select: { firstName: true, lastName: true } } },
      },
    },
  })
  if (!receipt) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const refundedSoFar = await refundedForPayment(receipt.id)
  const remaining = refundableRemaining(receipt.amountDZD, refundedSoFar)
  if (input.amountDZD > remaining) {
    res.status(400).json({ error: 'REFUND_EXCEEDS_RECEIPT' })
    return
  }

  const created = await prisma.payment.create({
    data: {
      branchId: receipt.branchId,
      invoiceId: receipt.invoiceId,
      kind: 'REFUND',
      method: receipt.method,
      amountDZD: input.amountDZD,
      notes: input.notes ?? null,
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
      refundsId: receipt.id,
      createdById: actorId,
    },
  })

  const patientName =
    `${receipt.invoice.patient.firstName} ${receipt.invoice.patient.lastName}`.trim()
  await recordAuditFor(req)({
    action: 'PAYMENT_REFUND',
    targetType: 'INVOICE',
    targetId: receipt.invoiceId,
    metadata: {
      invoiceNumber: receipt.invoice.invoiceNumber,
      patientName,
      amountDZD: created.amountDZD,
      method: created.method,
      refundsPaymentId: receipt.id,
    },
  })
  res.status(201).json(toPayment(created))
})

export default router
