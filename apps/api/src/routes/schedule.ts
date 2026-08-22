import { Router } from 'express'
import { clinicScheduleSchema } from '@dentora/contracts'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAudit, requestMeta } from '../lib/audit'
import { CONFIG_KEY, DEFAULT_CLINIC_SCHEDULE } from '../lib/clinicSchedule'

const router = Router()

router.use(requireAuth)

// Setting-backed store (ADR 037). Corrupt or partial stored values fall back to
// the defaults on read, mirroring the audit-retention loader (ADR 034).
async function loadClinicSchedule(branchId: string) {
  const row = await prisma.setting.findUnique({
    where: { branchId_key: { branchId, key: CONFIG_KEY } },
  })
  if (!row?.value) return DEFAULT_CLINIC_SCHEDULE
  try {
    return clinicScheduleSchema.parse(JSON.parse(row.value))
  } catch {
    return DEFAULT_CLINIC_SCHEDULE
  }
}

async function saveClinicSchedule(branchId: string, schedule: unknown) {
  const value = JSON.stringify(schedule)
  await prisma.setting.upsert({
    where: { branchId_key: { branchId, key: CONFIG_KEY } },
    create: { branchId, key: CONFIG_KEY, value },
    update: { value },
  })
}

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
    targetId: CONFIG_KEY,
    branchId: auth.user.branchId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    metadata: { ...parsed.data },
    ...requestMeta(req),
  })
  res.json(clinicScheduleSchema.parse(parsed.data))
})

export default router
