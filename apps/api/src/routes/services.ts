import { Router, type Request, type Response } from 'express'
import {
  type ServiceCategory,
  serviceListResponseSchema,
  serviceQuerySchema,
  serviceSchema,
  serviceInputSchema,
  serviceUpdateSchema,
} from '@dentora/contracts'
import { requireAuth, requireRole, assertAuth } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'

const router = Router()

// Catalog is not PHI: no per-read audit, nothing encrypted. Pricing is
// management-sensitive, so only ADMIN may write (create/update/archive);
// the clinical trio (ADMIN/DENTIST/RECEPTIONIST) reads — they quote prices,
// durations and coverage to patients.
router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST'))

function toService(row: {
  id: string
  branchId: string
  name: string
  category: ServiceCategory
  priceDZD: number
  durationMinutes: number
  reimbursablePct: number
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return serviceSchema.parse({
    id: row.id,
    branchId: row.branchId,
    name: row.name,
    category: row.category,
    priceDZD: row.priceDZD,
    durationMinutes: row.durationMinutes,
    reimbursablePct: row.reimbursablePct,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  })
}

router.get('/', async (req, res) => {
  const parsed = serviceQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { q, category, archived, limit, offset } = parsed.data

  const where: Record<string, unknown> = { branchId }
  where.archivedAt = archived === 'only' ? { not: null } : null
  if (category) where.category = category
  if (q) where.name = { contains: String(q), mode: 'insensitive' }

  const [total, rows] = await prisma.$transaction([
    prisma.service.count({ where: where as never }),
    prisma.service.findMany({
      where: where as never,
      orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ])

  res.json(serviceListResponseSchema.parse({ items: rows.map(toService), total }))
})

router.get('/:id', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const row = await prisma.service.findFirst({ where: { id: req.params.id as string, branchId } })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  res.json(toService(row))
})

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const parsed = serviceInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const input = parsed.data

  const created = await prisma.service.create({
    data: {
      branchId,
      name: input.name,
      category: input.category,
      priceDZD: input.priceDZD,
      durationMinutes: input.durationMinutes,
      reimbursablePct: input.reimbursablePct,
    },
  })

  await recordAuditFor(req)({
    action: 'SERVICE_CREATE',
    targetType: 'SERVICE',
    targetId: created.id,
    metadata: { name: created.name, priceDZD: created.priceDZD },
  })
  res.status(201).json(toService(created))
})

router.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const parsed = serviceUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const existing = await prisma.service.findFirst({
    where: { id: req.params.id as string, branchId },
  })
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const input = parsed.data

  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.category !== undefined) data.category = input.category
  if (input.priceDZD !== undefined) data.priceDZD = input.priceDZD
  if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes
  if (input.reimbursablePct !== undefined) data.reimbursablePct = input.reimbursablePct

  const updated = await prisma.service.update({ where: { id: existing.id }, data: data as never })

  await recordAuditFor(req)({
    action: 'SERVICE_UPDATE',
    targetType: 'SERVICE',
    targetId: updated.id,
    metadata: { name: updated.name, priceDZD: updated.priceDZD },
  })
  res.json(toService(updated))
})

async function setArchived(req: Request, res: Response, archivedAt: Date | null) {
  const { branchId } = assertAuth(req).user
  const id = req.params.id as string
  const row = await prisma.service.findFirst({ where: { id, branchId } })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const updated = await prisma.service.update({
    where: { id: row.id },
    data: { archivedAt },
  })
  await recordAuditFor(req)({
    action: archivedAt ? 'SERVICE_ARCHIVE' : 'SERVICE_RESTORE',
    targetType: 'SERVICE',
    targetId: updated.id,
    metadata: { name: updated.name },
  })
  res.json(toService(updated))
}

router.post(
  '/:id/archive',
  requireRole('ADMIN'),
  (req, res) => void setArchived(req, res, new Date()),
)
router.post('/:id/restore', requireRole('ADMIN'), (req, res) => void setArchived(req, res, null))

export default router
