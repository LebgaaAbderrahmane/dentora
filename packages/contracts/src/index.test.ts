import { describe, expect, it } from 'vitest'
import {
  auditActionSchema,
  auditEntrySchema,
  auditQuerySchema,
  loginSchema,
  medicalHistoryResponseSchema,
  medicalHistorySchema,
  medicalHistoryWriteSchema,
  odontogramResponseSchema,
  odontogramSchema,
  odontogramWriteSchema,
  patientDocumentListSchema,
  patientDocumentQuerySchema,
  patientDocumentSchema,
  patientInputSchema,
  patientQuerySchema,
  patientUpdateSchema,
  roleSchema,
  safeUserSchema,
  updateUserRoleSchema,
} from './index'

describe('auth contracts', () => {
  it('roleSchema accepts known roles only', () => {
    expect(roleSchema.parse('ADMIN')).toBe('ADMIN')
    expect(roleSchema.options).toContain('PATIENT')
    expect(() => roleSchema.parse('SUPERUSER')).toThrow()
  })

  it('loginSchema trims and validates email + password', () => {
    expect(loginSchema.parse({ email: '  a@b.dz ', password: 'x' })).toMatchObject({
      email: 'a@b.dz',
    })
    expect(() => loginSchema.parse({ email: 'not-an-email', password: 'x' })).toThrow()
    expect(() => loginSchema.parse({ email: 'a@b.dz', password: '' })).toThrow()
  })

  it('updateUserRoleSchema requires a valid role', () => {
    expect(updateUserRoleSchema.parse({ role: 'DENTIST' })).toMatchObject({ role: 'DENTIST' })
    expect(() => updateUserRoleSchema.parse({})).toThrow()
    expect(() => updateUserRoleSchema.parse({ role: 'BOSS' })).toThrow()
  })

  it('safeUserSchema rejects missing or bad fields', () => {
    const ok = safeUserSchema.safeParse({
      id: '1',
      email: 'x@y.dz',
      name: 'n',
      role: 'ADMIN',
      branchId: 'b',
      active: true,
    })
    expect(ok.success).toBe(true)
    expect(safeUserSchema.safeParse({ id: '1' }).success).toBe(false)
    expect(
      safeUserSchema.safeParse({
        id: '1',
        email: 'x@y.dz',
        name: 'n',
        role: 'ADMIN',
        branchId: 'b',
        active: true,
        passwordHash: 'secret',
      }).success,
    ).toBe(true)
  })

  it('audit schemas validate actions, entries and queries', () => {
    expect(auditActionSchema.parse('LOGIN_FAILURE')).toBe('LOGIN_FAILURE')
    expect(() => auditActionSchema.parse('UNKNOWN')).toThrow()

    const entry = auditEntrySchema.safeParse({
      id: '1',
      action: 'USER_ROLE_CHANGE',
      targetType: 'USER',
      targetId: 'u1',
      actorId: 'u2',
      actorEmail: 'a@b.dz',
      metadata: { from: 'ADMIN', to: 'DENTIST' },
      ip: '127.0.0.1',
      userAgent: 'curl',
      createdAt: '2026-08-14T12:00:00.000Z',
    })
    expect(entry.success).toBe(true)
    expect(
      auditEntrySchema.safeParse({ id: '1', action: 'BOGUS', targetType: 'USER' }).success,
    ).toBe(false)
  })

  it('auditQuerySchema coerces and bounds limit', () => {
    expect(auditQuerySchema.parse({ limit: '10' }).limit).toBe(10)
    expect(auditQuerySchema.parse({}).limit).toBe(50)
    expect(() => auditQuerySchema.parse({ limit: '201' })).toThrow()
    expect(auditQuerySchema.parse({ action: 'LOGOUT' }).action).toBe('LOGOUT')
    expect(() => auditQuerySchema.parse({ action: 'NOPE' })).toThrow()
  })

  it('auditActionSchema includes patient archive/restore', () => {
    expect(auditActionSchema.parse('PATIENT_ARCHIVED')).toBe('PATIENT_ARCHIVED')
    expect(auditActionSchema.parse('PATIENT_RESTORE')).toBe('PATIENT_RESTORE')
    expect(auditActionSchema.parse('PATIENT_MEDICAL_VIEW')).toBe('PATIENT_MEDICAL_VIEW')
    expect(auditActionSchema.parse('PATIENT_MEDICAL_UPDATE')).toBe('PATIENT_MEDICAL_UPDATE')
    expect(auditActionSchema.parse('PATIENT_ODONTOGRAM_VIEW')).toBe('PATIENT_ODONTOGRAM_VIEW')
    expect(auditActionSchema.parse('PATIENT_ODONTOGRAM_UPDATE')).toBe('PATIENT_ODONTOGRAM_UPDATE')
    expect(() => auditActionSchema.parse('PATIENT_DELETE')).toThrow()
  })

  it('patientInputSchema validates create payload', () => {
    const ok = patientInputSchema.safeParse({
      firstName: ' Kayla ',
      lastName: 'Benosman',
      gender: 'F',
      birthDate: '1990-05-04',
      phone: '0550 11 22 33',
      email: 'kayla@test.dz',
      address: 'Alger',
      notes: 'Allergy: penicillin',
    })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.firstName).toBe('Kayla')
    expect(patientInputSchema.safeParse({ firstName: '', lastName: 'Benosman' }).success).toBe(
      false,
    )
    expect(patientInputSchema.safeParse({ lastName: 'x' }).success).toBe(false)
    expect(() => patientInputSchema.parse({ firstName: 'a', lastName: 'b', gender: 'X' })).toThrow()
    expect(() =>
      patientInputSchema.parse({ firstName: 'a', lastName: 'b', birthDate: 'nope' }),
    ).toThrow()
  })

  it('patientUpdateSchema requires at least one field', () => {
    expect(patientUpdateSchema.parse({ phone: '0550' }).phone).toBe('0550')
    expect(() => patientUpdateSchema.parse({})).toThrow()
  })

  it('patientQuerySchema defaults and bounds pagination', () => {
    expect(patientQuerySchema.parse({}).archived).toBe('exclude')
    expect(patientQuerySchema.parse({ archived: 'only' }).archived).toBe('only')
    expect(patientQuerySchema.parse({ q: '  kay ' }).q).toBe('kay')
    expect(patientQuerySchema.parse({}).limit).toBe(50)
    expect(patientQuerySchema.parse({ offset: '5' }).offset).toBe(5)
    expect(() => patientQuerySchema.parse({ archived: 'all' })).toThrow()
    expect(() => patientQuerySchema.parse({ limit: '500' })).toThrow()
  })

  it('medicalHistoryWriteSchema requires a version and non-empty history', () => {
    const ok = medicalHistoryWriteSchema.safeParse({
      version: 0,
      data: { allergies: 'Penicillin', medications: 'Metformin' },
    })
    expect(ok.success).toBe(true)
    expect(medicalHistoryWriteSchema.safeParse({ data: {} }).success).toBe(false)
    expect(medicalHistoryWriteSchema.safeParse({ version: -1, data: {} }).success).toBe(false)
    expect(medicalHistoryWriteSchema.safeParse({ version: 2 }).success).toBe(false)
  })

  it('medicalHistorySchema accepts a single optional field and rejects empty', () => {
    expect(medicalHistorySchema.parse({ conditions: 'Asthma' })).toMatchObject({
      conditions: 'Asthma',
    })
    expect(medicalHistorySchema.safeParse({}).success).toBe(false)
    expect(medicalHistorySchema.safeParse({ allergies: 'a'.repeat(4001) }).success).toBe(false)
  })

  it('medicalHistoryResponseSchema validates first-save placeholder and populated reads', () => {
    const empty = medicalHistoryResponseSchema.safeParse({
      version: 0,
      data: null,
      updatedAt: null,
    })
    expect(empty.success).toBe(true)
    const populated = medicalHistoryResponseSchema.safeParse({
      version: 1,
      data: { otherNotes: 'wheelchair' },
      updatedAt: '2026-08-15T12:00:00.000Z',
    })
    expect(populated.success).toBe(true)
  })

  it('odontogramWriteSchema requires a version and FDI tooth keys', () => {
    const ok = odontogramWriteSchema.safeParse({
      version: 0,
      data: {
        teeth: {
          '11': { status: 'present', surfaces: { m: [], d: ['caries'], o: [], b: [], l: [] } },
        },
      },
    })
    expect(ok.success).toBe(true)
    expect(
      odontogramWriteSchema.safeParse({
        version: 1,
        data: {
          teeth: { 99: { status: 'present', surfaces: { m: [], d: [], o: [], b: [], l: [] } } },
        },
      }).success,
    ).toBe(false)
    expect(odontogramWriteSchema.safeParse({ version: 1, data: { teeth: {} } }).success).toBe(false)
  })

  it('odontogramSchema bounds conditions and statuses', () => {
    expect(() =>
      odontogramSchema.parse({
        teeth: {
          '21': { status: 'ghost', surfaces: { m: [], d: [], o: [], b: [], l: [] } },
        },
      }),
    ).toThrow()
    expect(() =>
      odontogramSchema.parse({
        teeth: {
          '31': { status: 'missing', surfaces: { m: ['bogus'], d: [], o: [], b: [], l: [] } },
        },
      }),
    ).toThrow()
  })

  it('odontogramResponseSchema validates first-save placeholder', () => {
    expect(
      odontogramResponseSchema.safeParse({ version: 0, data: null, updatedAt: null }).success,
    ).toBe(true)
  })
})

describe('document contracts', () => {
  it('patientDocumentSchema validates a stored document', () => {
    const doc = patientDocumentSchema.parse({
      id: 'doc_1',
      patientId: 'patient_1',
      originalName: 'pano-xray.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      createdAt: '2026-08-15T10:00:00.000Z',
    })
    expect(doc.size).toBe(1024)
  })

  it('patientDocumentSchema rejects negative sizes and oversized names', () => {
    expect(
      patientDocumentSchema.safeParse({
        id: 'doc_1',
        patientId: 'p',
        originalName: 'x',
        mimeType: 'image/jpeg',
        size: -1,
        createdAt: '2026-08-15T10:00:00.000Z',
      }).success,
    ).toBe(false)
    expect(
      patientDocumentSchema.safeParse({
        id: 'doc_1',
        patientId: 'p',
        originalName: 'y'.repeat(256),
        mimeType: 'image/jpeg',
        size: 0,
        createdAt: '2026-08-15T10:00:00.000Z',
      }).success,
    ).toBe(false)
  })

  it('patientDocumentListSchema validates paginated list', () => {
    const list = patientDocumentListSchema.parse({ documents: [], total: 0 })
    expect(list.total).toBe(0)
    expect(
      patientDocumentListSchema.safeParse({
        documents: [
          {
            id: 'a',
            patientId: 'p',
            originalName: 'x',
            mimeType: 'application/pdf',
            size: 1,
            createdAt: '2026-08-15T10:00:00.000Z',
          },
        ],
        total: 1,
      }).success,
    ).toBe(true)
  })

  it('patientDocumentQuerySchema coerces query params', () => {
    expect(patientDocumentQuerySchema.parse({}).limit).toBe(100)
    expect(patientDocumentQuerySchema.parse({ limit: '5', offset: '10' })).toMatchObject({
      limit: 5,
      offset: 10,
    })
  })

  it('auditActionSchema includes document actions', () => {
    expect(auditActionSchema.options).toContain('PATIENT_DOCUMENT_CREATE')
    expect(auditActionSchema.options).toContain('PATIENT_DOCUMENT_VIEW')
  })
})
