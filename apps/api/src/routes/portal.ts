import { Router } from 'express'
import {
  patientPrefsSchema,
  portalAppointmentsSchema,
  portalBookingSchema,
  portalBookedSchema,
  portalDentistListSchema,
  portalInvoicesSchema,
  portalMeSchema,
  type Gender,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { encrypt } from '../lib/encryption'
import {
  APPOINTMENT_SELECT,
  findConflicts,
  mapNames,
  sendConflict,
  toAppointment,
} from './appointments'
import { toInvoice, toInvoiceDetail } from './invoices'
import { paidForInvoices } from '../lib/payments'

const router = Router()

// Patient self-service. Identity is always the session's linked patient — the
// portal never accepts a patient/user id from the request body, so a patient
// can only ever read/mutate their own rows (ADR 031).
router.use(requireAuth, requireRole('PATIENT'))

async function ownPatient(req: Parameters<typeof assertAuth>[0]) {
  const { user } = assertAuth(req)
  if (!user.patientId) return null
  return prisma.patient.findFirst({
    where: { id: user.patientId, branchId: user.branchId },
  })
}

router.get('/me', async (req, res) => {
  const patient = await ownPatient(req)
  if (!patient) {
    res.status(403).json({ error: 'NO_PORTAL_PATIENT' })
    return
  }
  res.json(
    portalMeSchema.parse({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      gender: patient.gender as Gender | null,
      birthDate: patient.birthDate ? patient.birthDate.toISOString() : null,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      notifyWhatsapp: patient.notifyWhatsapp,
      notifyEmail: patient.notifyEmail,
    }),
  )
})

router.get('/prefs', async (req, res) => {
  const patient = await ownPatient(req)
  if (!patient) {
    res.status(403).json({ error: 'NO_PORTAL_PATIENT' })
    return
  }
  res.json(
    patientPrefsSchema.parse({
      notifyWhatsapp: patient.notifyWhatsapp,
      notifyEmail: patient.notifyEmail,
    }),
  )
})

router.put('/prefs', async (req, res) => {
  const parsed = patientPrefsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const patient = await ownPatient(req)
  if (!patient) {
    res.status(403).json({ error: 'NO_PORTAL_PATIENT' })
    return
  }
  const updated = await prisma.patient.update({
    where: { id: patient.id },
    data: parsed.data,
    select: { notifyWhatsapp: true, notifyEmail: true },
  })
  res.json(patientPrefsSchema.parse(updated))
})

router.get('/dentists', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const dentists = await prisma.user.findMany({
    where: { branchId, role: 'DENTIST', active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  res.json(portalDentistListSchema.parse({ dentists }))
})

router.get('/appointments', async (req, res) => {
  const patient = await ownPatient(req)
  if (!patient) {
    res.status(403).json({ error: 'NO_PORTAL_PATIENT' })
    return
  }
  const rows = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    orderBy: { startAt: 'asc' },
    select: APPOINTMENT_SELECT,
  })
  res.json(portalAppointmentsSchema.parse({ items: rows.map(mapNames).map(toAppointment) }))
})

router.post('/bookings', async (req, res) => {
  const parsed = portalBookingSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { user } = assertAuth(req)
  const patient = await ownPatient(req)
  if (!patient) {
    res.status(403).json({ error: 'NO_PORTAL_PATIENT' })
    return
  }
  const input = parsed.data
  const { branchId } = user

  const dentistId = input.dentistId ?? null
  if (dentistId) {
    const dentist = await prisma.user.findFirst({
      where: { id: dentistId, branchId, role: 'DENTIST', active: true },
    })
    if (!dentist) {
      res.status(400).json({ error: 'UNKNOWN_DENTIST' })
      return
    }
  }

  const startAt = new Date(input.startAt)
  const endAt = new Date(input.endAt)
  const overlaps = await findConflicts(branchId, {
    startAt,
    endAt,
    dentistId,
    patientId: patient.id,
  })
  if (overlaps.length > 0) {
    sendConflict(res, overlaps)
    return
  }

  const created = await prisma.appointment.create({
    data: {
      branchId,
      patientId: patient.id,
      dentistId,
      startAt,
      endAt,
      status: 'PENDING',
      notes: input.notes ? encrypt(input.notes) : null,
      createdById: user.id,
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
      source: 'portal',
    },
  })
  res.status(201).json(portalBookedSchema.parse(toAppointment(mapNames(created))))
})

router.post('/appointments/:id/cancel', async (req, res) => {
  const patient = await ownPatient(req)
  if (!patient) {
    res.status(403).json({ error: 'NO_PORTAL_PATIENT' })
    return
  }
  const { branchId } = assertAuth(req).user
  const id = req.params.id as string
  const row = await prisma.appointment.findFirst({
    where: { id, patientId: patient.id, branchId },
    select: APPOINTMENT_SELECT,
  })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  if (row.status === 'CANCELLED' || row.status === 'NOSHOW' || row.status === 'COMPLETED') {
    res.status(400).json({ error: 'NOT_CANCELLABLE' })
    return
  }
  if (row.startAt.getTime() <= Date.now()) {
    res.status(400).json({ error: 'NOT_CANCELLABLE' })
    return
  }
  const updated = await prisma.appointment.update({
    where: { id: row.id },
    data: { status: 'CANCELLED' },
    select: APPOINTMENT_SELECT,
  })
  await recordAuditFor(req)({
    action: 'APPOINTMENT_CANCEL',
    targetType: 'PATIENT',
    targetId: patient.id,
    metadata: {
      appointmentId: updated.id,
      startAt: updated.startAt.toISOString(),
      source: 'portal',
    },
  })
  res.json(portalBookedSchema.parse(toAppointment(mapNames(updated))))
})

router.get('/invoices', async (req, res) => {
  const patient = await ownPatient(req)
  if (!patient) {
    res.status(403).json({ error: 'NO_PORTAL_PATIENT' })
    return
  }
  const { branchId } = assertAuth(req).user
  const rows = await prisma.invoice.findMany({
    where: { branchId, patientId: patient.id },
    orderBy: { issuedAt: 'desc' },
    include: { patient: { select: { firstName: true, lastName: true } }, lines: true },
  })
  const paid = await paidForInvoices(rows.map((r) => r.id))
  res.json(
    portalInvoicesSchema.parse({
      items: rows.map((r) => toInvoice(r, r.lines ?? [], paid.get(r.id) ?? 0)),
      total: rows.length,
    }),
  )
})

router.get('/invoices/:id', async (req, res) => {
  const patient = await ownPatient(req)
  if (!patient) {
    res.status(403).json({ error: 'NO_PORTAL_PATIENT' })
    return
  }
  const { branchId } = assertAuth(req).user
  const row = await prisma.invoice.findFirst({
    where: { id: req.params.id as string, branchId, patientId: patient.id },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      lines: true,
      payments: { orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }] },
    },
  })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  res.json(toInvoiceDetail(row))
})

export default router
