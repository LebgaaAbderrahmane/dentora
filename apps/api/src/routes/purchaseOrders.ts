import { Router, type Request } from 'express'
import {
  type ProductUnit,
  type PurchaseOrder,
  type PurchaseOrderStatus,
  purchaseOrderCreateSchema,
  purchaseOrderDetailSchema,
  purchaseOrderLineSchema,
  purchaseOrderListSchema,
  purchaseOrderQuerySchema,
  purchaseOrderReceiveSchema,
  purchaseOrderSchema,
  purchaseOrderUpdateSchema,
  type PurchaseOrderCreateLine,
} from '@dentora/contracts'
import { requireAuth, requireRole, assertAuth } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { poRemaining, poStatus, poTotalDZD } from '../lib/orderMath'

const router = Router()

// Purchasing is the finance desk's book (ADR 023), like expenses (ADR 020): ADMIN + ACCOUNTANT
// read AND write. Clinical roles never see costs — they consume stock via /api/products.
router.use(requireAuth, requireRole('ADMIN', 'ACCOUNTANT'))

type LineRow = {
  id: string
  productId: string
  productName: string
  unit: ProductUnit
  unitPriceDZD: number
  quantity: number
  receivedQuantity: number
}

type OrderRow = {
  id: string
  branchId: string
  supplierId: string | null
  supplier?: { name: string } | null
  reference: string | null
  notes: string | null
  status: PurchaseOrderStatus
  orderedAt: Date
  receivedAt: Date | null
  createdAt: Date
  updatedAt: Date
  createdById: string | null
  lines?: Array<Pick<LineRow, 'unitPriceDZD' | 'quantity'>>
}

function lineTotalDZD(l: Pick<LineRow, 'unitPriceDZD' | 'quantity'>): number {
  return l.unitPriceDZD * l.quantity
}

function toOrder(row: OrderRow): PurchaseOrder {
  const lines = row.lines ?? []
  return purchaseOrderSchema.parse({
    id: row.id,
    branchId: row.branchId,
    supplierId: row.supplierId,
    supplierName: row.supplier?.name ?? null,
    reference: row.reference,
    notes: row.notes,
    status: row.status,
    orderedAt: row.orderedAt.toISOString(),
    receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdById: row.createdById,
    totalDZD: poTotalDZD(lines),
    lineCount: lines.length,
  })
}

function toLine(l: LineRow) {
  return purchaseOrderLineSchema.parse({
    id: l.id,
    productId: l.productId,
    productName: l.productName,
    unit: l.unit,
    unitPriceDZD: l.unitPriceDZD,
    quantity: l.quantity,
    receivedQuantity: l.receivedQuantity,
    lineTotalDZD: lineTotalDZD(l),
  })
}

const listInclude = {
  supplier: { select: { name: true } },
  lines: { select: { unitPriceDZD: true, quantity: true } },
} as const

const detailInclude = {
  supplier: { select: { name: true } },
  lines: true,
} as const

router.get('/', async (req, res) => {
  const parsed = purchaseOrderQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { q, status, supplierId, limit, offset } = parsed.data

  const where: Record<string, unknown> = { branchId }
  if (status) where.status = status
  if (supplierId) where.supplierId = supplierId
  if (q) {
    where.OR = [
      { reference: { contains: String(q), mode: 'insensitive' as const } },
      { supplier: { is: { name: { contains: String(q), mode: 'insensitive' as const } } } },
    ]
  }

  const [total, rows] = await prisma.$transaction([
    prisma.purchaseOrder.count({ where: where as never }),
    prisma.purchaseOrder.findMany({
      where: where as never,
      include: listInclude,
      orderBy: [{ createdAt: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ])

  res.json(purchaseOrderListSchema.parse({ items: rows.map(toOrder), total }))
})

router.get('/:id', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const row = await prisma.purchaseOrder.findFirst({
    where: { id: req.params.id as string, branchId },
    include: detailInclude,
  })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const lines = row.lines.map(toLine)
  res.json(
    purchaseOrderDetailSchema.parse({
      ...toOrder({ ...row, lines }),
      lines,
    }),
  )
})

router.post('/', async (req, res) => {
  const parsed = purchaseOrderCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId, id: actorId } = assertAuth(req).user
  const input = parsed.data

  let supplier: { id: string; name: string } | null = null
  if (input.supplierId) {
    supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId, branchId },
      select: { id: true, name: true },
    })
    if (!supplier) {
      res.status(400).json({ error: 'UNKNOWN_SUPPLIER' })
      return
    }
  }

  const productIds = input.lines.map((l) => l.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, branchId },
    select: { id: true, name: true, unit: true },
  })
  if (products.length !== new Set(productIds).size) {
    res.status(400).json({ error: 'UNKNOWN_PRODUCT' })
    return
  }
  const productById = new Map(products.map((p) => [p.id, p]))

  const created = await prisma.purchaseOrder.create({
    data: {
      branchId,
      supplierId: supplier?.id ?? null,
      reference: input.reference || null,
      notes: input.notes || null,
      orderedAt: input.orderedAt ? new Date(input.orderedAt) : new Date(),
      createdById: actorId,
      lines: {
        create: input.lines.map((l: PurchaseOrderCreateLine) => {
          const p = productById.get(l.productId)!
          return {
            productId: p.id,
            productName: p.name,
            unit: p.unit,
            unitPriceDZD: l.unitPriceDZD,
            quantity: l.quantity,
          }
        }),
      },
    },
    include: detailInclude,
  })
  const lines = created.lines.map(toLine)
  const totalDZD = poTotalDZD(lines)
  await recordAuditFor(req)({
    action: 'PURCHASE_ORDER_CREATE',
    targetType: 'PURCHASE_ORDER',
    targetId: created.id,
    metadata: {
      reference: created.reference,
      supplierName: supplier?.name ?? null,
      status: created.status,
      totalDZD,
    },
  })
  res.status(201).json(
    purchaseOrderDetailSchema.parse({
      ...toOrder({ ...created, lines }),
      lines,
    }),
  )
})

router.patch('/:id', async (req, res) => {
  const parsed = purchaseOrderUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const existing = await prisma.purchaseOrder.findFirst({
    where: { id: req.params.id as string, branchId },
    include: { lines: { select: { receivedQuantity: true } } },
  })
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const received = existing.lines.some((l) => l.receivedQuantity > 0)
  if (received || existing.status === 'CANCELLED' || existing.status === 'RECEIVED') {
    res.status(400).json({ error: 'ORDER_LOCKED' })
    return
  }
  const input = parsed.data

  let supplierId: string | null | undefined
  if (input.supplierId !== undefined) {
    supplierId = input.supplierId
    if (supplierId) {
      const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, branchId } })
      if (!supplier) {
        res.status(400).json({ error: 'UNKNOWN_SUPPLIER' })
        return
      }
    }
  }

  const data: Record<string, unknown> = {}
  if (supplierId !== undefined) data.supplierId = supplierId
  if (input.reference !== undefined) data.reference = input.reference || null
  if (input.notes !== undefined) data.notes = input.notes || null
  if (input.orderedAt !== undefined) data.orderedAt = new Date(input.orderedAt)

  const updated = await prisma.purchaseOrder.update({
    where: { id: existing.id },
    data: data as never,
    include: detailInclude,
  })
  await recordAuditFor(req)({
    action: 'PURCHASE_ORDER_UPDATE',
    targetType: 'PURCHASE_ORDER',
    targetId: updated.id,
    metadata: {
      before: {
        supplierId: existing.supplierId,
        reference: existing.reference,
        notes: existing.notes,
        orderedAt: existing.orderedAt.toISOString(),
      },
      after: {
        supplierId: updated.supplierId,
        reference: updated.reference,
        notes: updated.notes,
        orderedAt: updated.orderedAt.toISOString(),
      },
    },
  })
  const lines = updated.lines.map(toLine)
  res.json(
    purchaseOrderDetailSchema.parse({
      ...toOrder({ ...updated, lines }),
      lines,
    }),
  )
})

async function getOrder(req: Request, include: 'lines' | 'receivedOnly') {
  const { branchId } = assertAuth(req).user
  return prisma.purchaseOrder.findFirst({
    where: { id: req.params.id as string, branchId },
    include:
      include === 'lines' ? detailInclude : { lines: { select: { receivedQuantity: true } } },
  })
}

router.post('/:id/cancel', async (req, res) => {
  const existing = await getOrder(req, 'receivedOnly')
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  if (existing.status === 'CANCELLED') {
    res.status(400).json({ error: 'ALREADY_CANCELLED' })
    return
  }
  if (existing.lines.some((l) => l.receivedQuantity > 0) || existing.status === 'RECEIVED') {
    res.status(400).json({ error: 'HAS_RECEIVED' })
    return
  }
  const updated = await prisma.purchaseOrder.update({
    where: { id: existing.id },
    data: { status: 'CANCELLED' },
    include: detailInclude,
  })
  await recordAuditFor(req)({
    action: 'PURCHASE_ORDER_CANCEL',
    targetType: 'PURCHASE_ORDER',
    targetId: updated.id,
    metadata: { reference: updated.reference, status: 'CANCELLED' },
  })
  const lines = updated.lines.map(toLine)
  res.json(
    purchaseOrderDetailSchema.parse({
      ...toOrder({ ...updated, lines }),
      lines,
    }),
  )
})

router.post('/:id/receive', async (req, res) => {
  const parsed = purchaseOrderReceiveSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const existing = await getOrder(req, 'lines')
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  if (existing.status === 'CANCELLED') {
    res.status(400).json({ error: 'ORDER_CANCELLED' })
    return
  }
  const input = parsed.data

  const byId = new Map(existing.lines.map((l) => [l.id, l]))
  const seen = new Set<string>()
  const deltas: Array<{ line: LineRow; quantity: number }> = []
  for (const item of input.lines) {
    if (seen.has(item.purchaseOrderLineId)) {
      res.status(400).json({ error: 'DUPLICATE_LINE' })
      return
    }
    seen.add(item.purchaseOrderLineId)
    const line = byId.get(item.purchaseOrderLineId)
    if (!line) {
      res.status(400).json({ error: 'UNKNOWN_LINE' })
      return
    }
    if (item.quantity > poRemaining(line)) {
      res.status(400).json({ error: 'RECEIPT_EXCEEDS_QUANTITY' })
      return
    }
    deltas.push({ line, quantity: item.quantity })
  }
  if (deltas.length === 0) {
    res.status(400).json({ error: 'INVALID_BODY' })
    return
  }

  const newLines = existing.lines.map((l) => {
    const d = deltas.find((x) => x.line.id === l.id)
    return {
      ...l,
      receivedQuantity: l.receivedQuantity + (d?.quantity ?? 0),
    }
  })
  const status = poStatus(newLines)
  const receivedAt = status === 'RECEIVED' ? new Date() : existing.receivedAt

  const updated = await prisma.$transaction(async (tx) => {
    for (const d of deltas) {
      await tx.purchaseOrderLine.update({
        where: { id: d.line.id },
        data: { receivedQuantity: { increment: d.quantity } },
      })
      await tx.product.update({
        where: { id: d.line.productId },
        data: { quantityOnHand: { increment: d.quantity } },
      })
    }
    return tx.purchaseOrder.update({
      where: { id: existing.id },
      data: { status, receivedAt },
      include: detailInclude,
    })
  })
  await recordAuditFor(req)({
    action: 'PURCHASE_ORDER_RECEIVE',
    targetType: 'PURCHASE_ORDER',
    targetId: updated.id,
    metadata: {
      reference: updated.reference,
      received: deltas.map((d) => ({ productId: d.line.productId, quantity: d.quantity })),
      status,
    },
  })
  const lines = updated.lines.map(toLine)
  res.json(
    purchaseOrderDetailSchema.parse({
      ...toOrder({ ...updated, lines }),
      lines,
    }),
  )
})

export default router
