import { Router } from 'express'
import {
  invoiceCreateSchema,
  invoiceDetailSchema,
  invoiceLineSchema,
  invoiceListSchema,
  invoiceQuerySchema,
  invoiceSchema,
  type InvoiceStatus,
} from '@dentora/contracts'
import { requireAuth, requireRole, assertAuth } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { invoiceStatus, nextInvoiceNumber } from '../lib/invoice'

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

// PAID/PARTIAL cannot be matched until payments exist (Phase 2.3); with no payments,
// every issued, non-voided invoice is UNPAID — so voidedAt is a faithful proxy.
function statusWhere(status: InvoiceStatus | undefined): Record<string, unknown> {
  if (status === 'VOID') return { voidedAt: { not: null } }
  if (status === 'UNPAID') return { voidedAt: null }
  if (status === 'PARTIAL' || status === 'PAID') return { id: '__no_payments_yet__' }
  return {}
}

router.get('/', async (req, res) => {
  const parsed = invoiceQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { q, status, patientId, limit, offset } = parsed.data

  const where: Record<string, unknown> = { branchId, ...statusWhere(status) }
  if (patientId) where.patientId = patientId
  if (q) {
    const needle = Number(q)
    where.OR = [
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

  const [total, rows] = await prisma.$transaction([
    prisma.invoice.count({ where: where as never }),
    prisma.invoice.findMany({
      where: where as never,
      include: { patient: { select: { firstName: true, lastName: true } }, lines: true },
      orderBy: { issuedAt: 'desc' },
      skip: offset,
      take: limit,
    }),
  ])

  res.json(
    invoiceListSchema.parse({
      items: rows.map((r) => toInvoice(r, r.lines ?? [])),
      total,
    }),
  )
})

router.get('/:id', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const row = await prisma.invoice.findFirst({
    where: { id: req.params.id as string, branchId },
    include: { patient: { select: { firstName: true, lastName: true } }, lines: true },
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
  res.json(invoiceDetailSchema.parse({ ...toInvoice(row, lines), lines }))
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
  res.status(201).json(invoiceDetailSchema.parse({ ...toInvoice(created, lines), lines }))
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
  res.json(invoiceDetailSchema.parse({ ...toInvoice(updated, lines), lines }))
})

export default router
