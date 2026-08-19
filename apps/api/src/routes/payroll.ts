import { Router } from 'express'
import {
  payslipInputSchema,
  payslipListSchema,
  payslipQuerySchema,
  payslipSchema,
  payslipUpdateSchema,
  payrollMetaSchema,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import {
  payCheckError,
  payrollDateError,
  payslipNetDZD,
  payslipWorkedMinutes,
} from '../lib/payrollMath'
import { Prisma } from '../generated/prisma/client'

const router = Router()

const STAFF_ROLE_FILTER: Prisma.UserWhereInput['role'] = {
  in: ['ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT', 'INTERN'],
}

const SLIP_INCLUDE = {
  staff: { select: { name: true, role: true } },
  createdBy: { select: { name: true } },
} as const

type SlipRow = Prisma.PayslipGetPayload<{ include: typeof SLIP_INCLUDE }>

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function toSlip(slip: SlipRow, workedMinutes: number) {
  return payslipSchema.parse({
    id: slip.id,
    branchId: slip.branchId,
    staffId: slip.staffId,
    staffName: slip.staff.name,
    staffRole: slip.staff.role,
    periodStart: toIso(slip.periodStart),
    periodEnd: toIso(slip.periodEnd),
    baseDZD: slip.baseDZD,
    bonusDZD: slip.bonusDZD,
    deductionsDZD: slip.deductionsDZD,
    netDZD: payslipNetDZD(slip.baseDZD, slip.bonusDZD, slip.deductionsDZD),
    workedMinutes,
    notes: slip.notes,
    voidedAt: toIso(slip.voidedAt),
    createdByName: slip.createdBy?.name ?? null,
  })
}

async function loadWorkedMinutes(slips: SlipRow[]): Promise<Map<string, number>> {
  if (slips.length === 0) return new Map()
  const staffIds = Array.from(new Set(slips.map((s) => s.staffId)))
  const earliestStart = new Date(Math.min(...slips.map((s) => s.periodStart.getTime())))
  const latestEnd = new Date(Math.max(...slips.map((s) => s.periodEnd.getTime())))
  const logs = await prisma.attendanceLog.findMany({
    where: {
      staffId: { in: staffIds },
      date: { gte: earliestStart, lte: latestEnd },
      checkOut: { not: null },
    },
    select: { staffId: true, date: true, checkIn: true, checkOut: true },
  })
  const perStaff = new Map<string, Array<{ checkIn: Date | null; checkOut: Date | null }>>()
  for (const log of logs) {
    const bucket = perStaff.get(log.staffId) ?? []
    bucket.push({ checkIn: log.checkIn, checkOut: log.checkOut })
    perStaff.set(log.staffId, bucket)
  }
  const result = new Map<string, number>()
  for (const slip of slips) {
    const inWindow = (perStaff.get(slip.staffId) ?? []).filter(
      (log) =>
        log.checkOut != null &&
        log.checkOut.getTime() >= slip.periodStart.getTime() &&
        log.checkOut.getTime() <= slip.periodEnd.getTime(),
    )
    result.set(slip.id, payslipWorkedMinutes(inWindow))
  }
  return result
}

// Payroll is HR/finance-facing: the accounting desk reads worked-time + net,
// and only ADMIN maintains payslips.
router.use(requireAuth, requireRole('ADMIN', 'ACCOUNTANT'))

router.get('/meta', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const staff = await prisma.user.findMany({
    where: { branchId, role: STAFF_ROLE_FILTER, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true },
  })
  res.json(payrollMetaSchema.parse({ staff }))
})

router.get('/', async (req, res) => {
  const parsed = payslipQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { from, to, staffId, voided, limit, offset } = parsed.data
  const { branchId } = assertAuth(req).user
  const where: Prisma.PayslipWhereInput = {
    branchId,
    staffId: staffId ?? undefined,
    ...(from && to
      ? { periodStart: { lte: new Date(to) }, periodEnd: { gte: new Date(from) } }
      : from
        ? { periodEnd: { gte: new Date(from) } }
        : to
          ? { periodStart: { lte: new Date(to) } }
          : {}),
    ...(voided === undefined ? {} : voided ? { voidedAt: { not: null } } : { voidedAt: null }),
  }
  const [slips, total] = await prisma.$transaction([
    prisma.payslip.findMany({
      where,
      include: SLIP_INCLUDE,
      orderBy: [{ periodStart: 'desc' }, { staff: { name: 'asc' } }],
      skip: offset,
      take: limit,
    }),
    prisma.payslip.count({ where }),
  ])
  const worked = await loadWorkedMinutes(slips)
  res.json(
    payslipListSchema.parse({
      items: slips.map((s) => toSlip(s, worked.get(s.id) ?? 0)),
      total,
    }),
  )
})

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const parsed = payslipInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { user } = assertAuth(req)
  const { staffId, periodStart, periodEnd, baseDZD, bonusDZD, deductionsDZD, notes } = parsed.data

  const staff = await prisma.user.findFirst({
    where: { id: staffId, branchId: user.branchId, role: STAFF_ROLE_FILTER },
    select: { id: true, name: true, role: true },
  })
  if (!staff) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const amountError = payCheckError(baseDZD, bonusDZD ?? 0, deductionsDZD ?? 0)
  if (amountError !== null) {
    res.status(422).json({ error: amountError })
    return
  }
  const dateError = payrollDateError(periodStart, periodEnd)
  if (dateError !== null) {
    res.status(422).json({ error: dateError })
    return
  }
  const existing = await prisma.payslip.findUnique({
    where: {
      branchId_staffId_periodStart_periodEnd: {
        branchId: user.branchId,
        staffId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    },
  })
  if (existing) {
    res.status(409).json({ error: 'PAYSLIP_EXISTS' })
    return
  }
  const created = await prisma.payslip.create({
    data: {
      branchId: user.branchId,
      staffId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      baseDZD,
      bonusDZD: bonusDZD ?? 0,
      deductionsDZD: deductionsDZD ?? 0,
      notes: notes ?? null,
      createdById: user.id,
    },
    include: SLIP_INCLUDE,
  })
  await recordAuditFor(req)({
    action: 'PAYROLL_CREATE',
    targetType: 'PAYROLL',
    targetId: created.id,
    metadata: {
      staffId,
      staffName: staff.name,
      staffRole: staff.role,
      periodStart: new Date(periodStart).toISOString(),
      periodEnd: new Date(periodEnd).toISOString(),
      baseDZD,
      bonusDZD: bonusDZD ?? 0,
      deductionsDZD: deductionsDZD ?? 0,
    },
  })
  res.status(201).json(toSlip(created, 0))
})

router.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const parsed = payslipUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const auth = assertAuth(req)
  const slip = await prisma.payslip.findFirst({
    where: { id: req.params.id as string, branchId: auth.user.branchId },
    include: SLIP_INCLUDE,
  })
  if (!slip) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const { periodStart, periodEnd, baseDZD, bonusDZD, deductionsDZD, notes } = parsed.data
  const nextStart = periodStart === undefined ? slip.periodStart : new Date(periodStart)
  const nextEnd = periodEnd === undefined ? slip.periodEnd : new Date(periodEnd)
  const nextBase = baseDZD ?? slip.baseDZD
  const nextBonus = bonusDZD ?? slip.bonusDZD
  const nextDeductions = deductionsDZD ?? slip.deductionsDZD
  const dateError = payrollDateError(nextStart, nextEnd)
  if (dateError !== null) {
    res.status(422).json({ error: dateError })
    return
  }
  const amountError = payCheckError(nextBase, nextBonus, nextDeductions)
  if (amountError !== null) {
    res.status(422).json({ error: amountError })
    return
  }
  if (
    nextStart.getTime() !== slip.periodStart.getTime() ||
    nextEnd.getTime() !== slip.periodEnd.getTime()
  ) {
    const existing = await prisma.payslip.findUnique({
      where: {
        branchId_staffId_periodStart_periodEnd: {
          branchId: auth.user.branchId,
          staffId: slip.staffId,
          periodStart: nextStart,
          periodEnd: nextEnd,
        },
      },
    })
    if (existing) {
      res.status(409).json({ error: 'PAYSLIP_EXISTS' })
      return
    }
  }
  const updated = await prisma.payslip.update({
    where: { id: slip.id },
    data: {
      ...(periodStart !== undefined ? { periodStart: nextStart } : {}),
      ...(periodEnd !== undefined ? { periodEnd: nextEnd } : {}),
      ...(baseDZD !== undefined ? { baseDZD } : {}),
      ...(bonusDZD !== undefined ? { bonusDZD } : {}),
      ...(deductionsDZD !== undefined ? { deductionsDZD } : {}),
      ...(notes !== undefined ? { notes: notes ?? null } : {}),
    },
    include: SLIP_INCLUDE,
  })
  const worked = (await loadWorkedMinutes([updated])).get(updated.id) ?? 0
  await recordAuditFor(req)({
    action: 'PAYROLL_UPDATE',
    targetType: 'PAYROLL',
    targetId: updated.id,
    metadata: {
      before: {
        periodStart: toIso(slip.periodStart),
        periodEnd: toIso(slip.periodEnd),
        baseDZD: slip.baseDZD,
        bonusDZD: slip.bonusDZD,
        deductionsDZD: slip.deductionsDZD,
      },
      after: {
        periodStart: toIso(updated.periodStart),
        periodEnd: toIso(updated.periodEnd),
        baseDZD: updated.baseDZD,
        bonusDZD: updated.bonusDZD,
        deductionsDZD: updated.deductionsDZD,
      },
    },
  })
  res.json(toSlip(updated, worked))
})

router.post('/:id/void', requireRole('ADMIN'), async (req, res) => {
  const { user } = assertAuth(req)
  const slip = await prisma.payslip.findFirst({
    where: { id: req.params.id as string, branchId: user.branchId },
    include: SLIP_INCLUDE,
  })
  if (!slip) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  if (slip.voidedAt !== null) {
    res.status(409).json({ error: 'ALREADY_VOIDED' })
    return
  }
  const updated = await prisma.payslip.update({
    where: { id: slip.id },
    data: { voidedAt: new Date() },
    include: SLIP_INCLUDE,
  })
  await recordAuditFor(req)({
    action: 'PAYROLL_VOID',
    targetType: 'PAYROLL',
    targetId: updated.id,
    metadata: {
      staffId: slip.staffId,
      periodStart: toIso(slip.periodStart),
      periodEnd: toIso(slip.periodEnd),
      netDZD: payslipNetDZD(slip.baseDZD, slip.bonusDZD, slip.deductionsDZD),
    },
  })
  res.json(toSlip(updated, (await loadWorkedMinutes([updated])).get(updated.id) ?? 0))
})

export default router
