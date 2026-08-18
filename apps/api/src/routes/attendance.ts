import { Router } from 'express'
import {
  attendanceInputSchema,
  attendanceListSchema,
  attendanceLogSchema,
  attendanceQuerySchema,
  attendanceRosterSchema,
  attendanceUpdateSchema,
  type Role,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { attendanceTimeError, attendanceWorkedMinutes } from '../lib/attendanceMath'

const router = Router()

const STAFF_ROLE_FILTER: { in: Role[] } = {
  in: ['ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT', 'INTERN'],
}

// Attendance is the HR/payroll-facing record: reads for the finance/management
// desk + the front desk that keeps the log, writes for ADMIN + RECEPTIONIST
// (the receptionist clocks the team in/out). Staff can be attendance targets,
// never creators of their own record via a different role.
router.use(requireAuth, requireRole('ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'))

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function toAttendance(record: {
  id: string
  branchId: string
  staffId: string
  date: Date
  checkIn: Date | null
  checkOut: Date | null
  notes: string | null
  staff: { name: string; role: Role }
  createdBy: { name: string } | null
}) {
  const worked = attendanceWorkedMinutes(record.checkIn, record.checkOut)
  return attendanceLogSchema.parse({
    id: record.id,
    branchId: record.branchId,
    staffId: record.staffId,
    staffName: record.staff.name,
    staffRole: record.staff.role,
    date: record.date.toISOString(),
    checkIn: toIso(record.checkIn),
    checkOut: toIso(record.checkOut),
    workedMinutes: worked,
    notes: record.notes,
    createdByName: record.createdBy?.name ?? '—',
  })
}

router.get('/roster', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const staff = await prisma.user.findMany({
    where: { branchId, role: STAFF_ROLE_FILTER },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true },
  })
  res.json(attendanceRosterSchema.parse({ staff }))
})

router.get('/', async (req, res) => {
  const parsed = attendanceQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { from, to, staffId, open, limit, offset } = parsed.data
  if (
    (from !== undefined && Number.isNaN(Date.parse(from))) ||
    (to !== undefined && Number.isNaN(Date.parse(to)))
  ) {
    res.status(400).json({ error: 'INVALID_QUERY' })
    return
  }
  const { branchId } = assertAuth(req).user
  const where = {
    branchId,
    staffId,
    date: {
      ...(from !== undefined ? { gte: new Date(from) } : {}),
      ...(to !== undefined ? { lte: new Date(to) } : {}),
    },
    ...(open === true ? { checkIn: { not: null }, checkOut: null } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.attendanceLog.findMany({
      where,
      include: {
        staff: { select: { name: true, role: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
    }),
    prisma.attendanceLog.count({ where }),
  ])
  res.json(
    attendanceListSchema.parse({
      items: items.map(toAttendance),
      total,
    }),
  )
})

router.post('/', requireRole('ADMIN', 'RECEPTIONIST'), async (req, res) => {
  const parsed = attendanceInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { user } = assertAuth(req)
  const { staffId, date, checkIn, checkOut, notes } = parsed.data

  const staff = await prisma.user.findFirst({
    where: { id: staffId, branchId: user.branchId, role: STAFF_ROLE_FILTER },
  })
  if (!staff) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const timeError = attendanceTimeError(checkIn, checkOut)
  if (timeError !== null) {
    res.status(422).json({ error: timeError })
    return
  }
  const dateValue = new Date(date)
  const existing = await prisma.attendanceLog.findUnique({
    where: { staffId_date: { staffId, date: dateValue } },
  })
  if (existing) {
    res.status(409).json({ error: 'ATTENDANCE_EXISTS' })
    return
  }
  const created = await prisma.attendanceLog.create({
    data: {
      branchId: user.branchId,
      staffId,
      date: dateValue,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      notes: notes ?? null,
      createdById: user.id,
    },
    include: {
      staff: { select: { name: true, role: true } },
      createdBy: { select: { name: true } },
    },
  })
  await recordAuditFor(req)({
    action: 'ATTENDANCE_CREATE',
    targetType: 'ATTENDANCE',
    targetId: created.id,
    metadata: {
      staffId,
      date: dateValue.toISOString(),
      checkIn: toIso(created.checkIn),
      checkOut: toIso(created.checkOut),
    },
  })
  res.status(201).json(toAttendance(created))
})

router.patch('/:id', requireRole('ADMIN', 'RECEPTIONIST'), async (req, res) => {
  const parsed = attendanceUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const auth = assertAuth(req)
  const record = await prisma.attendanceLog.findFirst({
    where: { id: req.params.id as string, branchId: auth.user.branchId },
    include: {
      staff: { select: { name: true, role: true } },
      createdBy: { select: { name: true } },
    },
  })
  if (!record) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const { checkIn, checkOut, notes } = parsed.data
  const nextCheckIn =
    checkIn === undefined ? record.checkIn : checkIn === null ? null : new Date(checkIn)
  const nextCheckOut =
    checkOut === undefined ? record.checkOut : checkOut === null ? null : new Date(checkOut)
  const timeError = attendanceTimeError(nextCheckIn, nextCheckOut)
  if (timeError !== null) {
    res.status(422).json({ error: timeError })
    return
  }
  const updated = await prisma.attendanceLog.update({
    where: { id: record.id },
    data: {
      ...(checkIn !== undefined ? { checkIn: nextCheckIn } : {}),
      ...(checkOut !== undefined ? { checkOut: nextCheckOut } : {}),
      ...(notes !== undefined ? { notes: notes ?? null } : {}),
    },
    include: {
      staff: { select: { name: true, role: true } },
      createdBy: { select: { name: true } },
    },
  })
  await recordAuditFor(req)({
    action: 'ATTENDANCE_UPDATE',
    targetType: 'ATTENDANCE',
    targetId: updated.id,
    metadata: {
      before: { checkIn: toIso(record.checkIn), checkOut: toIso(record.checkOut) },
      after: { checkIn: toIso(updated.checkIn), checkOut: toIso(updated.checkOut) },
    },
  })
  res.json(toAttendance(updated))
})

export default router
