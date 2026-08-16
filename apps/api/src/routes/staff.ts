import { Router } from 'express'
import { staffDentistListSchema } from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'

const router = Router()

// minimal staff roster for scheduling UIs (dentist dropdowns). The full users
// route is ADMIN-only; DENTIST/RECEPTIONIST need a branch-scoped way to pick a
// dentist for an appointment or a waitlist entry, so here we only expose the
// dentist subset of the caller's own branch.
router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST'))

router.get('/dentists', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const dentists = await prisma.user.findMany({
    where: { branchId, role: 'DENTIST' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true },
  })
  res.json(staffDentistListSchema.parse({ dentists }))
})

export default router
