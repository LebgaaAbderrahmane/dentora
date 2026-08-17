import { Router } from 'express'
import {
  expenseInputSchema,
  expenseQuerySchema,
  expenseSchema,
  expenseUpdateSchema,
  type ExpenseCategory,
} from '@dentora/contracts'
import { requireAuth, requireRole, assertAuth } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'

const router = Router()

// Expenses are the finance desk's book: only ADMIN and ACCOUNTANT read or write.
// Clinical roles collect revenue but never record the clinic's costs (ADR 020).
router.use(requireAuth, requireRole('ADMIN', 'ACCOUNTANT'))

function toExpense(row: {
  id: string
  branchId: string
  category: ExpenseCategory
  amountDZD: number
  description: string
  incurredAt: Date
  voidedAt: Date | null
  createdAt: Date
  updatedAt: Date
  createdById: string | null
}) {
  return expenseSchema.parse({
    id: row.id,
    branchId: row.branchId,
    category: row.category,
    amountDZD: row.amountDZD,
    description: row.description,
    incurredAt: row.incurredAt.toISOString(),
    voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdById: row.createdById,
  })
}

router.get('/', async (req, res) => {
  const parsed = expenseQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { q, category, from, to, voided, limit, offset } = parsed.data

  const where: Record<string, unknown> = { branchId }
  if (q) where.description = { contains: q, mode: 'insensitive' as const }
  if (category) where.category = category
  if (from || to) {
    where.incurredAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }
  if (voided === 'only') where.voidedAt = { not: null }
  else where.voidedAt = null

  const [total, rows] = await prisma.$transaction([
    prisma.expense.count({ where: where as never }),
    prisma.expense.findMany({
      where: where as never,
      orderBy: [{ incurredAt: 'desc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ])

  res.json({ items: rows.map(toExpense), total })
})

router.get('/:id', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const row = await prisma.expense.findFirst({
    where: { id: req.params.id as string, branchId },
  })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  res.json(toExpense(row))
})

router.post('/', async (req, res) => {
  const parsed = expenseInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId, id: actorId } = assertAuth(req).user
  const input = parsed.data

  const created = await prisma.expense.create({
    data: {
      branchId,
      category: input.category,
      amountDZD: input.amountDZD,
      description: input.description,
      incurredAt: input.incurredAt ? new Date(input.incurredAt) : new Date(),
      createdById: actorId,
    },
  })

  await recordAuditFor(req)({
    action: 'EXPENSE_CREATE',
    targetType: 'EXPENSE',
    targetId: created.id,
    metadata: {
      amountDZD: created.amountDZD,
      category: created.category,
      incurredAt: created.incurredAt.toISOString(),
      description: created.description,
    },
  })
  res.status(201).json(toExpense(created))
})

router.patch('/:id', async (req, res) => {
  const parsed = expenseUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const existing = await prisma.expense.findFirst({
    where: { id: req.params.id as string, branchId },
  })
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  if (existing.voidedAt) {
    res.status(400).json({ error: 'ALREADY_VOID' })
    return
  }
  const input = parsed.data
  const updated = await prisma.expense.update({
    where: { id: existing.id },
    data: {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.amountDZD !== undefined ? { amountDZD: input.amountDZD } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.incurredAt !== undefined ? { incurredAt: new Date(input.incurredAt) } : {}),
    },
  })

  await recordAuditFor(req)({
    action: 'EXPENSE_UPDATE',
    targetType: 'EXPENSE',
    targetId: updated.id,
    metadata: {
      before: {
        category: existing.category,
        amountDZD: existing.amountDZD,
        description: existing.description,
        incurredAt: existing.incurredAt.toISOString(),
      },
      after: {
        category: updated.category,
        amountDZD: updated.amountDZD,
        description: updated.description,
        incurredAt: updated.incurredAt.toISOString(),
      },
    },
  })
  res.json(toExpense(updated))
})

router.post('/:id/void', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const existing = await prisma.expense.findFirst({
    where: { id: req.params.id as string, branchId },
  })
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  if (existing.voidedAt) {
    res.status(400).json({ error: 'ALREADY_VOID' })
    return
  }
  const updated = await prisma.expense.update({
    where: { id: existing.id },
    data: { voidedAt: new Date() },
  })

  await recordAuditFor(req)({
    action: 'EXPENSE_VOID',
    targetType: 'EXPENSE',
    targetId: updated.id,
    metadata: {
      amountDZD: updated.amountDZD,
      category: updated.category,
      incurredAt: updated.incurredAt.toISOString(),
    },
  })
  res.json(toExpense(updated))
})

export default router
