import { Router } from 'express'
import {
  dashboardKpisQuerySchema,
  dashboardKpisSchema,
  type AppointmentStatus,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { noShowStats } from '../lib/noShow'
import { BLOCKING_VISIT_STATUSES, addDays, startOfDay, statusCounts } from '../lib/dashboard'

const router = Router()

router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST'))

// branch-scoped daily KPIs. Windows are absolute instants supplied by the
// client (the admin passes its own local "today"), so the aggregation stays
// deterministic regardless of the server's timezone. All figures are derived
// on read from appointments/waitlist/patients — nothing is stored.
router.get('/kpis', async (req, res) => {
  const parsed = dashboardKpisQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const now = new Date()
  const from = parsed.data.from ? new Date(parsed.data.from) : startOfDay(now)
  const to = parsed.data.to ? new Date(parsed.data.to) : addDays(startOfDay(now), 1)
  const windowStart = parsed.data.windowStart
    ? new Date(parsed.data.windowStart)
    : addDays(from, -30)

  const [todayRows, resolved30d, activeWaitlist, patientsTotal, patientsNew] = await Promise.all([
    prisma.appointment.findMany({
      where: { branchId, startAt: { gte: from, lt: to } },
      select: {
        id: true,
        patient: { select: { firstName: true, lastName: true } },
        dentist: { select: { name: true } },
        startAt: true,
        endAt: true,
        status: true,
      },
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: {
        branchId,
        status: { in: ['NOSHOW', 'COMPLETED'] },
        startAt: { gte: windowStart, lt: to },
      },
      _count: { _all: true },
    }),
    prisma.waitlistEntry.count({ where: { branchId, status: { in: ['PENDING', 'CONTACTED'] } } }),
    prisma.patient.count({ where: { branchId, archivedAt: null } }),
    prisma.patient.count({
      where: { branchId, archivedAt: null, createdAt: { gte: windowStart, lt: to } },
    }),
  ])

  const byStatus = statusCounts(todayRows)
  const completedCount = resolved30d.find((r) => r.status === 'COMPLETED')?._count._all ?? 0
  const noShowCount30d = resolved30d.find((r) => r.status === 'NOSHOW')?._count._all ?? 0

  const upcoming = todayRows
    .filter((r) => BLOCKING_VISIT_STATUSES.includes(r.status) && r.startAt >= now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
      dentistName: r.dentist?.name ?? null,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      status: r.status as AppointmentStatus,
    }))

  res.json(
    dashboardKpisSchema.parse({
      visits: {
        today: { total: todayRows.length, byStatus },
        upcoming,
      },
      noShow: {
        today: byStatus.NOSHOW,
        rate30d: noShowStats({ noShowCount: noShowCount30d, completedCount }).noShowRate,
      },
      waitlist: { active: activeWaitlist },
      patients: { total: patientsTotal, new30d: patientsNew },
    }),
  )
})

export default router
