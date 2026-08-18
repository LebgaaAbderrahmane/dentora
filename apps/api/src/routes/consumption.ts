import { Router } from 'express'
import {
  type ProductUnit,
  treatmentConsumptionInputSchema,
  treatmentConsumptionListSchema,
  treatmentConsumptionQuerySchema,
  treatmentConsumptionSchema,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { applyStock } from '../lib/stockMath'

const router = Router()

// Treatment stock consumption (3.6, ADR 026). Reads mirror the stock journal (clinical
// trio + ACCOUNTANT); writes are a clinical act on the appointment (ADMIN/DENTIST/
// RECEPTIONIST), unlike the finance-desk manual OUT/adjust (ADMIN/ACCOUNTANT only).
router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT'))

// statuses that no longer host a treatment, so consumption is refused
const NOT_CONSUMABLE: ReadonlySet<string> = new Set(['CANCELLED', 'NOSHOW'])

type ConsumptionRow = {
  id: string
  branchId: string
  appointmentId: string
  productId: string
  product: { name: string; unit: ProductUnit }
  appointment: { patient: { firstName: string; lastName: string } }
  quantity: number
  batch: string | null
  reason: string | null
  consumedAt: Date
  createdBy: { name: string } | null
}

function toConsumption(row: ConsumptionRow) {
  return treatmentConsumptionSchema.parse({
    id: row.id,
    branchId: row.branchId,
    appointmentId: row.appointmentId,
    productId: row.productId,
    productName: row.product.name,
    unit: row.product.unit,
    patientName: `${row.appointment.patient.firstName} ${row.appointment.patient.lastName}`.trim(),
    quantity: row.quantity,
    batch: row.batch,
    reason: row.reason,
    consumedAt: row.consumedAt.toISOString(),
    createdByName: row.createdBy?.name ?? null,
  })
}

const CONSUMPTION_INCLUDE = {
  product: { select: { name: true, unit: true } },
  appointment: { select: { patient: { select: { firstName: true, lastName: true } } } },
  createdBy: { select: { name: true } },
} as const

router.get('/', async (req, res) => {
  const parsed = treatmentConsumptionQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { appointmentId, productId, from, to, limit, offset } = parsed.data

  const where: Record<string, unknown> = { branchId }
  if (appointmentId) where.appointmentId = appointmentId
  if (productId) where.productId = productId
  if (from || to) {
    where.consumedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const [total, rows] = await prisma.$transaction([
    prisma.treatmentStockConsumption.count({ where: where as never }),
    prisma.treatmentStockConsumption.findMany({
      where: where as never,
      include: CONSUMPTION_INCLUDE,
      orderBy: [{ consumedAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ])

  res.json(treatmentConsumptionListSchema.parse({ items: rows.map(toConsumption), total }))
})

router.post(
  '/appointments/:appointmentId',
  requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST'),
  async (req, res) => {
    const parsed = treatmentConsumptionInputSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
      return
    }
    const { branchId, id: actorId } = assertAuth(req).user
    const appointmentId = req.params.appointmentId as string
    const input = parsed.data

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, branchId },
      include: { patient: { select: { firstName: true, lastName: true } } },
    })
    if (!appointment) {
      res.status(404).json({ error: 'NOT_FOUND' })
      return
    }
    if (NOT_CONSUMABLE.has(appointment.status)) {
      res.status(400).json({ error: 'APPOINTMENT_NOT_CONSUMABLE' })
      return
    }

    const product = await prisma.product.findFirst({
      where: { id: input.productId, branchId },
    })
    if (!product || product.archivedAt) {
      res.status(404).json({ error: 'NOT_FOUND' })
      return
    }

    const outcome = applyStock(product.quantityOnHand, 'OUT', input.quantity)
    if (!outcome.ok) {
      res.status(400).json({ error: 'INSUFFICIENT_STOCK' })
      return
    }

    const consumption = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: { quantityOnHand: outcome.onHand },
      })
      await tx.stockLedgerEntry.create({
        data: {
          branchId,
          productId: product.id,
          type: 'OUT',
          quantity: input.quantity,
          batch: input.batch || null,
          reason: input.reason ?? null,
          appointmentId,
          createdById: actorId,
        },
      })
      return tx.treatmentStockConsumption.create({
        data: {
          branchId,
          appointmentId,
          productId: product.id,
          quantity: input.quantity,
          batch: input.batch || null,
          reason: input.reason ?? null,
          consumedAt: new Date(),
          createdById: actorId,
        },
        include: CONSUMPTION_INCLUDE,
      })
    })

    await recordAuditFor(req)({
      action: 'STOCK_OUT',
      targetType: 'PRODUCT',
      targetId: product.id,
      metadata: {
        source: 'TREATMENT',
        appointmentId,
        productName: product.name,
        before: product.quantityOnHand,
        after: outcome.onHand,
        quantity: input.quantity,
        batch: input.batch ?? null,
        reason: input.reason ?? null,
      },
    })

    res.status(201).json(toConsumption(consumption))
  },
)

export default router
