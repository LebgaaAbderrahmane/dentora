import { Router } from 'express'
import {
  authResponseSchema,
  revokeSessionsSchema,
  updateUserRoleSchema,
  userListSchema,
} from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole, toSafeUser } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { clearSessionCookie } from '../lib/session'

const router = Router()

router.use(requireAuth, requireRole('ADMIN'))

router.get('/', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const users = await prisma.user.findMany({ where: { branchId }, orderBy: { name: 'asc' } })
  res.json(userListSchema.parse({ users: users.map(toSafeUser) }))
})

router.patch('/:id/role', async (req, res) => {
  const parsed = updateUserRoleSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { user } = assertAuth(req)
  const target = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!target || target.branchId !== user.branchId) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { role: parsed.data.role } }),
    prisma.session.updateMany({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])
  if (updated.id === user.id) clearSessionCookie(res)
  res.json(authResponseSchema.parse({ user: toSafeUser(updated) }))
})

router.post('/:id/revoke-sessions', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const target = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!target || target.branchId !== branchId) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const { count } = await prisma.session.updateMany({
    where: { userId: target.id, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  res.json(revokeSessionsSchema.parse({ revokedCount: count }))
})

export default router
