import { Router } from 'express'
import { auditListSchema, auditQuerySchema } from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'

const router = Router()

router.use(requireAuth, requireRole('ADMIN'))

router.get('/', async (req, res) => {
  const parsed = auditQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { action, targetType, actorEmail, limit, offset } = parsed.data

  const where = {
    branchId,
    ...(action ? { action } : {}),
    ...(targetType ? { targetType } : {}),
    ...(actorEmail ? { actorEmail: { contains: actorEmail, mode: 'insensitive' as const } } : {}),
  }

  const [total, rows] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
  ])

  res.json(
    auditListSchema.parse({
      total,
      entries: rows.map((e) => ({
        id: e.id,
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        actorId: e.actorId,
        actorEmail: e.actorEmail,
        metadata: e.metadata,
        ip: e.ip,
        userAgent: e.userAgent,
        createdAt: e.createdAt.toISOString(),
      })),
    }),
  )
})

export default router
