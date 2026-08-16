import { describe, expect, it } from 'vitest'
import {
  appointmentConflictSchema,
  appointmentDetailSchema,
  appointmentInputSchema,
  appointmentListSchema,
  appointmentQuerySchema,
  appointmentSchema,
  appointmentStatusCountsSchema,
  appointmentUpdateSchema,
  dashboardKpisQuerySchema,
  dashboardKpisSchema,
  dashboardUpcomingVisitSchema,
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
  patientDetailSchema,
  patientDocumentListSchema,
  patientDocumentQuerySchema,
  patientDocumentSchema,
  patientInputSchema,
  patientQuerySchema,
  patientUpdateSchema,
  roleSchema,
  safeUserSchema,
  staffDentistListSchema,
  SERVICE_CATEGORIES,
  serviceInputSchema,
  serviceListResponseSchema,
  serviceQuerySchema,
  serviceSchema,
  serviceUpdateSchema,
  updateUserRoleSchema,
  waitlistActiveStatuses,
  waitlistDetailSchema,
  waitlistDuplicateErrorSchema,
  waitlistInputSchema,
  waitlistQuerySchema,
  waitlistSchema,
  waitlistStatusSchema,
  waitlistUpdateSchema,
  publicBookingSchema,
  publicBookingResponseSchema,
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

describe('appointment contracts', () => {
  const baseInput = {
    patientId: 'p1',
    dentistId: 'd1',
    startAt: '2026-08-20T09:00:00.000Z',
    endAt: '2026-08-20T09:30:00.000Z',
  }

  it('appointmentInputSchema accepts valid booking', () => {
    const parsed = appointmentInputSchema.parse(baseInput)
    expect(parsed.patientId).toBe('p1')
    expect(parsed.status).toBeUndefined()
  })

  it('appointmentInputSchema rejects endAt before startAt and invalid dates', () => {
    expect(
      appointmentInputSchema.safeParse({ ...baseInput, endAt: '2026-08-20T08:00:00.000Z' }).success,
    ).toBe(false)
    expect(appointmentInputSchema.safeParse({ ...baseInput, startAt: 'nope' }).success).toBe(false)
    expect(
      appointmentInputSchema.safeParse({ ...baseInput, endAt: '2026-08-20T09:00:00.000Z' }).success,
    ).toBe(false)
  })

  it('appointmentInputSchema allows absent dentist (unscheduled) and optional status/notes', () => {
    const ok = appointmentInputSchema.safeParse({
      patientId: 'p1',
      startAt: '2026-08-20T09:00:00.000Z',
      endAt: '2026-08-20T09:30:00.000Z',
      status: 'CONFIRMED',
      notes: 'recall check',
    })
    expect(ok.success).toBe(true)
    expect(() => appointmentInputSchema.parse({ ...baseInput, status: 'BOGUS' })).toThrow()
    expect(() => appointmentInputSchema.parse({ ...baseInput, notes: 'x'.repeat(4001) })).toThrow()
  })

  it('appointmentUpdateSchema requires a field and re-validates schedule', () => {
    expect(appointmentUpdateSchema.safeParse({ status: 'CANCELLED' }).success).toBe(true)
    expect(appointmentUpdateSchema.safeParse({}).success).toBe(false)
    expect(
      appointmentUpdateSchema.safeParse({
        startAt: '2026-08-20T10:00:00.000Z',
        endAt: '2026-08-20T09:30:00.000Z',
      }).success,
    ).toBe(false)
    expect(appointmentUpdateSchema.safeParse({ notes: null }).success).toBe(false)
  })

  it('appointmentSchema validates list row shape without nullable notes leak', () => {
    const row = appointmentSchema.safeParse({
      id: 'a1',
      branchId: 'b1',
      patientId: 'p1',
      patientName: 'Kayla Benosman',
      dentistId: 'd1',
      dentistName: 'Dr Ali',
      startAt: '2026-08-20T09:00:00.000Z',
      endAt: '2026-08-20T09:30:00.000Z',
      status: 'CONFIRMED',
      createdAt: '2026-08-17T08:00:00.000Z',
      updatedAt: '2026-08-17T08:00:00.000Z',
    })
    expect(row.success).toBe(true)
    expect(row.success && 'notes' in row.data).toBe(false)
  })

  it('appointmentDetailSchema extends row with nullable notes', () => {
    const detail = appointmentDetailSchema.safeParse({
      id: 'a1',
      branchId: 'b1',
      patientId: 'p1',
      patientName: 'Kayla Benosman',
      dentistId: 'd1',
      dentistName: 'Dr Ali',
      startAt: '2026-08-20T09:00:00.000Z',
      endAt: '2026-08-20T09:30:00.000Z',
      status: 'COMPLETED',
      notes: 'prefers mornings',
      createdAt: '2026-08-17T08:00:00.000Z',
      updatedAt: '2026-08-17T08:00:00.000Z',
    })
    expect(detail.success).toBe(true)
    expect(detail.success && detail.data.notes).toBe('prefers mornings')
  })

  it('appointmentListSchema validates a range list', () => {
    expect(appointmentListSchema.safeParse({ items: [] }).success).toBe(true)
    expect(
      appointmentListSchema.safeParse({ items: [{ id: 'a1', status: 'NOSHOW' }] }).success,
    ).toBe(false)
  })

  it('appointmentQuerySchema requires a bounded range', () => {
    expect(
      appointmentQuerySchema.parse({
        start: '2026-08-20T00:00:00.000Z',
        end: '2026-08-27T00:00:00.000Z',
      }),
    ).toMatchObject({
      start: '2026-08-20T00:00:00.000Z',
      end: '2026-08-27T00:00:00.000Z',
    })
    expect(
      appointmentQuerySchema.safeParse({ start: 'bad', end: '2026-08-27T00:00:00.000Z' }).success,
    ).toBe(false)
    expect(appointmentQuerySchema.safeParse({}).success).toBe(false)
    expect(
      appointmentQuerySchema.parse({
        start: '2026-08-20T00:00:00.000Z',
        end: '2026-08-27T00:00:00.000Z',
        dentistId: 'd1',
        status: 'PENDING',
        patientId: 'p1',
      }).dentistId,
    ).toBe('d1')
  })

  it('appointmentConflictSchema validates a conflict payload', () => {
    const conflict = appointmentConflictSchema.safeParse({
      error: 'CONFLICT',
      overlaps: [
        {
          id: 'a1',
          startAt: '2026-08-20T09:00:00.000Z',
          endAt: '2026-08-20T09:30:00.000Z',
          kind: 'dentist',
          patientName: 'Kayla Benosman',
        },
      ],
    })
    expect(conflict.success).toBe(true)
    expect(
      appointmentConflictSchema.safeParse({ error: 'VERSION_CONFLICT', overlaps: [] }).success,
    ).toBe(false)
  })

  it('auditActionSchema includes appointment actions', () => {
    for (const action of [
      'APPOINTMENT_CREATE',
      'APPOINTMENT_UPDATE',
      'APPOINTMENT_CANCEL',
      'APPOINTMENT_RESCHEDULE',
      'APPOINTMENT_NOSHOW',
      'APPOINTMENT_VIEW',
    ]) {
      expect(auditActionSchema.options).toContain(action)
    }
  })
})

describe('waitlist contracts', () => {
  const baseInput = { patientId: 'p1', dentistId: 'd1' }

  it('waitlistInputSchema accepts a minimal entry and optional fields', () => {
    const parsed = waitlistInputSchema.parse(baseInput)
    expect(parsed.patientId).toBe('p1')

    const full = waitlistInputSchema.parse({
      ...baseInput,
      dentistId: null,
      preferredDate: '2026-08-20T00:00:00.000Z',
      notes: 'after 3pm',
    })
    expect(full.preferredDate).toBe('2026-08-20T00:00:00.000Z')
    expect(full.dentistId).toBeNull()
  })

  it('waitlistInputSchema rejects an empty patient and an invalid preferred date', () => {
    expect(waitlistInputSchema.safeParse({ patientId: '' }).success).toBe(false)
    expect(waitlistInputSchema.safeParse({ patientId: 'p1', preferredDate: 'nope' }).success).toBe(
      false,
    )
    expect(waitlistInputSchema.safeParse({ ...baseInput, notes: 'x'.repeat(1001) }).success).toBe(
      false,
    )
  })

  it('waitlistUpdateSchema requires at least one field', () => {
    expect(waitlistUpdateSchema.safeParse({}).success).toBe(false)
    const ok = waitlistUpdateSchema.parse({ status: 'CONTACTED' })
    expect(ok.status).toBe('CONTACTED')
  })

  it('waitlistUpdateSchema accepts status transitions and booking links', () => {
    const parsed = waitlistUpdateSchema.parse({ status: 'BOOKED', appointmentId: 'a1' })
    expect(parsed.appointmentId).toBe('a1')
    expect(waitlistUpdateSchema.safeParse({ status: 'UNKNOWN' }).success).toBe(false)
  })

  it('waitlistStatusSchema covers the full lifecycle', () => {
    expect(waitlistStatusSchema.options).toEqual([
      'PENDING',
      'CONTACTED',
      'BOOKED',
      'CANCELLED',
      'EXPIRED',
    ])
    expect(waitlistActiveStatuses).toEqual(['PENDING', 'CONTACTED'])
  })

  it('waitlistSchema is a list row without notes; detail adds them', () => {
    const row = waitlistSchema.parse({
      id: 'w1',
      branchId: 'b1',
      patientId: 'p1',
      patientName: 'Kayla Benosman',
      dentistId: null,
      dentistName: null,
      preferredDate: null,
      status: 'PENDING',
      appointmentId: null,
      source: 'staff',
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    })
    expect(row.patientName).toBe('Kayla Benosman')
    expect(row.source).toBe('staff')
    // list rows must never carry notes
    expect('notes' in row).toBe(false)

    const detail = waitlistDetailSchema.parse({ ...row, notes: null })
    expect(detail.notes).toBeNull()
  })

  it('waitlistQuerySchema coerces and caps the limit', () => {
    const q = waitlistQuerySchema.parse({ limit: '200' })
    expect(q.limit).toBe(200)
    expect(waitlistQuerySchema.safeParse({ limit: '201' }).success).toBe(false)
    const filtered = waitlistQuerySchema.parse({ status: 'CONTACTED', dentistId: 'd1', q: 'Kayla' })
    expect(filtered.q).toBe('Kayla')
  })

  it('waitlistDuplicateErrorSchema validates the 409 shape', () => {
    const dup = waitlistDuplicateErrorSchema.parse({
      error: 'WAITLIST_ALREADY_ACTIVE',
      duplicateId: 'w2',
    })
    expect(dup.duplicateId).toBe('w2')
    expect(
      waitlistDuplicateErrorSchema.safeParse({ error: 'NOPE', duplicateId: 'w2' }).success,
    ).toBe(false)
  })

  it('auditActionSchema includes waitlist actions', () => {
    for (const action of [
      'WAITLIST_CREATE',
      'WAITLIST_UPDATE',
      'WAITLIST_BOOK',
      'WAITLIST_CANCEL',
    ]) {
      expect(auditActionSchema.options).toContain(action)
    }
  })

  it('staffDentistListSchema validates the dentist roster', () => {
    const list = staffDentistListSchema.parse({
      dentists: [{ id: 'd1', name: 'Dr. Test', email: 'dr@test.dz' }],
    })
    expect(list.dentists[0].name).toBe('Dr. Test')
    expect(staffDentistListSchema.safeParse({ dentists: [{ id: 'd1', name: 'x' }] }).success).toBe(
      false,
    )
  })
})

describe('patient no-show stats', () => {
  it('patientDetailSchema carries derived no-show fields', () => {
    const parsed = patientDetailSchema.parse({
      id: 'p1',
      branchId: 'b1',
      firstName: 'Kayla',
      lastName: 'Benosman',
      gender: 'F',
      birthDate: null,
      phone: null,
      email: null,
      address: null,
      archivedAt: null,
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
      notes: null,
      noShowCount: 2,
      noShowRate: 0.5,
    })
    expect(parsed.noShowCount).toBe(2)
    expect(parsed.noShowRate).toBe(0.5)
  })

  it('patientDetailSchema rejects out-of-range rates', () => {
    expect(
      patientDetailSchema.safeParse({
        id: 'p1',
        branchId: 'b1',
        firstName: 'Kayla',
        lastName: 'Benosman',
        gender: 'F',
        birthDate: null,
        phone: null,
        email: null,
        address: null,
        archivedAt: null,
        createdAt: '2026-08-20T00:00:00.000Z',
        updatedAt: '2026-08-20T00:00:00.000Z',
        notes: null,
        noShowCount: -1,
        noShowRate: 1.5,
      }).success,
    ).toBe(false)
  })
})

describe('dashboard contracts', () => {
  const fullKpis = {
    visits: {
      today: {
        total: 3,
        byStatus: {
          PENDING: 1,
          CONFIRMED: 1,
          COMPLETED: 0,
          CANCELLED: 0,
          NOSHOW: 1,
        },
      },
      upcoming: [
        {
          id: 'a1',
          patientName: 'Kayla Benosman',
          dentistName: 'Dr. Meziane',
          startAt: '2026-08-16T09:00:00.000Z',
          endAt: '2026-08-16T09:30:00.000Z',
          status: 'CONFIRMED',
        },
      ],
    },
    noShow: { today: 1, rate30d: 0.25 },
    waitlist: { active: 2 },
    patients: { total: 120, new30d: 7 },
  }

  it('dashboardKpisSchema parses the full payload', () => {
    const parsed = dashboardKpisSchema.parse(fullKpis)
    expect(parsed.visits.today.total).toBe(3)
    expect(parsed.visits.today.byStatus.NOSHOW).toBe(1)
    expect(parsed.visits.upcoming[0].patientName).toBe('Kayla Benosman')
    expect(parsed.noShow.rate30d).toBe(0.25)
    expect(parsed.waitlist.active).toBe(2)
    expect(parsed.patients.new30d).toBe(7)
  })

  it('dashboardKpisSchema rejects a negative or out-of-range value', () => {
    expect(
      dashboardKpisSchema.safeParse({ ...fullKpis, noShow: { today: 1, rate30d: 1.5 } }).success,
    ).toBe(false)
    expect(
      dashboardKpisSchema.safeParse({
        ...fullKpis,
        visits: { today: { ...fullKpis.visits.today, total: -1 } },
      }).success,
    ).toBe(false)
  })

  it('dashboardKpisSchema rejects an unknown appointment status', () => {
    expect(
      dashboardKpisSchema.safeParse({
        ...fullKpis,
        visits: {
          today: {
            ...fullKpis.visits.today,
            byStatus: { ...fullKpis.visits.today.byStatus, DONE: 1 },
          },
        },
      }).success,
    ).toBe(false)
  })

  it('appointmentStatusCountsSchema requires every status key', () => {
    expect(appointmentStatusCountsSchema.safeParse({ PENDING: 1 }).success).toBe(false)
    const counts = appointmentStatusCountsSchema.parse(fullKpis.visits.today.byStatus)
    expect(counts.COMPLETED).toBe(0)
  })

  it('dashboardUpcomingVisitSchema validates list rows', () => {
    expect(dashboardUpcomingVisitSchema.parse(fullKpis.visits.upcoming[0]).patientName).toBe(
      'Kayla Benosman',
    )
    expect(
      dashboardUpcomingVisitSchema.safeParse({ ...fullKpis.visits.upcoming[0], status: 'X' })
        .success,
    ).toBe(false)
  })

  it('dashboardKpisQuerySchema accepts optional valid windows', () => {
    expect(dashboardKpisQuerySchema.safeParse({}).success).toBe(true)
    const q = dashboardKpisQuerySchema.parse({
      from: '2026-08-16T00:00:00.000Z',
      to: '2026-08-17T00:00:00.000Z',
      windowStart: '2026-07-17T00:00:00.000Z',
    })
    expect(q.to).toBe('2026-08-17T00:00:00.000Z')
  })

  it('dashboardKpisQuerySchema rejects malformed dates', () => {
    expect(dashboardKpisQuerySchema.safeParse({ from: 'not-a-date' }).success).toBe(false)
  })
})

describe('public booking contracts', () => {
  const valid = {
    firstName: 'Amine',
    lastName: 'Hadji',
    phone: '+213 555 000 000',
    preferredDate: '2026-08-20T00:00:00.000Z',
  }

  it('publicBookingSchema parses a full request', () => {
    const parsed = publicBookingSchema.parse({
      ...valid,
      service: 'Implantologie',
      message: 'Coût?',
    })
    expect(parsed.firstName).toBe('Amine')
    expect(parsed.service).toBe('Implantologie')
  })

  it('publicBookingSchema rejects a missing name or empty phone', () => {
    expect(publicBookingSchema.safeParse({ ...valid, firstName: '  ' }).success).toBe(false)
    expect(publicBookingSchema.safeParse({ ...valid, phone: '' }).success).toBe(false)
  })

  it('publicBookingSchema rejects non-digit phones', () => {
    expect(publicBookingSchema.safeParse({ ...valid, phone: 'not-a-phone' }).success).toBe(false)
  })

  it('publicBookingSchema rejects a malformed preferred date', () => {
    expect(
      publicBookingSchema.safeParse({ ...valid, preferredDate: 'yesterday-ish' }).success,
    ).toBe(false)
  })

  it('publicBookingResponseSchema carries the new waitlist entry id', () => {
    const res = publicBookingResponseSchema.parse({ waitlistEntryId: 'w1' })
    expect(res.waitlistEntryId).toBe('w1')
    expect(publicBookingResponseSchema.safeParse({}).success).toBe(false)
  })
})

describe('service catalog contracts', () => {
  const valid = {
    name: 'Détartrage',
    category: 'HYGIENE' as const,
    priceDZD: 2500,
    durationMinutes: 30,
  }

  it('serviceSchema parses a full row and rejects a fractional price', () => {
    const row = serviceSchema.parse({
      ...valid,
      id: 's1',
      branchId: 'b1',
      archivedAt: null,
      reimbursablePct: 80,
      createdAt: '2026-08-16T00:00:00.000Z',
      updatedAt: '2026-08-16T00:00:00.000Z',
    })
    expect(row.priceDZD).toBe(2500)
    expect(SERVICE_CATEGORIES).toContain('HYGIENE')
    expect(serviceInputSchema.safeParse({ ...valid, priceDZD: 25.5 }).success).toBe(false)
  })

  it('serviceInputSchema defaults reimbursablePct to 0 and bounds it to 0-100', () => {
    const parsed = serviceInputSchema.parse(valid)
    expect(parsed.reimbursablePct).toBe(0)
    expect(serviceInputSchema.safeParse({ ...valid, reimbursablePct: 120 }).success).toBe(false)
    expect(serviceInputSchema.safeParse({ ...valid, reimbursablePct: -1 }).success).toBe(false)
  })

  it('serviceInputSchema rejects a missing name or an invalid duration', () => {
    expect(serviceInputSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false)
    expect(serviceInputSchema.safeParse({ ...valid, durationMinutes: 0 }).success).toBe(false)
  })

  it('serviceUpdateSchema allows a partial patch', () => {
    const parsed = serviceUpdateSchema.parse({ priceDZD: 3000 })
    expect(parsed.priceDZD).toBe(3000)
    expect(parsed.name).toBeUndefined()
  })

  it('serviceQuerySchema coerces limit/offset and rejects a bad archived value', () => {
    expect(serviceQuerySchema.parse({ limit: '10' }).limit).toBe(10)
    expect(serviceQuerySchema.parse({ archived: 'exclude' }).archived).toBe('exclude')
    expect(serviceQuerySchema.safeParse({ archived: 'sometimes' }).success).toBe(false)
  })

  it('serviceListResponseSchema validates a list payload', () => {
    const list = serviceListResponseSchema.parse({ items: [], total: 0 })
    expect(list.total).toBe(0)
    expect(serviceListResponseSchema.safeParse({ items: [{ id: 'x' }], total: 1 }).success).toBe(
      false,
    )
  })
})
