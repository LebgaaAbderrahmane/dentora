import bcrypt from 'bcryptjs'
import { Router } from 'express'
import {
  authResponseSchema,
  changePasswordSchema,
  loginSchema,
  revokeSessionsSchema,
} from '@dentora/contracts'
import { assertAuth, requireAuth, toSafeUser } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAudit, recordAuditFor, requestMeta } from '../lib/audit'
import {
  clearSessionCookie,
  generateSessionToken,
  hashSessionToken,
  setSessionCookie,
  SESSION_TTL_MS,
} from '../lib/session'

const router = Router()

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const email = parsed.data.email.toLowerCase()
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) {
    await recordAudit({
      action: 'LOGIN_FAILURE',
      targetType: 'SYSTEM',
      branchId: 'system',
      actorEmail: email,
      metadata: { email, reason: 'NO_USER' },
      ...requestMeta(req),
    })
    res.status(401).json({ error: 'INVALID_CREDENTIALS' })
    return
  }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!valid) {
    await recordAudit({
      action: 'LOGIN_FAILURE',
      targetType: 'USER',
      targetId: user.id,
      branchId: user.branchId,
      actorId: user.id,
      actorEmail: email,
      metadata: { email, reason: 'BAD_PASSWORD' },
      ...requestMeta(req),
    })
    res.status(401).json({ error: 'INVALID_CREDENTIALS' })
    return
  }
  const token = generateSessionToken()
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  })
  await recordAudit({
    action: 'LOGIN_SUCCESS',
    targetType: 'USER',
    targetId: user.id,
    actorId: user.id,
    actorEmail: user.email,
    branchId: user.branchId,
    ...requestMeta(req),
  })
  setSessionCookie(res, token)
  res.json(authResponseSchema.parse({ user: toSafeUser(user) }))
})

router.post('/logout', requireAuth, async (req, res) => {
  const auth = assertAuth(req)
  await prisma.session.update({ where: { id: auth.sessionId }, data: { revokedAt: new Date() } })
  await recordAuditFor(req)({ action: 'LOGOUT', targetType: 'SESSION', targetId: auth.sessionId })
  clearSessionCookie(res)
  res.status(204).end()
})

router.get('/me', requireAuth, (req, res) => {
  res.json(authResponseSchema.parse({ user: assertAuth(req).user }))
})

router.post('/revoke-all', requireAuth, async (req, res) => {
  const auth = assertAuth(req)
  const { count } = await prisma.session.updateMany({
    where: { userId: auth.user.id, id: { not: auth.sessionId }, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  await recordAuditFor(req)({
    action: 'REVOKE_ALL_SESSIONS',
    targetType: 'USER',
    targetId: auth.user.id,
    metadata: { revokedCount: count },
  })
  res.json(revokeSessionsSchema.parse({ revokedCount: count }))
})

router.post('/change-password', requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const auth = assertAuth(req)
  const user = await prisma.user.findUnique({ where: { id: auth.user.id } })
  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED' })
    return
  }
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!valid) {
    res.status(400).json({ error: 'INVALID_CURRENT_PASSWORD' })
    return
  }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.session.updateMany({
      where: { userId: user.id, id: { not: auth.sessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])
  await recordAuditFor(req)({
    action: 'CHANGE_PASSWORD',
    targetType: 'USER',
    targetId: auth.user.id,
  })
  res.status(204).end()
})

export default router
