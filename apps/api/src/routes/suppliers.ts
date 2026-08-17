import { Router, type Request, type Response } from 'express'
import {
  supplierInputSchema,
  supplierListSchema,
  supplierQuerySchema,
  supplierSchema,
  supplierUpdateSchema,
} from '@dentora/contracts'
import { requireAuth, requireRole, assertAuth } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'

const router = Router()

// Vendor directory (ADR 023): the clinical trio + ACCOUNTANT can read; the procurement desk
// (ADMIN + ACCOUNTANT) writes. Relative to products this same division — suppliers are
// reference data, not PHI, so no per-read audit.
router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT'))

function toSupplier(row: {
  id: string
  branchId: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
  createdById: string | null
}) {
  return supplierSchema.parse({
    id: row.id,
    branchId: row.branchId,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdById: row.createdById,
  })
}

router.get('/', async (req, res) => {
  const parsed = supplierQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { q, archived, limit, offset } = parsed.data

  const where: Record<string, unknown> = { branchId }
  where.archivedAt = archived === 'only' ? { not: null } : null
  if (q) {
    where.OR = [{ name: { contains: String(q), mode: 'insensitive' as const } }]
  }

  const [total, rows] = await prisma.$transaction([
    prisma.supplier.count({ where: where as never }),
    prisma.supplier.findMany({
      where: where as never,
      orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ])

  res.json(supplierListSchema.parse({ items: rows.map(toSupplier), total }))
})

router.get('/:id', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const row = await prisma.supplier.findFirst({ where: { id: req.params.id as string, branchId } })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  res.json(toSupplier(row))
})

router.post('/', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const parsed = supplierInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId, id: actorId } = assertAuth(req).user
  const input = parsed.data

  try {
    const created = await prisma.supplier.create({
      data: {
        branchId,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        notes: input.notes || null,
        createdById: actorId,
      },
    })
    await recordAuditFor(req)({
      action: 'SUPPLIER_CREATE',
      targetType: 'SUPPLIER',
      targetId: created.id,
      metadata: { name: created.name },
    })
    res.status(201).json(toSupplier(created))
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      res.status(400).json({ error: 'NAME_TAKEN' })
      return
    }
    throw err
  }
})

router.patch('/:id', requireRole('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const parsed = supplierUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const existing = await prisma.supplier.findFirst({
    where: { id: req.params.id as string, branchId },
  })
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const input = parsed.data

  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.phone !== undefined) data.phone = input.phone || null
  if (input.email !== undefined) data.email = input.email || null
  if (input.address !== undefined) data.address = input.address || null
  if (input.notes !== undefined) data.notes = input.notes || null

  try {
    const updated = await prisma.supplier.update({
      where: { id: existing.id },
      data: data as never,
    })
    await recordAuditFor(req)({
      action: 'SUPPLIER_UPDATE',
      targetType: 'SUPPLIER',
      targetId: updated.id,
      metadata: {
        before: { name: existing.name, phone: existing.phone, email: existing.email },
        after: { name: updated.name, phone: updated.phone, email: updated.email },
      },
    })
    res.json(toSupplier(updated))
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      res.status(400).json({ error: 'NAME_TAKEN' })
      return
    }
    throw err
  }
})

async function setArchived(req: Request, res: Response, archivedAt: Date | null) {
  const { branchId } = assertAuth(req).user
  const id = req.params.id as string
  const row = await prisma.supplier.findFirst({ where: { id, branchId } })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const updated = await prisma.supplier.update({
    where: { id: row.id },
    data: { archivedAt },
  })
  await recordAuditFor(req)({
    action: archivedAt ? 'SUPPLIER_ARCHIVE' : 'SUPPLIER_RESTORE',
    targetType: 'SUPPLIER',
    targetId: updated.id,
    metadata: { name: updated.name },
  })
  res.json(toSupplier(updated))
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
