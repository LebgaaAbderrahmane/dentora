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
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
  if (!user || !user.active) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS' })
    return
  }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!valid) {
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
  setSessionCookie(res, token)
  res.json(authResponseSchema.parse({ user: toSafeUser(user) }))
})

router.post('/logout', requireAuth, async (req, res) => {
  const { sessionId } = assertAuth(req)
  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } })
  clearSessionCookie(res)
  res.status(204).end()
})

router.get('/me', requireAuth, (req, res) => {
  res.json(authResponseSchema.parse({ user: assertAuth(req).user }))
})

router.post('/revoke-all', requireAuth, async (req, res) => {
  const { user, sessionId } = assertAuth(req)
  const { count } = await prisma.session.updateMany({
    where: { userId: user.id, id: { not: sessionId }, revokedAt: null },
    data: { revokedAt: new Date() },
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
  res.status(204).end()
})

export default router
