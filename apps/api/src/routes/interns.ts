import { Router } from 'express'
import {
  internInputSchema,
  internListSchema,
  internMetaSchema,
  internProfileSchema,
  internQuerySchema,
  internUpdateSchema,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { internCompletedMinutes, internDateError, internProgressPct } from '../lib/internMath'
import { Prisma } from '../generated/prisma/client'

const router = Router()

const PROFILE_INCLUDE = {
  intern: { select: { name: true, email: true } },
  mentor: { select: { name: true } },
} as const

type ProfileRow = Prisma.InternProfileGetPayload<{ include: typeof PROFILE_INCLUDE }>

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function toInternal(profile: ProfileRow, completedMinutes: number) {
  return internProfileSchema.parse({
    id: profile.id,
    internId: profile.internId,
    internName: profile.intern.name,
    internEmail: profile.intern.email,
    school: profile.school,
    requiredHours: profile.requiredHours,
    rotation: profile.rotation,
    mentorId: profile.mentorId,
    mentorName: profile.mentor?.name ?? null,
    startDate: toIso(profile.startDate),
    endDate: toIso(profile.endDate),
    completedMinutes,
    progressPct: internProgressPct(completedMinutes, profile.requiredHours),
    active: profile.active,
    notes: profile.notes,
  })
}

function windowEnd(profile: Pick<ProfileRow, 'endDate'>): Date {
  return profile.endDate ?? new Date()
}

async function loadCompletedMinutes(profiles: ProfileRow[]): Promise<Map<string, number>> {
  if (profiles.length === 0) return new Map()
  const internIds = Array.from(new Set(profiles.map((p) => p.internId)))
  const earliestStart = new Date(Math.min(...profiles.map((p) => p.startDate.getTime())))
  const latestEnd = new Date(Math.max(...profiles.map((p) => windowEnd(p).getTime())))
  const logs = await prisma.attendanceLog.findMany({
    where: {
      staffId: { in: internIds },
      date: { gte: earliestStart, lte: latestEnd },
      checkOut: { not: null },
    },
    select: { staffId: true, date: true, checkIn: true, checkOut: true },
  })
  const perIntern = new Map<string, Array<{ checkIn: Date | null; checkOut: Date | null }>>()
  for (const log of logs) {
    const bucket = perIntern.get(log.staffId) ?? []
    bucket.push({ checkIn: log.checkIn, checkOut: log.checkOut })
    perIntern.set(log.staffId, bucket)
  }
  const result = new Map<string, number>()
  for (const profile of profiles) {
    const inWindow = (perIntern.get(profile.internId) ?? []).filter((log) => {
      return (
        log.checkOut != null &&
        log.checkOut.getTime() >= profile.startDate.getTime() &&
        log.checkOut.getTime() <= windowEnd(profile).getTime()
      )
    })
    result.set(profile.id, internCompletedMinutes(inWindow))
  }
  return result
}

// Intern profiles are HR/payroll-facing records: the accounting desk reads them
// (hours feed 4.4 payroll) and only ADMIN maintains them.
router.use(requireAuth, requireRole('ADMIN', 'ACCOUNTANT'))

router.get('/meta', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const [interns, mentors] = await Promise.all([
    prisma.user.findMany({
      where: { branchId, role: 'INTERN' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, internProfile: { select: { id: true } } },
    }),
    prisma.user.findMany({
      where: { branchId, role: 'DENTIST', active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, role: true },
    }),
  ])
  res.json(
    internMetaSchema.parse({
      interns: interns.map((i) => ({
        id: i.id,
        name: i.name,
        hasProfile: i.internProfile !== null,
      })),
      mentors,
    }),
  )
})

router.get('/', async (req, res) => {
  const parsed = internQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { search, school, rotation, active, mentorId, limit, offset } = parsed.data
  const { branchId } = assertAuth(req).user
  const where: Prisma.InternProfileWhereInput = {
    branchId,
    school,
    rotation,
    active,
    mentorId: mentorId ?? undefined,
    ...(search
      ? {
          OR: [
            { intern: { name: { contains: search, mode: 'insensitive' as const } } },
            { intern: { email: { contains: search, mode: 'insensitive' as const } } },
            { school: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }
  const [profiles, total] = await prisma.$transaction([
    prisma.internProfile.findMany({
      where,
      include: PROFILE_INCLUDE,
      orderBy: [{ active: 'desc' }, { intern: { name: 'asc' } }],
      skip: offset,
      take: limit,
    }),
    prisma.internProfile.count({ where }),
  ])
  const completed = await loadCompletedMinutes(profiles)
  res.json(
    internListSchema.parse({
      items: profiles.map((p) => toInternal(p, completed.get(p.id) ?? 0)),
      total,
    }),
  )
})

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const parsed = internInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { user } = assertAuth(req)
  const { internId, school, requiredHours, rotation, mentorId, startDate, endDate, notes } =
    parsed.data

  const intern = await prisma.user.findFirst({
    where: { id: internId, branchId: user.branchId, role: 'INTERN' },
  })
  if (!intern) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  if (mentorId) {
    const mentor = await prisma.user.findFirst({
      where: { id: mentorId, branchId: user.branchId, role: 'DENTIST' },
    })
    if (!mentor) {
      res.status(400).json({ error: 'UNKNOWN_MENTOR' })
      return
    }
  }
  const existing = await prisma.internProfile.findUnique({ where: { internId } })
  if (existing) {
    res.status(409).json({ error: 'INTERN_PROFILE_EXISTS' })
    return
  }
  const dateError = internDateError(startDate, endDate)
  if (dateError !== null) {
    res.status(422).json({ error: dateError })
    return
  }
  const created = await prisma.internProfile.create({
    data: {
      branchId: user.branchId,
      internId,
      school,
      requiredHours,
      rotation,
      mentorId: mentorId ?? null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      notes: notes ?? null,
    },
    include: PROFILE_INCLUDE,
  })
  await recordAuditFor(req)({
    action: 'INTERN_CREATE',
    targetType: 'INTERN',
    targetId: created.id,
    metadata: {
      internId,
      internName: intern.name,
      school,
      requiredHours,
      rotation,
      mentorId: mentorId ?? null,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
    },
  })
  res.status(201).json(toInternal(created, 0))
})

router.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const parsed = internUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const auth = assertAuth(req)
  const profile = await prisma.internProfile.findFirst({
    where: { id: req.params.id as string, branchId: auth.user.branchId },
    include: PROFILE_INCLUDE,
  })
  if (!profile) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const { school, requiredHours, rotation, mentorId, startDate, endDate, active, notes } =
    parsed.data
  if (mentorId !== undefined && mentorId !== null) {
    const mentor = await prisma.user.findFirst({
      where: { id: mentorId, branchId: auth.user.branchId, role: 'DENTIST' },
    })
    if (!mentor) {
      res.status(400).json({ error: 'UNKNOWN_MENTOR' })
      return
    }
  }
  const nextStartDate = startDate === undefined ? profile.startDate : new Date(startDate)
  const nextEndDate =
    endDate === undefined ? profile.endDate : endDate === null ? null : new Date(endDate)
  const dateError = internDateError(nextStartDate, nextEndDate)
  if (dateError !== null) {
    res.status(422).json({ error: dateError })
    return
  }
  const updated = await prisma.internProfile.update({
    where: { id: profile.id },
    data: {
      ...(school !== undefined ? { school } : {}),
      ...(requiredHours !== undefined ? { requiredHours } : {}),
      ...(rotation !== undefined ? { rotation } : {}),
      ...(mentorId !== undefined ? { mentorId: mentorId ?? null } : {}),
      ...(startDate !== undefined ? { startDate: nextStartDate } : {}),
      ...(endDate !== undefined ? { endDate: nextEndDate } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(notes !== undefined ? { notes: notes ?? null } : {}),
    },
    include: PROFILE_INCLUDE,
  })
  const completed = (await loadCompletedMinutes([updated])).get(updated.id) ?? 0
  await recordAuditFor(req)({
    action: 'INTERN_UPDATE',
    targetType: 'INTERN',
    targetId: updated.id,
    metadata: {
      before: {
        school: profile.school,
        requiredHours: profile.requiredHours,
        rotation: profile.rotation,
        mentorId: profile.mentorId,
        startDate: toIso(profile.startDate),
        endDate: toIso(profile.endDate),
        active: profile.active,
      },
      after: {
        school: updated.school,
        requiredHours: updated.requiredHours,
        rotation: updated.rotation,
        mentorId: updated.mentorId,
        startDate: toIso(updated.startDate),
        endDate: toIso(updated.endDate),
        active: updated.active,
      },
    },
  })
  res.json(toInternal(updated, completed))
})

export default router
