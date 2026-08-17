import { Router, type Request, type Response } from 'express'
import {
  type ProductCategory,
  type ProductUnit,
  productInputSchema,
  productListSchema,
  productQuerySchema,
  productSchema,
  productUpdateSchema,
} from '@dentora/contracts'
import { requireAuth, requireRole, assertAuth } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'

const router = Router()

// Stock is management-sensitive (quantities, reorder points, ADR 022): the clinical trio
// + ACCOUNTANT reads, the finance/management desk (ADMIN + ACCOUNTANT) writes — the same
// desk that owns expenses/purchasing. No per-read audit: catalog data, not PHI.
router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT'))

function toProduct(row: {
  id: string
  branchId: string
  name: string
  code: string | null
  category: ProductCategory
  unit: ProductUnit
  reorderLevel: number
  quantityOnHand: number
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
  createdById: string | null
}) {
  return productSchema.parse({
    id: row.id,
    branchId: row.branchId,
    name: row.name,
    code: row.code,
    category: row.category,
    unit: row.unit,
    reorderLevel: row.reorderLevel,
    quantityOnHand: row.quantityOnHand,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdById: row.createdById,
  })
}

router.get('/', async (req, res) => {
  const parsed = productQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { q, category, archived, limit, offset } = parsed.data

  const where: Record<string, unknown> = { branchId }
  where.archivedAt = archived === 'only' ? { not: null } : null
  if (category) where.category = category
  if (q) {
    where.OR = [
      { name: { contains: String(q), mode: 'insensitive' as const } },
      { code: { contains: String(q), mode: 'insensitive' as const } },
    ]
  }

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where: where as never }),
    prisma.product.findMany({
      where: where as never,
      orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ])

  res.json(productListSchema.parse({ items: rows.map(toProduct), total }))
})

router.get('/:id', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const row = await prisma.product.findFirst({ where: { id: req.params.id as string, branchId } })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  res.json(toProduct(row))
})

router.post('/', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const parsed = productInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId, id: actorId } = assertAuth(req).user
  const input = parsed.data

  try {
    const created = await prisma.product.create({
      data: {
        branchId,
        name: input.name,
        code: input.code || null,
        category: input.category,
        unit: input.unit,
        reorderLevel: input.reorderLevel,
        quantityOnHand: input.quantityOnHand,
        createdById: actorId,
      },
    })
    await recordAuditFor(req)({
      action: 'PRODUCT_CREATE',
      targetType: 'PRODUCT',
      targetId: created.id,
      metadata: {
        name: created.name,
        category: created.category,
        unit: created.unit,
        quantityOnHand: created.quantityOnHand,
      },
    })
    res.status(201).json(toProduct(created))
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      res.status(400).json({ error: 'CODE_TAKEN' })
      return
    }
    throw err
  }
})

router.patch('/:id', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const parsed = productUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const existing = await prisma.product.findFirst({
    where: { id: req.params.id as string, branchId },
  })
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const input = parsed.data

  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.code !== undefined) data.code = input.code || null
  if (input.category !== undefined) data.category = input.category
  if (input.unit !== undefined) data.unit = input.unit
  if (input.reorderLevel !== undefined) data.reorderLevel = input.reorderLevel
  if (input.quantityOnHand !== undefined) data.quantityOnHand = input.quantityOnHand

  try {
    const updated = await prisma.product.update({ where: { id: existing.id }, data: data as never })
    await recordAuditFor(req)({
      action: 'PRODUCT_UPDATE',
      targetType: 'PRODUCT',
      targetId: updated.id,
      metadata: {
        before: {
          name: existing.name,
          code: existing.code,
          category: existing.category,
          unit: existing.unit,
          reorderLevel: existing.reorderLevel,
          quantityOnHand: existing.quantityOnHand,
        },
        after: {
          name: updated.name,
          code: updated.code,
          category: updated.category,
          unit: updated.unit,
          reorderLevel: updated.reorderLevel,
          quantityOnHand: updated.quantityOnHand,
        },
      },
    })
    res.json(toProduct(updated))
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      res.status(400).json({ error: 'CODE_TAKEN' })
      return
    }
    throw err
  }
})

async function setArchived(req: Request, res: Response, archivedAt: Date | null) {
  const { branchId } = assertAuth(req).user
  const id = req.params.id as string
  const row = await prisma.product.findFirst({ where: { id, branchId } })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const updated = await prisma.product.update({
    where: { id: row.id },
    data: { archivedAt },
  })
  await recordAuditFor(req)({
    action: archivedAt ? 'PRODUCT_ARCHIVE' : 'PRODUCT_RESTORE',
    targetType: 'PRODUCT',
    targetId: updated.id,
    metadata: { name: updated.name },
  })
  res.json(toProduct(updated))
}

router.post(
  '/:id/archive',
  requireRole('ADMIN', 'ACCOUNTANT'),
  (req, res) => void setArchived(req, res, new Date()),
)
router.post(
  '/:id/restore',
  requireRole('ADMIN', 'ACCOUNTANT'),
  (req, res) => void setArchived(req, res, null),
)

export default router
