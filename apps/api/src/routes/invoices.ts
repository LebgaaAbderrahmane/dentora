import { Router } from 'express'
import {
  invoiceCreateSchema,
  invoiceDetailSchema,
  invoiceLineSchema,
  invoiceListSchema,
  invoiceQuerySchema,
  invoiceSchema,
} from '@dentora/contracts'
import { requireAuth, requireRole, assertAuth } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { invoiceStatus } from '../lib/invoiceStatus'
import { nextInvoiceNumber } from '../lib/invoice'
import { balanceDue, netPaid } from '../lib/paymentMath'
import { paidForInvoices, paymentNetFor, toPayment } from '../lib/payments'

const router = Router()

// Invoicing is a checkout/finance-desk activity. The clinical + finance roles read;
// only ADMIN and RECEPTIONIST issue/void (a dentist quotes from the catalog and books,
// but does not run billing). PAID/PARTIAL states arrive with payments (Phase 2.3).
router.use(requireAuth, requireRole('ADMIN', 'RECEPTIONIST', 'ACCOUNTANT', 'DENTIST'))
const canWrite = requireRole('ADMIN', 'RECEPTIONIST')

type LineRow = {
  id: string
  serviceId: string | null
  serviceName: string
  priceDZD: number
  quantity: number
}

type InvoiceRow = {
  id: string
  branchId: string
  patientId: string
  invoiceNumber: number
  issuedAt: Date
  voidedAt: Date | null
  createdAt: Date
  updatedAt: Date
  patient: { firstName: string; lastName: string }
  lines?: LineRow[]
}

function totals(lines: Pick<LineRow, 'priceDZD' | 'quantity'>[]): {
  subtotalDZD: number
  totalDZD: number
} {
  const subtotalDZD = lines.reduce((sum, l) => sum + l.priceDZD * l.quantity, 0)
  return { subtotalDZD, totalDZD: subtotalDZD }
}

function toPatientName(p: InvoiceRow['patient']): string {
  return `${p.firstName} ${p.lastName}`.trim()
}

function toInvoice(row: InvoiceRow, lines: LineRow[], paidDZD = 0) {
  const { subtotalDZD, totalDZD } = totals(lines)
  return invoiceSchema.parse({
    id: row.id,
    branchId: row.branchId,
    patientId: row.patientId,
    patientName: toPatientName(row.patient),
    invoiceNumber: row.invoiceNumber,
    issuedAt: row.issuedAt.toISOString(),
    voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
    status: invoiceStatus({ paidDZD, subtotalDZD, voidedAt: row.voidedAt }),
    subtotalDZD,
    totalDZD,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  })
}

// Paid-dependent statuses (UNPAID/PARTIAL/PAID) are derived from paid-vs-total, so they
// are matched in memory over a branch-scoped candidate set (single-clinic volume, ADR 019);
// VOID stays a pure voidedAt scan. The summary rows always carry their derived status.
router.get('/', async (req, res) => {
  const parsed = invoiceQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { q, status, patientId, limit, offset } = parsed.data

  const baseWhere: Record<string, unknown> = { branchId }
  if (patientId) baseWhere.patientId = patientId
  if (q) {
    const needle = Number(q)
    baseWhere.OR = [
      {
        patient: {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
          ],
        },
      },
      ...(Number.isInteger(needle) && needle > 0 ? [{ invoiceNumber: needle }] : []),
    ]
  }

  const include = {
    patient: { select: { firstName: true, lastName: true } },
    lines: true,
  } as const

  // No paid-dependency: paginate in SQL, then attach paid for the status badges.
  if (!status || status === 'VOID') {
    const where: Record<string, unknown> = { ...baseWhere }
    if (status === 'VOID') where.voidedAt = { not: null }
    const [total, rows] = await prisma.$transaction([
      prisma.invoice.count({ where: where as never }),
      prisma.invoice.findMany({
        where: where as never,
        include,
        orderBy: { issuedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
    ])
    const paid = await paidForInvoices(rows.map((r) => r.id))
    res.json(
      invoiceListSchema.parse({
        items: rows.map((r) => toInvoice(r, r.lines ?? [], paid.get(r.id) ?? 0)),
        total,
      }),
    )
    return
  }

  // Paid-dependent filter: derive status for every candidate, filter, then paginate.
  const candidates = await prisma.invoice.findMany({
    where: baseWhere as never,
    include,
    orderBy: { issuedAt: 'desc' },
  })
  const paid = await paidForInvoices(candidates.map((r) => r.id))
  const filtered = candidates.filter((r) => {
    const { subtotalDZD } = totals(r.lines ?? [])
    return (
      invoiceStatus({ paidDZD: paid.get(r.id) ?? 0, subtotalDZD, voidedAt: r.voidedAt }) === status
    )
  })
  res.json(
    invoiceListSchema.parse({
      items: filtered
        .slice(offset, offset + limit)
        .map((r) => toInvoice(r, r.lines ?? [], paid.get(r.id) ?? 0)),
      total: filtered.length,
    }),
  )
})

router.get('/:id', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const row = await prisma.invoice.findFirst({
    where: { id: req.params.id as string, branchId },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      lines: true,
      payments: { orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }] },
    },
  })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const lines = row.lines.map((l) =>
    invoiceLineSchema.parse({
      id: l.id,
      serviceId: l.serviceId,
      serviceName: l.serviceName,
      priceDZD: l.priceDZD,
      quantity: l.quantity,
    }),
  )
  const paidDZD = netPaid(row.payments)
  const { totalDZD } = totals(lines)
  res.json(
    invoiceDetailSchema.parse({
      ...toInvoice(row, lines, paidDZD),
      lines,
      paidDZD,
      balanceDZD: balanceDue(totalDZD, paidDZD),
      payments: row.payments.map((p) =>
        toPayment({
          ...p,
          method: p.method as never,
          receivedAt: p.receivedAt,
          createdAt: p.createdAt,
          reference: p.reference,
          notes: p.notes,
          refundsId: p.refundsId,
          createdById: p.createdById,
        }),
      ),
    }),
  )
})

router.post('/', canWrite, async (req, res) => {
  const parsed = invoiceCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId, id: actorId } = assertAuth(req).user
  const input = parsed.data

  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, branchId },
  })
  if (!patient) {
    res.status(400).json({ error: 'UNKNOWN_PATIENT' })
    return
  }
  const serviceIds = input.lines.flatMap((l) => (l.serviceId ? [l.serviceId] : []))
  if (serviceIds.length > 0) {
    const found = await prisma.service.count({
      where: { id: { in: serviceIds }, branchId },
    })
    if (found !== serviceIds.length) {
      res.status(400).json({ error: 'UNKNOWN_SERVICE' })
      return
    }
  }

  const invoiceNumber = await nextInvoiceNumber(branchId)
  const created = await prisma.invoice.create({
    data: {
      branchId,
      patientId: patient.id,
      invoiceNumber,
      createdById: actorId,
      lines: {
        create: input.lines.map((l) => ({
          serviceId: l.serviceId ?? null,
          serviceName: l.serviceName,
          priceDZD: l.priceDZD,
          quantity: l.quantity,
        })),
      },
    },
    include: { patient: { select: { firstName: true, lastName: true } }, lines: true },
  })

  const lines = created.lines.map((l) =>
    invoiceLineSchema.parse({
      id: l.id,
      serviceId: l.serviceId,
      serviceName: l.serviceName,
      priceDZD: l.priceDZD,
      quantity: l.quantity,
    }),
  )
  const { totalDZD } = totals(lines)
  await recordAuditFor(req)({
    action: 'INVOICE_CREATE',
    targetType: 'INVOICE',
    targetId: created.id,
    metadata: {
      invoiceNumber: created.invoiceNumber,
      patientName: toPatientName(created.patient),
      totalDZD,
    },
  })
  res.status(201).json(
    invoiceDetailSchema.parse({
      ...toInvoice(created, lines),
      lines,
      paidDZD: 0,
      balanceDZD: totals(lines).totalDZD,
      payments: [],
    }),
  )
})

router.post('/:id/void', canWrite, async (req, res) => {
  const { branchId } = assertAuth(req).user
  const id = req.params.id as string
  const existing = await prisma.invoice.findFirst({
    where: { id, branchId },
    include: { patient: { select: { firstName: true, lastName: true } }, lines: true },
  })
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  if (existing.voidedAt) {
    res.status(400).json({ error: 'ALREADY_VOID' })
    return
  }
  // Money already collected cannot be voided away: refund first, then re-issue (ADR 019).
  const paidDZD = await paymentNetFor(existing.id)
  if (paidDZD > 0) {
    res.status(400).json({ error: 'INVOICE_HAS_PAYMENTS' })
    return
  }
  const updated = await prisma.invoice.update({
    where: { id: existing.id },
    data: { voidedAt: new Date() },
    include: { patient: { select: { firstName: true, lastName: true } }, lines: true },
  })
  await recordAuditFor(req)({
    action: 'INVOICE_VOID',
    targetType: 'INVOICE',
    targetId: updated.id,
    metadata: { invoiceNumber: updated.invoiceNumber, patientName: toPatientName(updated.patient) },
  })
  const lines = updated.lines.map((l) =>
    invoiceLineSchema.parse({
      id: l.id,
      serviceId: l.serviceId,
      serviceName: l.serviceName,
      priceDZD: l.priceDZD,
      quantity: l.quantity,
    }),
  )
  res.json(
    invoiceDetailSchema.parse({
      ...toInvoice(updated, lines),
      lines,
      paidDZD,
      balanceDZD: totals(lines).totalDZD,
      payments: [],
    }),
  )
})

export default router
