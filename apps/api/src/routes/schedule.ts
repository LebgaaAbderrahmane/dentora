import { Router } from 'express'
import { clinicScheduleSchema } from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { recordAudit, requestMeta } from '../lib/audit'
import { loadClinicSchedule, saveClinicSchedule } from '../lib/clinicSchedule'

const router = Router()

router.use(requireAuth)

// Clinic opening window + working days (ADR 037). Read by everyone who sees the
// appointments calendar; only ADMIN changes it.
router.get('/', requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST'), async (req, res) => {
  const { branchId } = assertAuth(req).user
  const schedule = await loadClinicSchedule(branchId)
  res.json(clinicScheduleSchema.parse(schedule))
})

// Full-replace update (audit-retention precedent); every save is audited so the
// change is traceable like other branch-wide config decisions.
router.put('/', requireRole('ADMIN'), async (req, res) => {
  const parsed = clinicScheduleSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const auth = assertAuth(req)
  await saveClinicSchedule(auth.user.branchId, parsed.data)
  await recordAudit({
    action: 'CLINIC_SCHEDULE_UPDATE',
    targetType: 'SYSTEM',
    targetId: 'clinic.schedule',
    branchId: auth.user.branchId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    metadata: { ...parsed.data },
    ...requestMeta(req),
  })
  res.json(clinicScheduleSchema.parse(parsed.data))
})

export default router
