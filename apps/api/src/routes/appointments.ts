import { Router, type Request as ExpressRequest, type Response as ExpressResponse } from 'express'
import type { AuditAction } from '@dentora/contracts'
import {
  appointmentConflictSchema,
  appointmentDetailSchema,
  appointmentInputSchema,
  appointmentListSchema,
  appointmentQuerySchema,
  appointmentSchema,
  appointmentUpdateSchema,
  type AppointmentStatus,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { decrypt, encrypt } from '../lib/encryption'

const router = Router()

router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST'))

// statuses that occupy a real time-slot and participate in double-booking checks
const BLOCKING_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED']

export type AppointmentRow = {
  id: string
  branchId: string
  patientId: string
  patientName: string
  dentistId: string | null
  dentistName: string | null
  startAt: Date
  endAt: Date
  status: AppointmentStatus
  createdAt: Date
  updatedAt: Date
}

export function toAppointment(row: AppointmentRow) {
  return appointmentSchema.parse({
    id: row.id,
    branchId: row.branchId,
    patientId: row.patientId,
    patientName: row.patientName,
    dentistId: row.dentistId,
    dentistName: row.dentistName,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  })
}

// the shape Prisma returns when we select appointment scalars + names
export type AppointmentWithNames = {
  id: string
  branchId: string
  patientId: string
  patient: { firstName: string; lastName: string }
  dentistId: string | null
  dentist: { name: string } | null
  startAt: Date
  endAt: Date
  status: AppointmentStatus
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

// always select the scalar columns + display names so list rows never carry
// decrypted notes and detail rows can decrypt on demand
export const APPOINTMENT_SELECT = {
  id: true,
  branchId: true,
  patientId: true,
  patient: { select: { firstName: true, lastName: true } },
  dentistId: true,
  dentist: { select: { name: true } },
  startAt: true,
  endAt: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

export function mapNames(row: AppointmentWithNames): AppointmentRow {
  return {
    id: row.id,
    branchId: row.branchId,
    patientId: row.patientId,
    patientName: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
    dentistId: row.dentistId,
    dentistName: row.dentist?.name ?? null,
    startAt: row.startAt,
    endAt: row.endAt,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toDetail(row: AppointmentWithNames) {
  return appointmentDetailSchema.parse({
    ...toAppointment(mapNames(row)),
    notes: row.notes ? decrypt(row.notes) : null,
  })
}

export type Overlap = {
  id: string
  startAt: string
  endAt: string
  kind: 'dentist' | 'patient'
  patientName: string
}

// find overlapping blocking appointments for the given dentist AND patient in
// the [startAt, endAt) window. Terminal statuses (CANCELLED/NOSHOW) never
// participate and therefore never block rebooking the slot.
export async function findConflicts(
  branchId: string,
  window: { startAt: Date; endAt: Date; dentistId: string | null; patientId: string },
  excludeId?: string,
): Promise<Overlap[]> {
  const overlapWhere = {
    branchId,
    startAt: { lt: window.endAt },
    endAt: { gt: window.startAt },
    status: { in: BLOCKING_STATUSES },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  }

  const [byDentist, byPatient] = await Promise.all([
    window.dentistId
      ? prisma.appointment.findMany({
          where: { ...overlapWhere, dentistId: window.dentistId },
          select: APPOINTMENT_SELECT,
        })
      : Promise.resolve([]),
    prisma.appointment.findMany({
      where: { ...overlapWhere, patientId: window.patientId },
      select: APPOINTMENT_SELECT,
    }),
  ])

  const seen = new Set<string>()
  const overlaps: Overlap[] = []
  for (const row of byDentist) {
    overlaps.push({
      id: row.id,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      kind: 'dentist',
      patientName: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
    })
    seen.add(row.id)
  }
  for (const row of byPatient) {
    if (seen.has(row.id)) continue
    overlaps.push({
      id: row.id,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      kind: 'patient',
      patientName: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
    })
  }

  return overlaps
}

// a branch-scoped user whose role is DENTIST is the only valid assignment
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

export function sendConflict(res: ExpressResponse, overlaps: Overlap[]): void {
  res.status(409).json(
    appointmentConflictSchema.parse({
      error: 'CONFLICT',
      overlaps: overlaps.map((o) => ({
        id: o.id,
        startAt: o.startAt,
        endAt: o.endAt,
        kind: o.kind,
        patientName: o.patientName,
      })),
    }),
  )
}

// range list — never exposes decrypted notes
router.get('/', async (req, res) => {
  const parsed = appointmentQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { start, end, status, dentistId, patientId } = parsed.data

  const where: Record<string, unknown> = {
    branchId,
    startAt: { gte: new Date(start) },
    endAt: { lte: new Date(end) },
  }
  if (status) where.status = status
  if (dentistId) where.dentistId = dentistId
  if (patientId) where.patientId = patientId

  const rows = await prisma.appointment.findMany({
    where: where as never,
    orderBy: { startAt: 'asc' },
    select: APPOINTMENT_SELECT,
  })
  res.json(appointmentListSchema.parse({ items: rows.map(mapNames).map(toAppointment) }))
})

router.get('/:id', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const row = await prisma.appointment.findFirst({
    where: { id: req.params.id as string, branchId },
    select: APPOINTMENT_SELECT,
  })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  await recordAuditFor(req)({
    action: 'APPOINTMENT_VIEW',
    targetType: 'PATIENT',
    targetId: row.patientId,
    metadata: { appointmentId: row.id },
  })
  res.json(toDetail(row))
})

router.post('/', async (req, res) => {
  const parsed = appointmentInputSchema.safeParse(req.body)
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

  const startAt = new Date(input.startAt)
  const endAt = new Date(input.endAt)
  const overlaps = await findConflicts(branchId, {
    startAt,
    endAt,
    dentistId: input.dentistId ?? null,
    patientId: input.patientId,
  })
  if (overlaps.length > 0) {
    sendConflict(res, overlaps)
    return
  }

  const created = await prisma.appointment.create({
    data: {
      branchId,
      patientId: patient.id,
      dentistId: input.dentistId ?? null,
      startAt,
      endAt,
      status: input.status ?? 'PENDING',
      notes: input.notes ? encrypt(input.notes) : null,
      createdById: req.auth?.user.id ?? null,
    },
    select: APPOINTMENT_SELECT,
  })

  await recordAuditFor(req)({
    action: 'APPOINTMENT_CREATE',
    targetType: 'PATIENT',
    targetId: patient.id,
    metadata: {
      appointmentId: created.id,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      dentistId: created.dentistId,
    },
  })
  res.status(201).json(toDetail(created))
})

router.patch('/:id', async (req, res) => {
  const parsed = appointmentUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const id = req.params.id as string
  const input = parsed.data

  const existing = await prisma.appointment.findFirst({
    where: { id, branchId },
    select: APPOINTMENT_SELECT,
  })
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }

  if (input.patientId !== undefined && input.patientId !== existing.patientId) {
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, branchId },
    })
    if (!patient) {
      res.status(400).json({ error: 'UNKNOWN_PATIENT' })
      return
    }
  }

  const dentistId = input.dentistId !== undefined ? (input.dentistId ?? null) : existing.dentistId
  if (!(await assertDentistInBranch(req, res, dentistId))) return

  const startAt = input.startAt !== undefined ? new Date(input.startAt) : existing.startAt
  const endAt = input.endAt !== undefined ? new Date(input.endAt) : existing.endAt
  if (endAt.getTime() <= startAt.getTime()) {
    res
      .status(400)
      .json({ error: 'INVALID_BODY', issues: { endAt: ['endAt must be after startAt'] } })
    return
  }
  const patientId = input.patientId ?? existing.patientId
  const status: AppointmentStatus = input.status ?? existing.status

  const becameTerminal =
    input.status !== undefined && (status === 'CANCELLED' || status === 'NOSHOW')
  const scheduleChanged =
    (input.startAt !== undefined &&
      new Date(input.startAt).getTime() !== existing.startAt.getTime()) ||
    (input.endAt !== undefined && new Date(input.endAt).getTime() !== existing.endAt.getTime()) ||
    (input.dentistId !== undefined && dentistId !== existing.dentistId) ||
    (input.patientId !== undefined && patientId !== existing.patientId)

  // moving to an overlapping slot is blocked (excluding self) unless the
  // target slot is free. Terminal transitions release the slot and never
  // conflict, whether startAt/endAt/dentistId change individually or together.
  if (scheduleChanged && !becameTerminal) {
    const overlaps = await findConflicts(
      branchId,
      { startAt, endAt, dentistId, patientId },
      existing.id,
    )
    if (overlaps.length > 0) {
      sendConflict(res, overlaps)
      return
    }
  }

  const data: Record<string, unknown> = {}
  if (input.patientId !== undefined) data.patientId = patientId
  if (input.dentistId !== undefined) data.dentistId = dentistId
  if (input.startAt !== undefined) data.startAt = startAt
  if (input.endAt !== undefined) data.endAt = endAt
  if (input.status !== undefined) data.status = status
  if (input.notes !== undefined) data.notes = input.notes ? encrypt(input.notes) : null

  const updated = await prisma.appointment.update({
    where: { id: existing.id },
    data: data as never,
    select: APPOINTMENT_SELECT,
  })

  let action: AuditAction = 'APPOINTMENT_UPDATE'
  if (status === 'CANCELLED' && input.status !== undefined) action = 'APPOINTMENT_CANCEL'
  else if (status === 'NOSHOW' && input.status !== undefined) action = 'APPOINTMENT_NOSHOW'
  else if (scheduleChanged) action = 'APPOINTMENT_RESCHEDULE'

  await recordAuditFor(req)({
    action,
    targetType: 'PATIENT',
    targetId: existing.patientId,
    metadata: {
      appointmentId: updated.id,
      fromStartAt: existing.startAt.toISOString(),
      fromEndAt: existing.endAt.toISOString(),
      toStartAt: startAt.toISOString(),
      toEndAt: endAt.toISOString(),
      status,
    },
  })

  res.json(toDetail(updated))
})

export default router
