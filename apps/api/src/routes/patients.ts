import { Router, type Request as ExpressRequest, type Response as ExpressResponse } from 'express'
import { z } from 'zod'
import {
  type AuditAction,
  type Gender,
  medicalHistoryResponseSchema,
  medicalHistorySchema,
  medicalHistoryWriteSchema,
  odontogramResponseSchema,
  odontogramSchema,
  odontogramWriteSchema,
  patientDetailSchema,
  patientInputSchema,
  patientListSchema,
  patientQuerySchema,
  patientSchema,
  patientUpdateSchema,
} from '@dentora/contracts'
import { Prisma } from '../generated/prisma/client'
import { assertAuth, requireAuth, requireRole } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { recordAuditFor } from '../lib/audit'
import { encrypt, decrypt } from '../lib/encryption'

const router = Router()

router.use(requireAuth, requireRole('ADMIN', 'DENTIST', 'RECEPTIONIST'))

function nullableString(value?: string): string | undefined | null {
  if (value === undefined) return undefined
  return value.trim() === '' ? null : value
}

function toSafe(row: {
  id: string
  branchId: string
  firstName: string
  lastName: string
  gender: string | null
  birthDate: Date | null
  phone: string | null
  email: string | null
  address: string | null
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return patientSchema.parse({
    id: row.id,
    branchId: row.branchId,
    firstName: row.firstName,
    lastName: row.lastName,
    gender: row.gender as Gender | null,
    birthDate: row.birthDate ? row.birthDate.toISOString() : null,
    phone: row.phone,
    email: row.email,
    address: row.address,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  })
}

function toDetail(row: Parameters<typeof toSafe>[0] & { notes: string | null }) {
  return patientDetailSchema.parse({
    ...toSafe(row),
    notes: row.notes ? decrypt(row.notes) : null,
  })
}

router.get('/', async (req, res) => {
  const parsed = patientQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_QUERY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const { q, archived, limit, offset } = parsed.data

  const where: Record<string, unknown> = { branchId }
  if (archived === 'exclude') where.archivedAt = null
  if (archived === 'only') where.archivedAt = { not: null }
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [total, rows] = await prisma.$transaction([
    prisma.patient.count({ where: where as never }),
    prisma.patient.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
  ])

  res.json(patientListSchema.parse({ total, patients: rows.map(toSafe) }))
})

router.post('/', async (req, res) => {
  const parsed = patientInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const input = parsed.data

  const created = await prisma.patient.create({
    data: {
      branchId,
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender ?? null,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      phone: nullableString(input.phone),
      email: nullableString(input.email),
      address: nullableString(input.address),
      notes: input.notes ? encrypt(input.notes) : null,
    },
  })

  await recordAuditFor(req)({
    action: 'PATIENT_CREATE',
    targetType: 'PATIENT',
    targetId: created.id,
    metadata: { firstName: created.firstName, lastName: created.lastName },
  })
  res.status(201).json(toDetail(created))
})

router.get('/:id', async (req, res) => {
  const { branchId } = assertAuth(req).user
  const row = await prisma.patient.findFirst({ where: { id: req.params.id, branchId } })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  await recordAuditFor(req)({
    action: 'PATIENT_VIEW',
    targetType: 'PATIENT',
    targetId: row.id,
  })
  res.json(toDetail(row))
})

router.patch('/:id', async (req, res) => {
  const parsed = patientUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const { branchId } = assertAuth(req).user
  const existing = await prisma.patient.findFirst({ where: { id: req.params.id, branchId } })
  if (!existing) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const input = parsed.data

  const data: Record<string, unknown> = {}
  if (input.firstName !== undefined) data.firstName = input.firstName
  if (input.lastName !== undefined) data.lastName = input.lastName
  if (input.gender !== undefined) data.gender = input.gender ?? null
  if (input.birthDate !== undefined) {
    data.birthDate = input.birthDate ? new Date(input.birthDate) : null
  }
  if (input.phone !== undefined) data.phone = nullableString(input.phone)
  if (input.email !== undefined) data.email = nullableString(input.email)
  if (input.address !== undefined) data.address = nullableString(input.address)
  if (input.notes !== undefined) data.notes = input.notes ? encrypt(input.notes) : null

  const updated = await prisma.patient.update({ where: { id: existing.id }, data: data as never })

  await recordAuditFor(req)({
    action: 'PATIENT_UPDATE',
    targetType: 'PATIENT',
    targetId: updated.id,
  })
  res.json(toDetail(updated))
})

async function setArchived(req: ExpressRequest, res: ExpressResponse, archivedAt: Date | null) {
  const { branchId } = assertAuth(req).user
  const id = req.params.id as string
  const row = await prisma.patient.findFirst({ where: { id, branchId } })
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return
  }
  const updated = await prisma.patient.update({
    where: { id: row.id },
    data: { archivedAt },
  })
  await recordAuditFor(req)({
    action: archivedAt ? 'PATIENT_ARCHIVED' : 'PATIENT_RESTORE',
    targetType: 'PATIENT',
    targetId: updated.id,
  })
  res.json(toSafe(updated))
}

router.post('/:id/archive', (req, res) => void setArchived(req, res, new Date()))
router.post('/:id/restore', (req, res) => void setArchived(req, res, null))

type BlobRow = { data: string; version: number; updatedAt: Date }

type BlobResponse = z.ZodType<{ version: number; data: unknown; updatedAt: string | null }>
type BlobWrite = z.ZodType<{ version: number; data: unknown }>

interface BlobPutOpts {
  action: AuditAction
  viewAction: AuditAction
  writeSchema: BlobWrite
  responseSchema: BlobResponse
  read: (patientId: string) => Promise<BlobRow | null>
  create: (patientId: string, encrypted: string) => Promise<BlobRow>
  updateLocked: (
    patientId: string,
    expectedVersion: number,
    encrypted: string,
  ) => Promise<{ count: number }>
  parseData: (raw: string) => unknown
}

interface BlobGetOpts {
  viewAction: AuditAction
  responseSchema: BlobResponse
  read: (patientId: string) => Promise<BlobRow | null>
  parseData: (raw: string) => unknown
}

async function findPatientOr404(req: ExpressRequest, res: ExpressResponse): Promise<string | null> {
  const { branchId } = assertAuth(req).user
  const patient = await prisma.patient.findFirst({
    where: { id: req.params.id as string, branchId },
  })
  if (!patient) {
    res.status(404).json({ error: 'NOT_FOUND' })
    return null
  }
  return patient.id
}

function blobResponse(row: BlobRow, opts: BlobGetOpts) {
  return opts.responseSchema.parse({
    version: row.version,
    data: opts.parseData(row.data),
    updatedAt: row.updatedAt.toISOString(),
  })
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
}

async function getProtectedBlob(
  req: ExpressRequest,
  res: ExpressResponse,
  opts: BlobGetOpts,
): Promise<void> {
  const patientId = await findPatientOr404(req, res)
  if (!patientId) return
  const row = await opts.read(patientId)
  await recordAuditFor(req)({ action: opts.viewAction, targetType: 'PATIENT', targetId: patientId })
  if (!row) {
    res.json(opts.responseSchema.parse({ version: 0, data: null, updatedAt: null }))
    return
  }
  res.json(blobResponse(row, opts))
}

async function putProtectedBlob(
  req: ExpressRequest,
  res: ExpressResponse,
  opts: BlobPutOpts,
): Promise<void> {
  const parsed = opts.writeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.flatten() })
    return
  }
  const patientId = await findPatientOr404(req, res)
  if (!patientId) return
  const { version, data } = parsed.data
  const encrypted = encrypt(JSON.stringify(data))

  const existing = await opts.read(patientId)
  if (!existing) {
    try {
      await opts.create(patientId, encrypted)
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      const updated = await opts.updateLocked(patientId, version, encrypted)
      if (updated.count === 0) {
        const current = await opts.read(patientId)
        res.status(409).json({ error: 'VERSION_CONFLICT', version: current?.version ?? 0 })
        return
      }
    }
    const created = await opts.read(patientId)
    await recordAuditFor(req)({ action: opts.action, targetType: 'PATIENT', targetId: patientId })
    res.json(blobResponse(created!, opts))
    return
  }

  const updated = await opts.updateLocked(patientId, version, encrypted)
  if (updated.count === 0) {
    const current = await opts.read(patientId)
    res.status(409).json({ error: 'VERSION_CONFLICT', version: current?.version ?? 0 })
    return
  }
  const row = await opts.read(patientId)
  await recordAuditFor(req)({ action: opts.action, targetType: 'PATIENT', targetId: patientId })
  res.json(blobResponse(row!, opts))
}

router.get(
  '/:id/medical-history',
  (req, res) =>
    void getProtectedBlob(req, res, {
      viewAction: 'PATIENT_MEDICAL_VIEW',
      responseSchema: medicalHistoryResponseSchema,
      read: (pid) => prisma.patientMedicalHistory.findUnique({ where: { patientId: pid } }),
      parseData: (raw) => medicalHistorySchema.parse(JSON.parse(decrypt(raw))),
    }),
)

router.put(
  '/:id/medical-history',
  (req, res) =>
    void putProtectedBlob(req, res, {
      action: 'PATIENT_MEDICAL_UPDATE',
      viewAction: 'PATIENT_MEDICAL_VIEW',
      writeSchema: medicalHistoryWriteSchema,
      responseSchema: medicalHistoryResponseSchema,
      read: (pid) => prisma.patientMedicalHistory.findUnique({ where: { patientId: pid } }),
      create: (pid, encrypted) =>
        prisma.patientMedicalHistory.create({
          data: { patientId: pid, data: encrypted, version: 1 },
        }),
      updateLocked: (pid, expectedVersion, encrypted) =>
        prisma.patientMedicalHistory.updateMany({
          where: { patientId: pid, version: expectedVersion },
          data: { data: encrypted, version: { increment: 1 } },
        }),
      parseData: (raw) => medicalHistorySchema.parse(JSON.parse(decrypt(raw))),
    }),
)

router.get(
  '/:id/odontogram',
  (req, res) =>
    void getProtectedBlob(req, res, {
      viewAction: 'PATIENT_ODONTOGRAM_VIEW',
      responseSchema: odontogramResponseSchema,
      read: (pid) => prisma.patientOdontogram.findUnique({ where: { patientId: pid } }),
      parseData: (raw) => odontogramSchema.parse(JSON.parse(decrypt(raw))),
    }),
)

router.put(
  '/:id/odontogram',
  (req, res) =>
    void putProtectedBlob(req, res, {
      action: 'PATIENT_ODONTOGRAM_UPDATE',
      viewAction: 'PATIENT_ODONTOGRAM_VIEW',
      writeSchema: odontogramWriteSchema,
      responseSchema: odontogramResponseSchema,
      read: (pid) => prisma.patientOdontogram.findUnique({ where: { patientId: pid } }),
      create: (pid, encrypted) =>
        prisma.patientOdontogram.create({
          data: { patientId: pid, data: encrypted, version: 1 },
        }),
      updateLocked: (pid, expectedVersion, encrypted) =>
        prisma.patientOdontogram.updateMany({
          where: { patientId: pid, version: expectedVersion },
          data: { data: encrypted, version: { increment: 1 } },
        }),
      parseData: (raw) => odontogramSchema.parse(JSON.parse(decrypt(raw))),
    }),
)

export default router
