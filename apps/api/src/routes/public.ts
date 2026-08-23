import bcrypt from 'bcryptjs'
import { Router } from 'express'
import {
  portalActivationInputSchema,
  portalActivationResponseSchema,
  publicBookingResponseSchema,
  publicBookingSchema,
  waitlistDuplicateErrorSchema,
} from '@dentora/contracts'
import { prisma } from '../lib/prisma'
import { recordAudit } from '../lib/audit'
import { encrypt } from '../lib/encryption'
import { allowRequest } from '../lib/rateLimit'
import { issueActivationToken, verifyActivationToken } from '../lib/activationTokens'
import {
  generateSessionToken,
  hashSessionToken,
  setSessionCookie,
  SESSION_TTL_MS,
} from '../lib/session'

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
  const { firstName, lastName, phone, email, service, preferredDate, message } = parsed.data

  // the patient is the entity the waitlist audit tracks (ADR 014); the web
  // form submits a walk-in visitor, so find-or-create by identity phone.
  let patient = await prisma.patient.findFirst({
    where: { branchId: branch.id, phone },
    select: { id: true, email: true, user: { select: { id: true } } },
  })
  if (!patient) {
    patient = await prisma.patient.create({
      data: { branchId: branch.id, firstName, lastName, phone, ...(email ? { email } : {}) },
      select: { id: true, email: true, user: { select: { id: true } } },
    })
  } else if (email && !patient.email) {
    // fill in the email only when the record has none — never clobber an
    // address the desk entered.
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: { email },
      select: { id: true, email: true, user: { select: { id: true } } },
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

  // self-activation (patient-flow loop closure): offer a one-time portal
  // account token only when the visitor left an email and no account exists.
  const activationToken =
    email && !patient.user ? issueActivationToken(patient.id, email) : undefined

  await recordAudit({
    action: 'WAITLIST_CREATE',
    targetType: 'PATIENT',
    targetId: patient.id,
    branchId: branch.id,
    metadata: {
      waitlistEntryId: entry.id,
      source: 'web',
      activationIssued: Boolean(activationToken),
    },
    ip: publicIp(req),
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
  })

  res
    .status(201)
    .json(publicBookingResponseSchema.parse({ waitlistEntryId: entry.id, activationToken }))
})

// Consume a one-time activation token: create the PATIENT user (same shape as
// the desk-side provisioning in patients.ts) and log the visitor straight in.
// Unauthenticated by design — the signed token is the credential; rate-limited
// like every other public write.
router.post('/activations/accept', async (req, res) => {
  if (!allowRequest(`activation:${publicIp(req)}`, 10)) {
    res.status(429).json({ error: 'TOO_MANY_REQUESTS' })
    return
  }
  const parsed = portalActivationInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const verified = verifyActivationToken(parsed.data.token)
  if (!verified.ok) {
    res.status(verified.reason === 'EXPIRED' ? 410 : 400).json({ error: verified.reason })
    return
  }
  const { pid, email } = verified.payload

  const patient = await prisma.patient.findFirst({
    where: { id: pid, email },
    select: {
      id: true,
      branchId: true,
      firstName: true,
      lastName: true,
      user: { select: { id: true } },
    },
  })
  if (!patient) {
    // token points at a patient that no longer exists or whose email changed
    res.status(410).json({ error: 'EXPIRED' })
    return
  }
  if (patient.user) {
    res.status(409).json({ error: 'PORTAL_ACCESS_EXISTS' })
    return
  }
  const emailTaken = await prisma.user.findUnique({ where: { email } })
  if (emailTaken) {
    res.status(409).json({ error: 'EMAIL_IN_USE' })
    return
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const user = await prisma.user.create({
    data: {
      branchId: patient.branchId,
      email,
      passwordHash,
      name: `${patient.firstName} ${patient.lastName}`.trim(),
      role: 'PATIENT',
      active: true,
      patientId: patient.id,
    },
  })

  const token = generateSessionToken()
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  })
  setSessionCookie(res, token)

  await recordAudit({
    // same Prisma enum as desk-side provisioning — this *is* a portal-access
    // creation, just patient-initiated; source flag tells them apart.
    action: 'PORTAL_ACCESS_CREATE',
    targetType: 'USER',
    targetId: user.id,
    branchId: patient.branchId,
    actorId: user.id,
    metadata: { patientId: patient.id, source: 'web-booking' },
    ip: publicIp(req),
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
  })

  res.status(201).json(portalActivationResponseSchema.parse({ email }))
})

export default router
