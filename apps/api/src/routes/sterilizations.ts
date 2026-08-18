import { Router } from 'express'
import {
  sterilizationInputSchema,
  sterilizationListSchema,
  sterilizationLogSchema,
  sterilizationQuerySchema,
  sterilizationUpdateSchema,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { applySterilizationTransition } from '../lib/sterilizationMath'

const router = Router()

// Sterilization logs (3.6, ADR 026). Reads are open to the clinical trio + ACCOUNTANT
// (a traceability record like the stock journal); writes are a clinical/technical act
// (ADMIN/DENTIST/RECEPTIONIST). No hard deletes — mistakes are re-recorded.
router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT'))

type SterilizationRow = {
  id: string
  branchId: string
  productId: string | null
  instrument: string
  method: 'AUTOCLAVE' | 'CHEMICAL' | 'UV' | 'OTHER'
  cycle: number | null
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  startedAt: Date
  completedAt: Date | null
  operator: { name: string } | null
  notes: string | null
  createdBy: { name: string } | null
  createdAt: Date
}

function toLog(row: SterilizationRow) {
  return sterilizationLogSchema.parse({
    id: row.id,
    branchId: row.branchId,
    productId: row.productId,
    instrument: row.instrument,
    method: row.method,
    cycle: row.cycle,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    operatorName: row.operator?.name ?? null,
    notes: row.notes,
    createdByName: row.createdBy?.name ?? null,
    createdAt: row.createdAt.toISOString(),
  })
}

const LOG_INCLUDE = {
  operator: { select: { name: true } },
  createdBy: { select: { name: true } },
} as const

router.get('/', async (req, res) => {
  const parsed = sterilizationQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { status, productId, operatorId, from, to, limit, offset } = parsed.data

  const where: Record<string, unknown> = { branchId }
  if (status) where.status = status
  if (productId) where.productId = productId
  if (operatorId) where.operatorId = operatorId
  if (from || to) {
    where.startedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const [total, rows] = await prisma.$transaction([
    prisma.sterilizationLog.count({ where: where as never }),
    prisma.sterilizationLog.findMany({
      where: where as never,
      include: LOG_INCLUDE,
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ])

  res.json(sterilizationListSchema.parse({ items: rows.map(toLog), total }))
})

router.post('/', requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST'), async (req, res) => {
  const parsed = sterilizationInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId, id: actorId } = assertAuth(req).user
  const input = parsed.data

  if (input.productId) {
    const product = await prisma.product.findFirst({
      where: { id: input.productId, branchId },
    })
    if (!product) {
      res.status(404).json({ error: 'NOT_FOUND' })
      return
    }
  }

  const log = await prisma.sterilizationLog.create({
    data: {
      branchId,
      productId: input.productId ?? null,
      instrument: input.instrument,
      method: input.method,
      cycle: input.cycle ?? null,
      startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
      operatorId: input.operatorId ?? actorId,
      notes: input.notes ?? null,
      createdById: actorId,
    },
    include: LOG_INCLUDE,
  })

  await recordAuditFor(req)({
    action: 'STERILIZATION_CREATE',
    targetType: 'STERILIZATION',
    targetId: log.id,
    metadata: {
      instrument: log.instrument,
      method: log.method,
      cycle: log.cycle,
      operatorId: log.operatorId,
    },
  })

  res.status(201).json(toLog(log))
})

router.patch('/:id', requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST'), async (req, res) => {
  const parsed = sterilizationUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const existing = await prisma.sterilizationLog.findFirst({
    where: { id: req.params.id as string, branchId },
    include: LOG_INCLUDE,
  })
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }

  const nextStatus = parsed.data.status ?? existing.status
  const transition = applySterilizationTransition(existing.status, nextStatus)
  if (!transition.ok) {
    res.status(400).json({ error: transition.error })
    return
  }

  const terminal = transition.status !== 'IN_PROGRESS'
  const log = await prisma.sterilizationLog.update({
    where: { id: existing.id },
    data: {
      status: transition.status,
      notes: parsed.data.notes !== undefined ? parsed.data.notes : existing.notes,
      method: parsed.data.method ?? existing.method,
      completedAt:
        parsed.data.status === undefined ? existing.completedAt : terminal ? new Date() : null,
    },
    include: LOG_INCLUDE,
  })

  await recordAuditFor(req)({
    action: 'STERILIZATION_UPDATE',
    targetType: 'STERILIZATION',
    targetId: log.id,
    metadata: {
      beforeStatus: existing.status,
      afterStatus: log.status,
      method: log.method,
      cycle: log.cycle,
      notesChanged: parsed.data.notes !== undefined,
    },
  })

  res.json(toLog(log))
})

export default router
