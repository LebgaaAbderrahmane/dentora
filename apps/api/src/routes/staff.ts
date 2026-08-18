import { Router } from 'express'
import { hash } from 'bcryptjs'
import {
  resetPasswordSchema,
  staffDentistListSchema,
  staffInputSchema,
  staffListSchema,
  staffQuerySchema,
  staffScheduleInputSchema,
  staffScheduleListSchema,
  staffUpdateSchema,
  type Role,
  type Weekday,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole, toSafeUser } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { clearSessionCookie } from '../lib/session'
import { validateScheduleRows } from '../lib/scheduleMath'

const router = Router()

// "Staff" = users running the clinic (all roles except PATIENT). Management
// write/read of the directory + weekly schedules is ADMIN-only; GET /dentists
// stays open to the clinical desk for dropdowns (ADR 027).
const STAFF_ROLE_FILTER: { in: Role[] } = {
  in: ['ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT', 'INTERN'],
}

function toSchedule(s: {
  id: string
  staffId: string
  weekday: Weekday
  startTime: string
  endTime: string
  active: boolean
}) {
  return {
    id: s.id,
    staffId: s.staffId,
    weekday: s.weekday,
    startTime: s.startTime,
    endTime: s.endTime,
    active: s.active,
  }
}

function findStaffInBranch(branchId: string, id: string) {
  return prisma.user.findFirst({ where: { id, branchId, role: STAFF_ROLE_FILTER } })
}

// minimal staff roster for scheduling UIs (dentist dropdowns). The full users
// route is ADMIN-only; DENTIST/RECEPTIONIST need a branch-scoped way to pick a
// dentist for an appointment or a waitlist entry, so here we only expose the
// dentist subset of the caller's own branch.
router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST'))

router.get('/dentists', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const dentists = await prisma.user.findMany({
    where: { branchId, role: 'DENTIST', active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true },
  })
  res.json(staffDentistListSchema.parse({ dentists }))
})

// ---- staff directory & weekly schedules (ADMIN only) ----

router.get('/', requireRole('ADMIN'), async (req, res) => {
  const { branchId } = assertAuth(req).user
  const parsed = staffQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { search, role, active, limit, offset } = parsed.data
  const where = {
    branchId,
    role: role ?? STAFF_ROLE_FILTER,
    ...(active === undefined ? {} : { active }),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({ where, orderBy: { name: 'asc' }, skip: offset, take: limit }),
    prisma.user.count({ where }),
  ])
  res.json(staffListSchema.parse({ items: items.map(toSafeUser), total }))
})

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const parsed = staffInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { user } = assertAuth(req)
  const { name, email, password, role, active } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'EMAIL_IN_USE' })
    return
  }
  const passwordHash = await hash(password, 12)
  const created = await prisma.user.create({
    data: { branchId: user.branchId, email, passwordHash, name, role, active },
  })
  await recordAuditFor(req)({
    action: 'STAFF_CREATE',
    targetType: 'USER',
    targetId: created.id,
    metadata: { name, email, role },
  })
  res.status(201).json({ user: toSafeUser(created) })
})

router.get('/:id/schedules', requireRole('ADMIN'), async (req, res) => {
  const auth = assertAuth(req)
  const target = await findStaffInBranch(auth.user.branchId, req.params.id as string)
  if (!target) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const schedules = await prisma.staffSchedule.findMany({
    where: { branchId: auth.user.branchId, staffId: target.id },
    orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
  })
  res.json(staffScheduleListSchema.parse({ schedules: schedules.map(toSchedule) }))
})

router.put('/:id/schedules', requireRole('ADMIN'), async (req, res) => {
  const parsed = staffScheduleInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const auth = assertAuth(req)
  const target = await findStaffInBranch(auth.user.branchId, req.params.id as string)
  if (!target) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const validation = validateScheduleRows(parsed.data.schedules)
  if (!validation.ok) {
    res.status(422).json({ error: validation.error })
    return
  }

  await prisma.$transaction([
    prisma.staffSchedule.deleteMany({
      where: { branchId: auth.user.branchId, staffId: target.id },
    }),
    prisma.staffSchedule.createMany({
      data: validation.rows.map((r) => ({
        branchId: auth.user.branchId,
        staffId: target.id,
        weekday: r.weekday,
        startTime: r.startTime,
        endTime: r.endTime,
        active: r.active,
      })),
    }),
  ])
  await recordAuditFor(req)({
    action: 'SCHEDULE_UPDATE',
    targetType: 'SCHEDULE',
    targetId: target.id,
    metadata: { rows: validation.rows.length },
  })
  const fresh = await prisma.staffSchedule.findMany({
    where: { branchId: auth.user.branchId, staffId: target.id },
    orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
  })
  res.json(staffScheduleListSchema.parse({ schedules: fresh.map(toSchedule) }))
})

router.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const parsed = staffUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const auth = assertAuth(req)
  const target = await findStaffInBranch(auth.user.branchId, req.params.id as string)
  if (!target) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  if (parsed.data.email && parsed.data.email !== target.email) {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (existing && existing.id !== target.id) {
      res.status(409).json({ error: 'EMAIL_IN_USE' })
      return
    }
  }

  const roleChanged = parsed.data.role !== undefined && parsed.data.role !== target.role
  const [updated, revoked] = await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: parsed.data }),
    prisma.session.updateMany({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])
  if (roleChanged && target.id === auth.user.id) clearSessionCookie(res)
  await recordAuditFor(req)({
    action: 'STAFF_UPDATE',
    targetType: 'USER',
    targetId: updated.id,
    metadata: {
      changed: Object.keys(parsed.data),
      fromRole: roleChanged ? target.role : undefined,
      toRole: roleChanged ? updated.role : undefined,
      revokedSessions: roleChanged ? revoked.count : undefined,
    },
  })
  res.json({ user: toSafeUser(updated) })
})

router.post('/:id/reset-password', requireRole('ADMIN'), async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const auth = assertAuth(req)
  const target = await findStaffInBranch(auth.user.branchId, req.params.id as string)
  if (!target) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const passwordHash = await hash(parsed.data.password, 12)
  const [updated, revoked] = await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { passwordHash } }),
    prisma.session.updateMany({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])
  if (target.id === auth.user.id) clearSessionCookie(res)
  await recordAuditFor(req)({
    action: 'STAFF_PASSWORD_RESET',
    targetType: 'USER',
    targetId: updated.id,
    metadata: { revokedSessions: revoked.count },
  })
  res.json({ ok: true })
})

export default router
