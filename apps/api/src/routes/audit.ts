import { Router } from 'express'
import {
  auditListSchema,
  auditPurgeResultSchema,
  auditQuerySchema,
  auditRetentionUpdateSchema,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import {
  applyRetentionUpdate,
  loadStoredRetention,
  purgeAuditLogs,
  saveStoredRetention,
  toRetentionShape,
} from '../lib/auditRetention'

const router = Router()

router.use(requireAuth, requireRole('ADMIN'))

// Configured retention policy (read): the stored `Setting` row, clamped.
router.get('/retention', async (req, res) => {
  const { branchId } = assertAuth(req).user
  res.json(toRetentionShape(await loadStoredRetention(branchId)))
})

// Update the retention policy; every save is itself audited so policy changes
// are traceable (the purged rows are gone, the policy decision is not).
router.put('/retention', async (req, res) => {
  const parsed = auditRetentionUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const stored = await loadStoredRetention(branchId)
  const next = applyRetentionUpdate(stored, parsed.data)
  await saveStoredRetention(branchId, next)
  await recordAuditFor(req)({
    action: 'AUDIT_RETENTION_UPDATE',
    targetType: 'AUDIT',
    targetId: branchId,
    metadata: { enabled: next.enabled, days: next.days },
  })
  res.json(toRetentionShape(next))
})

// Manual purge ("purge now"), same path as the interval sweep. Returns 409 while
// disabled so the UI surfaces the kill-switch instead of showing a fake 0 run.
router.post('/retention/purge', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const stored = await loadStoredRetention(branchId)
  if (!stored.enabled) {
    res.status(409).json({ error: 'AUDIT_RETENTION_DISABLED' })
    return
  }
  const result = await purgeAuditLogs(branchId, stored)
  if (result.deleted > 0) {
    await saveStoredRetention(branchId, {
      ...stored,
      lastPurgedAt: new Date().toISOString(),
    })
  }
  res.json(auditPurgeResultSchema.parse(result))
})

router.get('/', async (req, res) => {
  const parsed = auditQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { action, targetType, actorEmail, from, to, limit, offset } = parsed.data

  const createdAt = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to) } : {}),
  }
  const where = {
    branchId,
    ...(action ? { action } : {}),
    ...(targetType ? { targetType } : {}),
    ...(actorEmail ? { actorEmail: { contains: actorEmail, mode: 'insensitive' as const } } : {}),
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
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
