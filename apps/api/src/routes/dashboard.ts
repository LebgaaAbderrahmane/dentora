import { Router } from 'express'
import {
  dashboardKpisQuerySchema,
  dashboardKpisSchema,
  type AppointmentStatus,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { noShowStats } from '../lib/noShow'
import { computeExpiringLots, computeLowStock } from '../lib/alerts'
import { balanceDue } from '../lib/paymentMath'
import { totals } from './invoices'
import { paidForInvoices } from '../lib/payments'
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
  const { branchId, role } = assertAuth(req).user
  const now = new Date()
  const from = parsed.data.from ? new Date(parsed.data.from) : startOfDay(now)
  const to = parsed.data.to ? new Date(parsed.data.to) : addDays(startOfDay(now), 1)
  const windowStart = parsed.data.windowStart
    ? new Date(parsed.data.windowStart)
    : addDays(from, -30)

  // Role gates mirror the nav: stock/alerts data for everyone who can load the
  // dashboard; money and attendance figures only for the roles whose nav shows
  // those sections (a DENTIST must not read balances through this endpoint).
  const canSeeReceivables = role === 'ADMIN' || role === 'RECEPTIONIST'
  const canSeeOnDuty = role === 'ADMIN' || role === 'RECEPTIONIST'

  const [
    todayRows,
    resolved30d,
    activeWaitlist,
    patientsTotal,
    patientsNew,
    products,
    ledgerRows,
    openAttendance,
    openInvoices,
  ] = await Promise.all([
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
    prisma.product.findMany({
      where: { branchId },
      select: {
        id: true,
        name: true,
        unit: true,
        category: true,
        archivedAt: true,
        reorderLevel: true,
        quantityOnHand: true,
      },
    }),
    prisma.stockLedgerEntry.findMany({
      where: { branchId },
      select: { productId: true, type: true, quantity: true, batch: true, expiryDate: true },
    }),
    canSeeOnDuty
      ? prisma.attendanceLog.findMany({
          where: { branchId, checkOut: null, checkIn: { not: null }, date: { gte: from } },
          select: { staff: { select: { name: true } }, checkIn: true },
          orderBy: { checkIn: 'asc' },
          take: 20,
        })
      : Promise.resolve([]),
    canSeeReceivables
      ? prisma.invoice.findMany({
          where: { branchId, voidedAt: null },
          select: { id: true, lines: { select: { priceDZD: true, quantity: true } } },
        })
      : Promise.resolve([]),
  ])

  // Receivables derive exactly like /api/invoices: subtotal from snapshot lines,
  // paid via the net payments map, balance from paymentMath.
  let receivables: { totalBalanceDZD: number; unpaidCount: number } | null = null
  if (canSeeReceivables && openInvoices.length > 0) {
    const paid = await paidForInvoices(openInvoices.map((r) => r.id))
    let totalBalanceDZD = 0
    let unpaidCount = 0
    for (const row of openInvoices) {
      const { subtotalDZD } = totals(row.lines)
      const balance = balanceDue(subtotalDZD, paid.get(row.id) ?? 0)
      if (balance > 0) {
        totalBalanceDZD += balance
        unpaidCount += 1
      }
    }
    receivables = { totalBalanceDZD, unpaidCount }
  }

  const horizonMs = 30 * 24 * 60 * 60 * 1000
  const alerts = {
    lowStockCount: computeLowStock(products as never[]).length,
    expiringCount: computeExpiringLots(ledgerRows, horizonMs, now).length,
  }

  const onDuty = canSeeOnDuty
    ? {
        staff: openAttendance.map((a) => ({
          staffName: a.staff.name,
          checkInAt: (a.checkIn as Date).toISOString(),
        })),
      }
    : null

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
      receivables,
      alerts,
      onDuty,
    }),
  )
})

export default router
