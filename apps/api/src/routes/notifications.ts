import { Router } from 'express'
import {
  notificationConfigUpdateSchema,
  notificationLogQuerySchema,
  notificationLogSchema,
  notificationSweepResultSchema,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import {
  applyConfigUpdate,
  loadStoredConfig,
  runSweep,
  saveStoredConfig,
  toConfigShape,
} from '../lib/notifications'

const router = Router()

router.use(requireAuth)

// Reads/configures the delivery pipeline; handling secrets means the config
// stays ADMIN-only while the RECEPTIONIST desk can still read delivery logs.
router.get('/config', requireRole('ADMIN'), async (req, res) => {
  const { branchId } = assertAuth(req).user
  const cfg = await loadStoredConfig(branchId)
  res.json(toConfigShape(cfg))
})

router.put('/config', requireRole('ADMIN'), async (req, res) => {
  const parsed = notificationConfigUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const stored = await loadStoredConfig(branchId)
  const next = applyConfigUpdate(stored, parsed.data)
  await saveStoredConfig(branchId, next)
  await recordAuditFor(req)({
    action: 'NOTIFICATION_CONFIG_UPDATE',
    targetType: 'NOTIFICATION',
    targetId: branchId,
    metadata: {
      enabled: next.enabled,
      offsetMinutes: next.offsetMinutes,
      whatsapp: next.whatsapp.enabled,
      email: next.email.enabled,
    },
  })
  res.json(toConfigShape(next))
})

router.get('/logs', requireRole('ADMIN', 'RECEPTIONIST'), async (req, res) => {
  const parsed = notificationLogQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { appointmentId, channel, status, limit, offset } = parsed.data
  const where: Record<string, unknown> = { branchId }
  if (appointmentId) where.appointmentId = appointmentId
  if (channel) where.channel = channel
  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: limit,
      include: {
        appointment: {
          select: { patient: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.notificationLog.count({ where }),
  ])

  res.json({
    items: items.map((log) =>
      notificationLogSchema.parse({
        id: log.id,
        branchId: log.branchId,
        appointmentId: log.appointmentId,
        patientName:
          `${log.appointment.patient.firstName} ${log.appointment.patient.lastName}`.trim(),
        channel: log.channel,
        status: log.status,
        to: log.to,
        provider: log.provider,
        error: log.error,
        sentAt: log.sentAt ? log.sentAt.toISOString() : null,
        createdAt: log.createdAt.toISOString(),
      }),
    ),
    total,
  })
})

router.post('/sweep', requireRole('ADMIN'), async (req, res) => {
  const { branchId } = assertAuth(req).user
  const result = await runSweep(branchId)
  res.json(notificationSweepResultSchema.parse(result))
})

export default router
