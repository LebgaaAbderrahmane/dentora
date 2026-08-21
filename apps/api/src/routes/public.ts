import { Router } from 'express'
import {
  publicBookingResponseSchema,
  publicBookingSchema,
  waitlistDuplicateErrorSchema,
} from '@dentora/contracts'
import { prisma } from '../lib/prisma'
import { recordAudit } from '../lib/audit'
import { encrypt } from '../lib/encryption'
import { allowRequest } from '../lib/rateLimit'

const router = Router()

// unauthenticated route — the marketing site's booking form lands here. It
// never creates appointments: it produces a PENDING WaitlistEntry that the
// staff board already knows how to contact/book (ADR 016). Branch is resolved
// from PUBLIC_BRANCH_ID or the clinic's first branch (single-clinic model).
// Rate-limit key: req.ip honors `trust proxy`, so the client address comes from
// the one trusted proxy hop instead of a spoofable raw header.
function publicIp(req: import('express').Request): string {
  return req.ip ?? 'unknown'
}

async function resolveBranch() {
  const configured = process.env.PUBLIC_BRANCH_ID
  if (configured) {
    const branch = await prisma.branch.findFirst({ where: { id: configured } })
    if (branch) return branch
  }
  return prisma.branch.findFirst({ orderBy: { createdAt: 'asc' } })
}

router.post('/bookings', async (req, res) => {
  if (!allowRequest(publicIp(req))) {
    res.status(429).json({ error: 'TOO_MANY_REQUESTS' })
    return
  }

  const parsed = publicBookingSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const branch = await resolveBranch()
  if (!branch) {
    res.status(503).json({ error: 'SERVICE_UNAVAILABLE' })
    return
  }
  const { firstName, lastName, phone, service, preferredDate, message } = parsed.data

  // the patient is the entity the waitlist audit tracks (ADR 014); the web
  // form submits a walk-in visitor, so find-or-create by identity phone.
  let patient = await prisma.patient.findFirst({
    where: { branchId: branch.id, phone },
  })
  if (!patient) {
    patient = await prisma.patient.create({
      data: { branchId: branch.id, firstName, lastName, phone },
    })
  }

  // reuse the same "one active entry per patient" rule as the staff flow: a
  // repeat web request for a patient already being handled answers 409.
  const active = await prisma.waitlistEntry.findFirst({
    where: { patientId: patient.id, status: { in: ['PENDING', 'CONTACTED'] } },
  })
  if (active) {
    res.status(409).json(
      waitlistDuplicateErrorSchema.parse({
        error: 'WAITLIST_ALREADY_ACTIVE',
        duplicateId: active.id,
      }),
    )
    return
  }

  const notes = [service, message].filter((v) => v && v.trim()).join(' — ')
  const entry = await prisma.waitlistEntry.create({
    data: {
      branchId: branch.id,
      patientId: patient.id,
      status: 'PENDING',
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      notes: notes ? encrypt(notes) : null,
      createdById: null,
    },
  })

  await recordAudit({
    action: 'WAITLIST_CREATE',
    targetType: 'PATIENT',
    targetId: patient.id,
    branchId: branch.id,
    metadata: { waitlistEntryId: entry.id, source: 'web' },
    ip: publicIp(req),
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
  })

  res.status(201).json(publicBookingResponseSchema.parse({ waitlistEntryId: entry.id }))
})

export default router
