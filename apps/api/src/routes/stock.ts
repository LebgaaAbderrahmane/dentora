import { Router } from 'express'
import {
  type ProductUnit,
  stockAdjustInputSchema,
  stockListSchema,
  stockOutInputSchema,
  stockQuerySchema,
} from '@dentora/contracts'
import { requireAuth, requireRole, assertAuth } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { applyStock } from '../lib/stockMath'

const router = Router()

// Stock movement journal (3.3, ADR 024). Reads mirror products (clinical trio +
// ACCOUNTANT read on-hand and history — ADR 022); the movements themselves are the
// finance/management desk's book (ADMIN + ACCOUNTANT write), like expenses/purchasing.
router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT'))

function toEntry(row: {
  id: string
  branchId: string
  productId: string
  product: { name: string; unit: ProductUnit }
  type: 'OPENING' | 'IN' | 'OUT' | 'ADJUST'
  quantity: number
  unitCostDZD: number | null
  batch: string | null
  expiryDate: Date | null
  reason: string | null
  purchaseOrderId: string | null
  createdById: string | null
  createdAt: Date
}) {
  return {
    id: row.id,
    branchId: row.branchId,
    productId: row.productId,
    productName: row.product.name,
    unit: row.product.unit,
    type: row.type,
    quantity: row.quantity,
    unitCostDZD: row.unitCostDZD,
    batch: row.batch,
    expiryDate: row.expiryDate ? row.expiryDate.toISOString() : null,
    reason: row.reason,
    purchaseOrderId: row.purchaseOrderId,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
  }
}

router.get('/', async (req, res) => {
  const parsed = stockQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { productId, type, from, to, limit, offset } = parsed.data

  const where: Record<string, unknown> = { branchId }
  if (productId) where.productId = productId
  if (type) where.type = type
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const [total, rows] = await prisma.$transaction([
    prisma.stockLedgerEntry.count({ where: where as never }),
    prisma.stockLedgerEntry.findMany({
      where: where as never,
      include: { product: { select: { name: true, unit: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ])

  res.json(stockListSchema.parse({ items: rows.map(toEntry), total }))
})

router.post('/:productId/out', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const parsed = stockOutInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId, id: actorId } = assertAuth(req).user
  const input = parsed.data
  const product = await prisma.product.findFirst({
    where: { id: req.params.productId as string, branchId },
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

  const entry = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: { quantityOnHand: outcome.onHand },
    })
    return tx.stockLedgerEntry.create({
      data: {
        branchId,
        productId: product.id,
        type: 'OUT',
        quantity: input.quantity,
        reason: input.reason,
        createdAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
        createdById: actorId,
      },
      include: { product: { select: { name: true, unit: true } } },
    })
  })
  await recordAuditFor(req)({
    action: 'STOCK_OUT',
    targetType: 'PRODUCT',
    targetId: product.id,
    metadata: {
      productName: product.name,
      before: product.quantityOnHand,
      after: outcome.onHand,
      quantity: input.quantity,
      reason: input.reason,
      occurredAt: input.occurredAt ?? null,
    },
  })
  res.status(201).json(toEntry(entry))
})

router.post('/:productId/adjust', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const parsed = stockAdjustInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId, id: actorId } = assertAuth(req).user
  const input = parsed.data
  const product = await prisma.product.findFirst({
    where: { id: req.params.productId as string, branchId },
  })
  if (!product || product.archivedAt) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }

  const outcome = applyStock(product.quantityOnHand, 'ADJUST', input.quantity)
  if (!outcome.ok) {
    res.status(400).json({ error: 'INSUFFICIENT_STOCK' })
    return
  }

  const entry = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: { quantityOnHand: outcome.onHand },
    })
    return tx.stockLedgerEntry.create({
      data: {
        branchId,
        productId: product.id,
        type: 'ADJUST',
        quantity: input.quantity,
        reason: input.reason,
        batch: input.batch || null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        createdAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
        createdById: actorId,
      },
      include: { product: { select: { name: true, unit: true } } },
    })
  })
  await recordAuditFor(req)({
    action: 'STOCK_ADJUST',
    targetType: 'PRODUCT',
    targetId: product.id,
    metadata: {
      productName: product.name,
      before: product.quantityOnHand,
      after: outcome.onHand,
      quantity: input.quantity,
      reason: input.reason,
      batch: input.batch ?? null,
      expiryDate: input.expiryDate ?? null,
      occurredAt: input.occurredAt ?? null,
    },
  })
  res.status(201).json(toEntry(entry))
})

export default router
