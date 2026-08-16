import { Router, type Request as ExpressRequest, type Response as ExpressResponse } from 'express'
import type { AuditAction, WaitlistStatus } from '@dentora/contracts'
import {
  waitlistDetailSchema,
  waitlistInputSchema,
  waitlistListSchema,
  waitlistQuerySchema,
  waitlistSchema,
  waitlistUpdateSchema,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { decrypt, encrypt } from '../lib/encryption'

const router = Router()

router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST'))

type WaitlistRow = {
  id: string
  branchId: string
  patientId: string
  patientName: string
  dentistId: string | null
  dentistName: string | null
  preferredDate: Date | null
  status: WaitlistStatus
  appointmentId: string | null
  createdAt: Date
  updatedAt: Date
}

function toEntry(row: WaitlistRow) {
  return waitlistSchema.parse({
    id: row.id,
    branchId: row.branchId,
    patientId: row.patientId,
    patientName: row.patientName,
    dentistId: row.dentistId,
    dentistName: row.dentistName,
    preferredDate: row.preferredDate ? row.preferredDate.toISOString() : null,
    status: row.status,
    appointmentId: row.appointmentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  })
}

// always select the scalar columns + display names so list rows never carry
// notes; detail rows decrypt on demand only
type WaitlistWithNames = {
  id: string
  branchId: string
  patientId: string
  patient: { firstName: string; lastName: string }
  dentistId: string | null
  dentist: { name: string } | null
  preferredDate: Date | null
  status: WaitlistStatus
  notes: string | null
  appointmentId: string | null
  createdAt: Date
  updatedAt: Date
}

const WAITLIST_SELECT = {
  id: true,
  branchId: true,
  patientId: true,
  patient: { select: { firstName: true, lastName: true } },
  dentistId: true,
  dentist: { select: { name: true } },
  preferredDate: true,
  status: true,
  notes: true,
  appointmentId: true,
  createdAt: true,
  updatedAt: true,
} as const

function mapNames(row: WaitlistWithNames): WaitlistRow {
  return {
    id: row.id,
    branchId: row.branchId,
    patientId: row.patientId,
    patientName: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
    dentistId: row.dentistId,
    dentistName: row.dentist?.name ?? null,
    preferredDate: row.preferredDate,
    status: row.status,
    appointmentId: row.appointmentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toDetail(row: WaitlistWithNames) {
  return waitlistDetailSchema.parse({
    ...toEntry(mapNames(row)),
    notes: row.notes ? decrypt(row.notes) : null,
  })
}

// a waitlist entry is always branch-scoped so a bare findFirst suffices
async function findEntryOr404(
  req: ExpressRequest,
  res: ExpressResponse,
): Promise<WaitlistWithNames | null> {
  const { branchId } = assertAuth(req).user
  const row = await prisma.waitlistEntry.findFirst({
    where: { id: req.params.id as string, branchId },
    select: WAITLIST_SELECT,
  })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return null
  }
  return row
}

// only one pending/contacted entry per patient — duplicates would clutter the board
async function assertNoActiveDuplicate(
  req: ExpressRequest,
  res: ExpressResponse,
  patientId: string,
  excludeId?: string,
): Promise<boolean> {
  const { branchId } = assertAuth(req).user
  const duplicate = await prisma.waitlistEntry.findFirst({
    where: {
      branchId,
      patientId,
      status: { in: ['PENDING', 'CONTACTED'] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
  if (duplicate) {
    res.status(409).json({ error: 'WAITLIST_ALREADY_ACTIVE', duplicateId: duplicate.id })
    return false
  }
  return true
}

// a branch-scoped user whose role is DENTIST is the only valid preferred dentist
async function assertDentistInBranch(
  req: ExpressRequest,
  res: ExpressResponse,
  dentistId?: string | null,
): Promise<boolean> {
  if (!dentistId) return true
  const { branchId } = assertAuth(req).user
  const dentist = await prisma.user.findFirst({ where: { id: dentistId, branchId } })
  if (!dentist || dentist.role !== 'DENTIST') {
    res.status(400).json({ error: 'UNKNOWN_DENTIST' })
    return false
  }
  return true
}

// GET /?status=&dentistId=&patientId=&q=&limit=&offset=
router.get('/', async (req, res) => {
  const parsed = waitlistQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { status, dentistId, patientId, q, limit, offset } = parsed.data

  const where: Record<string, unknown> = { branchId }
  if (status) where.status = status
  if (dentistId) where.dentistId = dentistId
  if (patientId) where.patientId = patientId
  if (q) {
    where.patient = {
      is: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      },
    }
  }

  const [total, rows] = await prisma.$transaction([
    prisma.waitlistEntry.count({ where: where as never }),
    prisma.waitlistEntry.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      select: WAITLIST_SELECT,
    }),
  ])

  res.json(waitlistListSchema.parse({ total, items: rows.map(mapNames).map(toEntry) }))
})

router.get('/:id', async (req, res) => {
  const row = await findEntryOr404(req, res)
  if (!row) return
  res.json(toDetail(row))
})

router.post('/', async (req, res) => {
  const parsed = waitlistInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const input = parsed.data

  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, branchId },
  })
  if (!patient) {
    res.status(400).json({ error: 'UNKNOWN_PATIENT' })
    return
  }
  if (!(await assertDentistInBranch(req, res, input.dentistId))) return
  if (!(await assertNoActiveDuplicate(req, res, patient.id))) return

  const created = await prisma.waitlistEntry.create({
    data: {
      branchId,
      patientId: patient.id,
      dentistId: input.dentistId ?? null,
      preferredDate: input.preferredDate ? new Date(input.preferredDate) : null,
      notes: input.notes ? encrypt(input.notes) : null,
      createdById: req.auth?.user.id ?? null,
    },
    select: WAITLIST_SELECT,
  })

  await recordAuditFor(req)({
    action: 'WAITLIST_CREATE',
    targetType: 'PATIENT',
    targetId: patient.id,
    metadata: { waitlistEntryId: created.id },
  })
  res.status(201).json(toDetail(created))
})

router.patch('/:id', async (req, res) => {
  const parsed = waitlistUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const input = parsed.data

  const existing = await findEntryOr404(req, res)
  if (!existing) return

  const status: WaitlistStatus = input.status ?? existing.status
  const becomingActive = status === 'PENDING' || status === 'CONTACTED'
  if (becomingActive && !(await assertNoActiveDuplicate(req, res, existing.patientId, existing.id)))
    return

  const dentistId = input.dentistId !== undefined ? (input.dentistId ?? null) : existing.dentistId
  if (!(await assertDentistInBranch(req, res, dentistId))) return

  if (status === 'BOOKED' && input.appointmentId === undefined && !existing.appointmentId) {
    res.status(400).json({ error: 'BOOKED_REQUIRES_APPOINTMENT' })
    return
  }

  // linking to an appointment keeps the staff honest: the appointment must
  // exist, be in this branch, and belong to the same patient
  let appointmentId: string | null | undefined = undefined
  if (input.appointmentId !== undefined || status === 'BOOKED') {
    const targetId =
      input.appointmentId !== undefined ? input.appointmentId : (existing.appointmentId ?? null)
    if (targetId) {
      const appointment = await prisma.appointment.findFirst({
        where: { id: targetId, branchId, patientId: existing.patientId },
        select: { id: true },
      })
      if (!appointment) {
        res.status(400).json({ error: 'UNKNOWN_APPOINTMENT' })
        return
      }
      appointmentId = appointment.id
    } else {
      appointmentId = null
    }
  }

  const data: Record<string, unknown> = {}
  if (input.dentistId !== undefined) data.dentistId = dentistId
  if (input.preferredDate !== undefined) {
    data.preferredDate = input.preferredDate ? new Date(input.preferredDate) : null
  }
  if (input.notes !== undefined) data.notes = input.notes ? encrypt(input.notes) : null
  if (input.status !== undefined) data.status = status
  if (appointmentId !== undefined) data.appointmentId = appointmentId

  const updated = await prisma.waitlistEntry.update({
    where: { id: existing.id },
    data: data as never,
    select: WAITLIST_SELECT,
  })

  let action: AuditAction = 'WAITLIST_UPDATE'
  if (status === 'BOOKED') action = 'WAITLIST_BOOK'
  else if (status === 'CANCELLED') action = 'WAITLIST_CANCEL'

  await recordAuditFor(req)({
    action,
    targetType: 'PATIENT',
    targetId: existing.patientId,
    metadata: {
      waitlistEntryId: updated.id,
      fromStatus: existing.status,
      toStatus: status,
      appointmentId: appointmentId ?? existing.appointmentId ?? null,
    },
  })

  res.json(toDetail(updated))
})

export default router
