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
  auditTargetSchema,
  attendanceInputSchema,
  attendanceListSchema,
  attendanceLogSchema,
  attendanceQuerySchema,
  attendanceRosterSchema,
  attendanceUpdateSchema,
  internInputSchema,
  internListSchema,
  internMetaSchema,
  internProfileSchema,
  internQuerySchema,
  internRotationSchema,
  internUpdateSchema,
  INTERN_ROTATIONS,
  MAX_PAYROLL_AMOUNT_DZD,
  payslipInputSchema,
  payslipListSchema,
  payslipQuerySchema,
  payslipSchema,
  payslipUpdateSchema,
  payrollMetaSchema,
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
  STAFF_ROLES,
  staffDentistListSchema,
  staffInputSchema,
  staffListSchema,
  staffQuerySchema,
  staffRoleSchema,
  staffScheduleInputSchema,
  staffScheduleListSchema,
  staffScheduleRowSchema,
  staffScheduleSchema,
  staffUpdateSchema,
  resetPasswordSchema,
  WEEKDAYS,
  weekdaySchema,
  SERVICE_CATEGORIES,
  serviceInputSchema,
  serviceListResponseSchema,
  serviceQuerySchema,
  serviceSchema,
  serviceUpdateSchema,
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  invoiceCreateSchema,
  invoiceDetailSchema,
  invoiceLineSchema,
  invoiceQuerySchema,
  invoiceSchema,
  paymentCreateSchema,
  paymentKindSchema,
  paymentQuerySchema,
  paymentSchema,
  refundCreateSchema,
  EXPENSE_CATEGORIES,
  expenseCategorySchema,
  expenseInputSchema,
  expenseListSchema,
  expenseQuerySchema,
  expenseSchema,
  expenseUpdateSchema,
  financeByMethodSchema,
  financeDaySchema,
  financeReportQuerySchema,
  financeReportSchema,
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  productInputSchema,
  productListSchema,
  productQuerySchema,
  productSchema,
  productUpdateSchema,
  PURCHASE_ORDER_STATUSES,
  purchaseOrderCreateSchema,
  purchaseOrderDetailSchema,
  purchaseOrderListSchema,
  purchaseOrderQuerySchema,
  purchaseOrderReceiveSchema,
  purchaseOrderSchema,
  purchaseOrderUpdateSchema,
  supplierInputSchema,
  supplierListSchema,
  supplierQuerySchema,
  supplierSchema,
  supplierUpdateSchema,
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
  STOCK_LEDGER_TYPES,
  stockAdjustInputSchema,
  stockEntrySchema,
  stockListSchema,
  stockOutInputSchema,
  stockQuerySchema,
  MAX_STOCK_BATCH,
  stockAlertQuerySchema,
  stockAlertsSchema,
  expiringLotAlertSchema,
  lowStockAlertSchema,
  treatmentConsumptionInputSchema,
  treatmentConsumptionListSchema,
  treatmentConsumptionQuerySchema,
  treatmentConsumptionSchema,
  STERILIZATION_METHODS,
  STERILIZATION_STATUSES,
  sterilizationInputSchema,
  sterilizationLogSchema,
  sterilizationQuerySchema,
  sterilizationUpdateSchema,
  portalAccessInputSchema,
  portalAccessResponseSchema,
  portalAccessStatusSchema,
  portalAppointmentsSchema,
  portalBookingSchema,
  portalBookedSchema,
  portalDentistListSchema,
  portalInvoicesSchema,
  portalMeSchema,
  notificationChannelSchema,
  notificationConfigSchema,
  notificationConfigUpdateSchema,
  notificationLogListSchema,
  notificationLogQuerySchema,
  notificationLogSchema,
  notificationStatusSchema,
  notificationSweepResultSchema,
  patientPrefsSchema,
  occupancyReportSchema,
  reportExportQuerySchema,
  stockValuationQuerySchema,
  stockValuationReportSchema,
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
      patientId: null,
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
        patientId: null,
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

describe('invoice contracts', () => {
  const line = {
    serviceId: 'svc1',
    serviceName: 'Détartrage',
    priceDZD: 2500,
    quantity: 2,
  }

  it('invoiceCreateSchema accepts patient + at least one line', () => {
    const parsed = invoiceCreateSchema.parse({ patientId: 'p1', lines: [line] })
    expect(parsed.lines[0].serviceName).toBe('Détartrage')
    expect(invoiceCreateSchema.safeParse({ patientId: 'p1', lines: [] }).success).toBe(false)
  })

  it('invoiceCreateSchema rejects a fractional price or a zero quantity', () => {
    expect(
      invoiceCreateSchema.safeParse({ patientId: 'p1', lines: [{ ...line, priceDZD: 10.5 }] })
        .success,
    ).toBe(false)
    expect(
      invoiceCreateSchema.safeParse({ patientId: 'p1', lines: [{ ...line, quantity: 0 }] }).success,
    ).toBe(false)
  })

  it('invoiceSchema derives status from row fields', () => {
    const parsed = invoiceSchema.parse({
      id: 'i1',
      branchId: 'b1',
      patientId: 'p1',
      patientName: 'Amine Hadji',
      invoiceNumber: 3,
      issuedAt: '2026-08-17T00:00:00.000Z',
      voidedAt: null,
      status: 'UNPAID',
      subtotalDZD: 5000,
      totalDZD: 5000,
      createdAt: '2026-08-17T00:00:00.000Z',
      updatedAt: '2026-08-17T00:00:00.000Z',
    })
    expect(parsed.invoiceNumber).toBe(3)
    expect(INVOICE_STATUSES).toContain('VOID')
    expect(invoiceSchema.safeParse({ ...parsed, status: 'CANCELLED' }).success).toBe(false)
  })

  it('invoiceLineSchema validates a line row', () => {
    const parsed = invoiceLineSchema.parse({ ...line, id: 'l1' })
    expect(parsed.quantity).toBe(2)
    expect(invoiceLineSchema.safeParse({ ...line, id: 'l1', priceDZD: -1 }).success).toBe(false)
  })

  it('invoiceQuerySchema coerces limit and rejects an unknown status', () => {
    expect(invoiceQuerySchema.parse({ limit: '25' }).limit).toBe(25)
    expect(invoiceQuerySchema.parse({ status: 'PAID' }).status).toBe('PAID')
    expect(invoiceQuerySchema.safeParse({ status: 'SOMEDAY' }).success).toBe(false)
  })

  it('invoiceDetailSchema extends the row with lines', () => {
    const detail = invoiceDetailSchema.parse({
      id: 'i1',
      branchId: 'b1',
      patientId: 'p1',
      patientName: 'Amine Hadji',
      invoiceNumber: 1,
      issuedAt: '2026-08-17T00:00:00.000Z',
      voidedAt: null,
      status: 'UNPAID',
      subtotalDZD: 5000,
      totalDZD: 5000,
      createdAt: '2026-08-17T00:00:00.000Z',
      updatedAt: '2026-08-17T00:00:00.000Z',
      lines: [invoiceLineSchema.parse({ ...line, id: 'l1' })],
      paidDZD: 0,
      balanceDZD: 5000,
      payments: [],
    })
    expect(detail.lines).toHaveLength(1)
    expect(detail.balanceDZD).toBe(5000)
  })
})

describe('payment contracts', () => {
  const payment = {
    id: 'pay1',
    invoiceId: 'i1',
    kind: 'RECEIPT' as const,
    method: 'CASH' as const,
    amountDZD: 2500,
    reference: null,
    notes: null,
    receivedAt: '2026-08-17T00:00:00.000Z',
    refundsId: null,
    createdAt: '2026-08-17T00:00:00.000Z',
    createdById: null,
  }

  it('paymentSchema validates a receipt row', () => {
    const parsed = paymentSchema.parse(payment)
    expect(parsed.kind).toBe('RECEIPT')
    expect(PAYMENT_METHODS).toContain('TRANSFER')
    expect(paymentSchema.safeParse({ ...payment, amountDZD: 0 }).success).toBe(false)
  })

  it('paymentKindSchema admits receipts and refunds only', () => {
    expect(paymentKindSchema.options).toEqual(['RECEIPT', 'REFUND'])
    expect(paymentSchema.safeParse({ ...payment, kind: 'VOUCHER' }).success).toBe(false)
  })

  it('paymentCreateSchema accepts a method + amount, rejects fractional amount', () => {
    const parsed = paymentCreateSchema.parse({
      invoiceId: 'i1',
      method: 'CHEQUE',
      amountDZD: 3000,
      reference: 'CHQ-004',
    })
    expect(parsed.reference).toBe('CHQ-004')
    expect(
      paymentCreateSchema.safeParse({ invoiceId: 'i1', method: 'CASH', amountDZD: 10.5 }).success,
    ).toBe(false)
    expect(
      paymentCreateSchema.safeParse({ invoiceId: 'i1', method: 'CASH', amountDZD: 0 }).success,
    ).toBe(false)
    expect(
      paymentCreateSchema.safeParse({ invoiceId: 'i1', method: 'CRYPTO', amountDZD: 5 }).success,
    ).toBe(false)
  })

  it('refundCreateSchema requires a positive whole amount', () => {
    expect(refundCreateSchema.parse({ amountDZD: 500 }).amountDZD).toBe(500)
    expect(refundCreateSchema.safeParse({ amountDZD: -5 }).success).toBe(false)
  })

  it('paymentQuerySchema coerces invoiceNumber and limit', () => {
    expect(paymentQuerySchema.parse({ invoiceNumber: '12', limit: '5' }).invoiceNumber).toBe(12)
    expect(paymentQuerySchema.parse({ limit: '5' }).limit).toBe(5)
    expect(paymentQuerySchema.safeParse({ limit: 0 }).success).toBe(false)
  })
})

describe('expense contracts', () => {
  const expense = {
    id: 'ex1',
    branchId: 'b1',
    category: 'UTILITIES' as const,
    amountDZD: 8500,
    description: 'Électricité août',
    incurredAt: '2026-08-17T00:00:00.000Z',
    voidedAt: null,
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
    createdById: null,
  }

  it('expenseCategorySchema accepts known categories only', () => {
    expect(expenseCategorySchema.parse('SALARY')).toBe('SALARY')
    expect(EXPENSE_CATEGORIES).toContain('OTHER')
    expect(expenseCategorySchema.safeParse('SNACKS').success).toBe(false)
  })

  it('expenseSchema validates a row', () => {
    const parsed = expenseSchema.parse(expense)
    expect(parsed.amountDZD).toBe(8500)
    expect(expenseSchema.safeParse({ ...expense, amountDZD: 0 }).success).toBe(false)
  })

  it('expenseInputSchema requires category/amount/description, allows date', () => {
    const parsed = expenseInputSchema.parse({
      category: 'RENT',
      amountDZD: 120000,
      description: 'Loyer local',
    })
    expect(parsed.category).toBe('RENT')
    expect(expenseInputSchema.safeParse({ category: 'RENT', amountDZD: 120000 }).success).toBe(
      false,
    )
    expect(
      expenseInputSchema.safeParse({
        category: 'RENT',
        amountDZD: 120000,
        description: 'x'.repeat(301),
      }).success,
    ).toBe(false)
    expect(
      expenseInputSchema.safeParse({ category: 'RENT', amountDZD: 10.5, description: 'a' }).success,
    ).toBe(false)
  })

  it('expenseUpdateSchema rejects an empty patch', () => {
    expect(expenseUpdateSchema.parse({ description: 'Nouvelle note' }).description).toBe(
      'Nouvelle note',
    )
    expect(expenseUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('expenseQuerySchema parses filters and coerces limit', () => {
    const parsed = expenseQuerySchema.parse({
      category: 'EQUIPMENT',
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-31T00:00:00.000Z',
      voided: 'only',
      limit: '10',
    })
    expect(parsed.limit).toBe(10)
    expect(parsed.voided).toBe('only')
    expect(expenseQuerySchema.safeParse({ voided: 'sometimes' }).success).toBe(false)
  })

  it('expenseListSchema wraps items + total', () => {
    const parsed = expenseListSchema.parse({ items: [expense], total: 1 })
    expect(parsed.total).toBe(1)
    expect(parsed.items[0].category).toBe('UTILITIES')
  })

  it('financeByMethodSchema requires all four methods', () => {
    const parsed = financeByMethodSchema.parse({ CASH: 100, CHEQUE: 0, CARD: 250, TRANSFER: 0 })
    expect(parsed.CASH).toBe(100)
    expect(financeByMethodSchema.safeParse({ CASH: 10 }).success).toBe(false)
    expect(
      financeByMethodSchema.safeParse({ CASH: -1, CHEQUE: 0, CARD: 0, TRANSFER: 0 }).success,
    ).toBe(false)
  })

  it('financeReportSchema validates a full derived report', () => {
    const report = financeReportSchema.parse({
      from: '2026-08-17T00:00:00.000Z',
      to: '2026-08-18T00:00:00.000Z',
      revenue: {
        receiptsDZD: 5000,
        refundsDZD: 200,
        netDZD: 4800,
        byMethod: { CASH: 4800, CHEQUE: 0, CARD: 0, TRANSFER: 0 },
      },
      expenses: {
        totalDZD: 120000,
        count: 1,
        byCategory: {
          SALARY: 0,
          RENT: 120000,
          SUPPLIES: 0,
          EQUIPMENT: 0,
          UTILITIES: 0,
          MAINTENANCE: 0,
          MARKETING: 0,
          TAXES: 0,
          OTHER: 0,
        },
      },
      netDZD: -115200,
      days: [
        {
          start: '2026-08-17T00:00:00.000Z',
          receiptsDZD: 5000,
          refundsDZD: 200,
          revenueDZD: 4800,
          expensesDZD: 120000,
          netDZD: -115200,
        },
      ],
    })
    expect(report.netDZD).toBe(-115200)
    expect(financeDaySchema.safeParse(report.days[0]).success).toBe(true)
    expect(
      financeReportSchema.safeParse({ ...report, revenue: { ...report.revenue, receiptsDZD: 1.5 } })
        .success,
    ).toBe(false)
  })

  it('financeReportQuerySchema parses windows and rejects malformed dates', () => {
    const parsed = financeReportQuerySchema.parse({
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-31T00:00:00.000Z',
    })
    expect(parsed.from).toBe('2026-08-01T00:00:00.000Z')
    expect(financeReportQuerySchema.parse({}).from).toBeUndefined()
    expect(financeReportQuerySchema.safeParse({ from: 'yesterday' }).success).toBe(false)
  })

  it('PRODUCT_CATEGORIES/PRODUCT_UNITS are fixed lists', () => {
    expect(PRODUCT_CATEGORIES).toContain('DISPOSABLES')
    expect(PRODUCT_CATEGORIES).toContain('OTHER')
    expect(PRODUCT_UNITS).toContain('BOX')
    expect(PRODUCT_UNITS).toContain('KIT')
  })

  it('productSchema validates a row with on-hand quantity', () => {
    const product = {
      id: 'p1',
      branchId: 'b1',
      name: 'Gants nitrile M',
      code: 'GN-100',
      category: 'DISPOSABLES' as const,
      unit: 'BOX' as const,
      reorderLevel: 5,
      quantityOnHand: 12,
      archivedAt: null,
      createdAt: '2026-08-17T00:00:00.000Z',
      updatedAt: '2026-08-17T00:00:00.000Z',
      createdById: 'u1',
    }
    const parsed = productSchema.parse(product)
    expect(parsed.quantityOnHand).toBe(12)
    expect(productSchema.safeParse({ ...product, quantityOnHand: -1 }).success).toBe(false)
  })

  it('productInputSchema defaults reorderLevel and quantity, rejects negatives', () => {
    const parsed = productInputSchema.parse({
      name: 'Anesthésique',
      category: 'ANESTHETICS',
      unit: 'SYRINGE',
    })
    expect(parsed.reorderLevel).toBe(0)
    expect(parsed.quantityOnHand).toBe(0)
    expect(
      productInputSchema.safeParse({
        name: 'x',
        category: 'ANESTHETICS',
        unit: 'UNIT',
        quantityOnHand: -3,
      }).success,
    ).toBe(false)
  })

  it('productUpdateSchema is a partial (no defaults) and query coerces limit', () => {
    expect(productUpdateSchema.parse({ reorderLevel: 8 }).reorderLevel).toBe(8)
    expect(productUpdateSchema.safeParse({}).success).toBe(false)
    const q = productQuerySchema.parse({ category: 'EQUIPMENT', archived: 'only', limit: '10' })
    expect(q.limit).toBe(10)
    expect(q.archived).toBe('only')
    expect(productQuerySchema.safeParse({ archived: 'sometimes' }).success).toBe(false)
  })

  it('productListSchema wraps items + total', () => {
    const parsed = productListSchema.parse({
      items: [
        {
          id: 'p1',
          branchId: 'b1',
          name: 'Gants',
          code: null,
          category: 'DISPOSABLES' as const,
          unit: 'BOX' as const,
          reorderLevel: 5,
          quantityOnHand: 3,
          archivedAt: null,
          createdAt: '2026-08-17T00:00:00.000Z',
          updatedAt: '2026-08-17T00:00:00.000Z',
          createdById: null,
        },
      ],
      total: 1,
    })
    expect(parsed.items[0].category).toBe('DISPOSABLES')
  })

  it('supplierSchema validates a row and rejects bad email/name', () => {
    const supplier = {
      id: 's1',
      branchId: 'b1',
      name: 'Alger Pharma',
      phone: '+213 21 00 00 00',
      email: 'contact@algerpharma.dz',
      address: 'Alger',
      notes: null,
      archivedAt: null,
      createdAt: '2026-08-17T00:00:00.000Z',
      updatedAt: '2026-08-17T00:00:00.000Z',
      createdById: 'u1',
    }
    expect(supplierSchema.parse(supplier).name).toBe('Alger Pharma')
    expect(supplierInputSchema.safeParse({ name: '  ' }).success).toBe(false)
    expect(supplierInputSchema.safeParse({ name: 'X', email: 'not-an-email' }).success).toBe(false)
  })

  it('supplierUpdateSchema is partial and query coerces limit', () => {
    expect(supplierUpdateSchema.parse({ phone: '123' }).phone).toBe('123')
    expect(supplierUpdateSchema.safeParse({}).success).toBe(false)
    const q = supplierQuerySchema.parse({ archived: 'only', limit: '10' })
    expect(q.limit).toBe(10)
    expect(supplierQuerySchema.safeParse({ archived: 'maybe' }).success).toBe(false)
  })

  it('supplierListSchema wraps items + total', () => {
    const parsed = supplierListSchema.parse({
      items: [
        {
          id: 's1',
          branchId: 'b1',
          name: 'Alger Pharma',
          phone: null,
          email: null,
          address: null,
          notes: null,
          archivedAt: null,
          createdAt: '2026-08-17T00:00:00.000Z',
          updatedAt: '2026-08-17T00:00:00.000Z',
          createdById: null,
        },
      ],
      total: 1,
    })
    expect(parsed.items[0].name).toBe('Alger Pharma')
  })

  it('PURCHASE_ORDER_STATUSES is the fixed list', () => {
    expect(PURCHASE_ORDER_STATUSES).toContain('ORDERED')
    expect(PURCHASE_ORDER_STATUSES).toContain('CANCELLED')
    expect(PURCHASE_ORDER_STATUSES).toContain('PARTIALLY_RECEIVED')
  })

  it('purchaseOrderSchema validates a row with derived total', () => {
    const po = {
      id: 'po1',
      branchId: 'b1',
      supplierId: 's1',
      supplierName: 'Alger Pharma',
      reference: 'CMD-001',
      notes: null,
      status: 'ORDERED' as const,
      orderedAt: '2026-08-17T00:00:00.000Z',
      receivedAt: null,
      createdAt: '2026-08-17T00:00:00.000Z',
      updatedAt: '2026-08-17T00:00:00.000Z',
      createdById: 'u1',
      totalDZD: 12_000,
      lineCount: 1,
    }
    expect(purchaseOrderSchema.parse(po).status).toBe('ORDERED')
    expect(purchaseOrderSchema.safeParse({ ...po, totalDZD: -1 }).success).toBe(false)
  })

  it('purchaseOrderCreateSchema validates lines + supplier', () => {
    const parsed = purchaseOrderCreateSchema.parse({
      supplierId: 's1',
      reference: 'CMD-001',
      lines: [{ productId: 'p1', quantity: 12, unitPriceDZD: 1000 }],
    })
    expect(parsed.lines[0].quantity).toBe(12)
    expect(purchaseOrderCreateSchema.safeParse({ lines: [] }).success).toBe(false)
    expect(
      purchaseOrderCreateSchema.safeParse({
        lines: [{ productId: 'p1', quantity: 0, unitPriceDZD: 1000 }],
      }).success,
    ).toBe(false)
  })

  it('order update is partial and receive is bounded', () => {
    expect(purchaseOrderUpdateSchema.parse({ notes: 'urgent' }).notes).toBe('urgent')
    expect(purchaseOrderUpdateSchema.safeParse({}).success).toBe(false)
    const recv = purchaseOrderReceiveSchema.parse({
      lines: [{ purchaseOrderLineId: 'l1', quantity: 5 }],
    })
    expect(recv.lines[0].quantity).toBe(5)
    expect(
      purchaseOrderReceiveSchema.safeParse({
        lines: [{ purchaseOrderLineId: 'l1', quantity: 0 }],
      }).success,
    ).toBe(false)
    expect(
      purchaseOrderReceiveSchema.safeParse({ lines: [{ purchaseOrderLineId: 'l1', quantity: -1 }] })
        .success,
    ).toBe(false)
  })

  it('purchaseOrderListSchema + detail lines + query status filter', () => {
    const line = {
      id: 'l1',
      productId: 'p1',
      productName: 'Gants nitrile M',
      unit: 'BOX' as const,
      unitPriceDZD: 1000,
      quantity: 12,
      receivedQuantity: 12,
      lineTotalDZD: 12_000,
    }
    const row = {
      id: 'po1',
      branchId: 'b1',
      supplierId: null,
      supplierName: null,
      reference: null,
      notes: null,
      status: 'RECEIVED' as const,
      orderedAt: '2026-08-17T00:00:00.000Z',
      receivedAt: '2026-08-17T00:00:00.000Z',
      createdAt: '2026-08-17T00:00:00.000Z',
      updatedAt: '2026-08-17T00:00:00.000Z',
      createdById: null,
      totalDZD: 12_000,
      lineCount: 1,
    }
    expect(purchaseOrderListSchema.parse({ items: [row], total: 1 }).items[0].status).toBe(
      'RECEIVED',
    )
    const detail = purchaseOrderDetailSchema.parse({ ...row, lines: [line] })
    expect(detail.lines[0].lineTotalDZD).toBe(12_000)
    const q = purchaseOrderQuerySchema.parse({ status: 'ORDERED', supplierId: 's1', limit: '5' })
    expect(q.status).toBe('ORDERED')
    expect(q.limit).toBe(5)
    expect(purchaseOrderQuerySchema.safeParse({ status: 'SOMETHING' }).success).toBe(false)
  })

  it('STOCK_LEDGER_TYPES is the fixed movement set', () => {
    expect(STOCK_LEDGER_TYPES).toEqual(['OPENING', 'IN', 'OUT', 'ADJUST'])
  })

  it('stockEntrySchema validates an OPENING row with null batch/cost', () => {
    const entry = stockEntrySchema.parse({
      id: 'e1',
      branchId: 'b1',
      productId: 'p1',
      productName: 'Gants nitrile M',
      unit: 'BOX',
      type: 'OPENING',
      quantity: 12,
      unitCostDZD: null,
      batch: null,
      expiryDate: null,
      reason: 'Opening balance (3.3)',
      purchaseOrderId: null,
      appointmentId: null,
      createdById: null,
      createdAt: '2026-08-17T00:00:00.000Z',
    })
    expect(entry.type).toBe('OPENING')
    expect(stockEntrySchema.safeParse({ ...entry, unit: 'FAKE' }).success).toBe(false)
  })

  it('stockEntrySchema validates an IN row with batch + expiry', () => {
    const entry = stockEntrySchema.parse({
      id: 'e2',
      branchId: 'b1',
      productId: 'p1',
      productName: 'Lidocaïne',
      unit: 'BOTTLE',
      type: 'IN',
      quantity: 20,
      unitCostDZD: 500,
      batch: 'LID-2026',
      expiryDate: '2027-01-01T00:00:00.000Z',
      reason: null,
      purchaseOrderId: 'po1',
      appointmentId: null,
      createdById: 'u1',
      createdAt: '2026-08-17T00:00:00.000Z',
    })
    expect(entry.batch).toBe('LID-2026')
  })

  it('stockOutInputSchema requires a quantity + reason', () => {
    const out = stockOutInputSchema.parse({ quantity: 3, reason: 'Usage soins' })
    expect(out.quantity).toBe(3)
    expect(stockOutInputSchema.safeParse({ reason: 'x' }).success).toBe(false)
    expect(stockOutInputSchema.safeParse({ quantity: 0, reason: 'x' }).success).toBe(false)
  })

  it('stockAdjustInputSchema allows signed non-zero quantities with optional lot', () => {
    const up = stockAdjustInputSchema.parse({ quantity: 5, reason: 'Don' })
    const down = stockAdjustInputSchema.parse({ quantity: -2, reason: 'Casse' })
    expect(up.quantity).toBe(5)
    expect(down.quantity).toBe(-2)
    expect(stockAdjustInputSchema.safeParse({ quantity: 0, reason: 'x' }).success).toBe(false)
    expect(
      stockAdjustInputSchema.safeParse({
        quantity: -1,
        reason: 'x',
        batch: 'B-1',
        expiryDate: '2027-06-01T00:00:00.000Z',
      }).success,
    ).toBe(true)
    expect(
      stockAdjustInputSchema.safeParse({
        quantity: -1,
        reason: 'x',
        batch: 'y'.repeat(MAX_STOCK_BATCH + 1),
      }).success,
    ).toBe(false)
  })

  it('stockQuerySchema coerces filters and caps the limit', () => {
    const q = stockQuerySchema.parse({
      productId: 'p1',
      type: 'IN',
      limit: '5',
      offset: '2',
    })
    expect(q.type).toBe('IN')
    expect(q.limit).toBe(5)
    expect(stockQuerySchema.safeParse({ type: 'OPENING', limit: '9999' }).success).toBe(false)
    expect(stockQuerySchema.safeParse({ from: 'not-a-date' }).success).toBe(false)
  })

  it('stockListSchema wraps items + total', () => {
    const parsed = stockListSchema.parse({ items: [], total: 0 })
    expect(parsed.total).toBe(0)
  })

  it('stockAlertQuerySchema defaults horizon and bounds it', () => {
    expect(stockAlertQuerySchema.parse({}).horizonDays).toBe(30)
    expect(stockAlertQuerySchema.parse({ horizonDays: '60' }).horizonDays).toBe(60)
    expect(stockAlertQuerySchema.safeParse({ horizonDays: 0 }).success).toBe(false)
    expect(stockAlertQuerySchema.safeParse({ horizonDays: 9999 }).success).toBe(false)
  })

  it('lowStockAlertSchema validates an alert row', () => {
    const alert = lowStockAlertSchema.parse({
      productId: 'p1',
      productName: 'Gants nitrile M',
      unit: 'BOX',
      category: 'DISPOSABLES',
      quantityOnHand: 3,
      reorderLevel: 5,
    })
    expect(alert.quantityOnHand).toBe(3)
    expect(lowStockAlertSchema.safeParse({ ...alert, quantityOnHand: -1 }).success).toBe(false)
  })

  it('expiringLotAlertSchema validates a lot alert and requires positive remaining', () => {
    const alert = expiringLotAlertSchema.parse({
      productId: 'p1',
      productName: 'Lidocaïne',
      unit: 'BOTTLE',
      batch: 'LID-2026',
      expiryDate: '2027-01-31T00:00:00.000Z',
      remaining: 4,
      expired: false,
    })
    expect(alert.batch).toBe('LID-2026')
    expect(expiringLotAlertSchema.safeParse({ ...alert, remaining: 0 }).success).toBe(false)
    expect(expiringLotAlertSchema.safeParse({ ...alert, batch: '' }).success).toBe(false)
  })

  it('stockAlertsSchema wraps the derived feed', () => {
    const parsed = stockAlertsSchema.parse({
      lowStock: [],
      expiring: [],
      generatedAt: '2026-08-18T00:00:00.000Z',
    })
    expect(parsed.lowStock).toEqual([])
    expect(stockAlertsSchema.safeParse({ lowStock: [], expiring: [] }).success).toBe(false)
  })

  it('purchaseOrderReceiveSchema accepts optional batch/expiry per line', () => {
    const recv = purchaseOrderReceiveSchema.parse({
      lines: [
        { purchaseOrderLineId: 'l1', quantity: 5 },
        {
          purchaseOrderLineId: 'l2',
          quantity: 2,
          batch: 'B-99',
          expiryDate: '2027-01-01T00:00:00.000Z',
        },
      ],
    })
    expect(recv.lines[1].batch).toBe('B-99')
    expect(
      purchaseOrderReceiveSchema.safeParse({
        lines: [{ purchaseOrderLineId: 'l1', quantity: 1, batch: 'x'.repeat(MAX_STOCK_BATCH + 1) }],
      }).success,
    ).toBe(false)
  })

  it('treatmentConsumptionSchema validates a consumption row', () => {
    const c = treatmentConsumptionSchema.parse({
      id: 'c1',
      branchId: 'b1',
      appointmentId: 'a1',
      productId: 'p1',
      productName: 'Gants nitrile M',
      unit: 'BOX',
      patientName: 'Amine Benali',
      quantity: 2,
      batch: null,
      reason: null,
      consumedAt: '2026-08-18T09:00:00.000Z',
      createdByName: 'Karim',
    })
    expect(c.quantity).toBe(2)
    expect(treatmentConsumptionSchema.safeParse({ ...c, quantity: 0 }).success).toBe(false)
  })

  it('treatmentConsumptionInputSchema requires product + positive quantity', () => {
    const ok = treatmentConsumptionInputSchema.parse({ productId: 'p1', quantity: 2 })
    expect(ok.quantity).toBe(2)
    expect(treatmentConsumptionInputSchema.safeParse({ quantity: 2 }).success).toBe(false)
    expect(
      treatmentConsumptionInputSchema.safeParse({ productId: 'p1', quantity: 0 }).success,
    ).toBe(false)
    expect(
      treatmentConsumptionInputSchema.safeParse({
        productId: 'p1',
        quantity: 1,
        batch: 'x'.repeat(MAX_STOCK_BATCH + 1),
      }).success,
    ).toBe(false)
  })

  it('treatmentConsumptionQuerySchema coerces filters and caps limit', () => {
    const q = treatmentConsumptionQuerySchema.parse({
      appointmentId: 'a1',
      limit: '200',
      offset: '0',
    })
    expect(q.appointmentId).toBe('a1')
    expect(treatmentConsumptionQuerySchema.safeParse({ limit: '9999' }).success).toBe(false)
  })

  it('treatmentConsumptionListSchema wraps items + total', () => {
    const parsed = treatmentConsumptionListSchema.parse({ items: [], total: 0 })
    expect(parsed.total).toBe(0)
  })

  it('STERILIZATION_METHODS/STERILIZATION_STATUSES are fixed lists', () => {
    expect(STERILIZATION_METHODS).toContain('AUTOCLAVE')
    expect(STERILIZATION_METHODS).toContain('UV')
    expect(STERILIZATION_STATUSES).toEqual(['IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'])
  })

  it('sterilizationLogSchema validates a log row', () => {
    const log = sterilizationLogSchema.parse({
      id: 's1',
      branchId: 'b1',
      productId: 'p1',
      instrument: 'Détartreur kit',
      method: 'AUTOCLAVE',
      cycle: 12,
      status: 'COMPLETED',
      startedAt: '2026-08-18T08:00:00.000Z',
      completedAt: '2026-08-18T08:45:00.000Z',
      operatorName: 'Karim',
      notes: null,
      createdByName: 'Karim',
      createdAt: '2026-08-18T08:00:00.000Z',
    })
    expect(log.cycle).toBe(12)
    expect(sterilizationLogSchema.safeParse({ ...log, status: 'FAKE' }).success).toBe(false)
  })

  it('sterilizationInputSchema requires instrument + method', () => {
    const ok = sterilizationInputSchema.parse({
      instrument: 'Détartreur kit',
      method: 'AUTOCLAVE',
      cycle: 1,
    })
    expect(ok.method).toBe('AUTOCLAVE')
    expect(sterilizationInputSchema.safeParse({ method: 'AUTOCLAVE' }).success).toBe(false)
    expect(sterilizationInputSchema.safeParse({ instrument: 'x', method: 'FAKE' }).success).toBe(
      false,
    )
  })

  it('sterilizationUpdateSchema needs at least one field and validates status', () => {
    const ok = sterilizationUpdateSchema.parse({ status: 'COMPLETED' })
    expect(ok.status).toBe('COMPLETED')
    expect(sterilizationUpdateSchema.safeParse({}).success).toBe(false)
    expect(sterilizationUpdateSchema.safeParse({ status: 'FAKE' }).success).toBe(false)
  })

  it('sterilizationQuerySchema coerces filters and caps limit', () => {
    const q = sterilizationQuerySchema.parse({ status: 'IN_PROGRESS', limit: '5' })
    expect(q.status).toBe('IN_PROGRESS')
    expect(sterilizationQuerySchema.safeParse({ status: 'FAKE' }).success).toBe(false)
    expect(sterilizationQuerySchema.safeParse({ limit: '9999' }).success).toBe(false)
  })

  it('auditActionSchema includes sterilization actions and targets', () => {
    expect(auditActionSchema.options).toContain('STERILIZATION_CREATE')
    expect(auditActionSchema.options).toContain('STERILIZATION_UPDATE')
  })
})

describe('staff contracts (ADR 027)', () => {
  it('staffRoleSchema excludes PATIENT and keeps staff roles', () => {
    expect(STAFF_ROLES).toEqual(['ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT', 'INTERN'])
    expect(staffRoleSchema.safeParse('PATIENT').success).toBe(false)
    expect(staffRoleSchema.safeParse('DENTIST').success).toBe(true)
  })

  it('weekdaySchema + WEEKDAYS list the week in order', () => {
    expect(WEEKDAYS).toEqual([
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ])
    expect(weekdaySchema.safeParse('MONDAY').success).toBe(true)
    expect(weekdaySchema.safeParse('MONDAYY').success).toBe(false)
  })

  it('staffInputSchema requires name/email/password and a staff role', () => {
    const ok = staffInputSchema.parse({
      name: 'Dr. Nora',
      email: 'NORA@dentora.DZ',
      password: 'correct-horse',
      role: 'DENTIST',
    })
    expect(ok.email).toBe('nora@dentora.dz')
    expect(ok.active).toBe(true)
    expect(
      staffInputSchema.safeParse({ name: 'x', email: 'a@b.dz', password: 'short' }).success,
    ).toBe(false)
    expect(
      staffInputSchema.safeParse({
        name: 'x',
        email: 'a@b.dz',
        password: 'long-enough',
        role: 'PATIENT',
      }).success,
    ).toBe(false)
  })

  it('staffUpdateSchema requires at least one field', () => {
    expect(staffUpdateSchema.safeParse({ name: 'Dr. Nora' }).success).toBe(true)
    expect(staffUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('staffQuerySchema coerces limit/offset and booleans', () => {
    const q = staffQuerySchema.parse({
      search: 'nora',
      role: 'DENTIST',
      active: 'true',
      limit: '10',
    })
    expect(q.active).toBe(true)
    expect(q.limit).toBe(10)
    expect(staffQuerySchema.parse({ active: 'false' }).active).toBe(false)
    expect(staffQuerySchema.parse({ active: '0' }).active).toBe(false)
    expect(staffQuerySchema.safeParse({ limit: '9999' }).success).toBe(false)
    expect(staffQuerySchema.safeParse({ role: 'PATIENT' }).success).toBe(false)
  })

  it('staffListSchema wraps items + total', () => {
    const parsed = staffListSchema.parse({
      items: [
        {
          id: 'u1',
          email: 'a@b.dz',
          name: 'A',
          role: 'ADMIN',
          branchId: 'b1',
          active: true,
          patientId: null,
        },
      ],
      total: 1,
    })
    expect(parsed.items[0].email).toBe('a@b.dz')
    expect(parsed.total).toBe(1)
  })

  it('staffScheduleRowSchema validates HH:mm times', () => {
    const ok = staffScheduleRowSchema.parse({
      weekday: 'MONDAY',
      startTime: '08:00',
      endTime: '12:00',
    })
    expect(ok.active).toBe(true)
    expect(
      staffScheduleRowSchema.safeParse({ weekday: 'MONDAY', startTime: '8:00', endTime: '12:00' })
        .success,
    ).toBe(false)
    expect(
      staffScheduleRowSchema.safeParse({ weekday: 'MONDAY', startTime: '08:00', endTime: '24:00' })
        .success,
    ).toBe(false)
  })

  it('staffScheduleInputSchema caps the row count', () => {
    const rows = Array.from({ length: 7 * 3 }, (_, i) => ({
      weekday: 'MONDAY',
      startTime: '08:00',
      endTime: '09:00',
      active: true,
      slot: i,
    }))
    expect(staffScheduleInputSchema.safeParse({ schedules: rows }).success).toBe(true)
    expect(
      staffScheduleInputSchema.safeParse({
        schedules: [...rows, { weekday: 'MONDAY', startTime: '10:00', endTime: '11:00' }],
      }).success,
    ).toBe(false)
  })

  it('staffScheduleSchema validates a stored row', () => {
    const parsed = staffScheduleSchema.parse({
      id: 's1',
      staffId: 'u1',
      weekday: 'FRIDAY',
      startTime: '09:00',
      endTime: '13:00',
      active: true,
    })
    expect(parsed.weekday).toBe('FRIDAY')
    expect(staffScheduleListSchema.parse({ schedules: [parsed] }).schedules.length).toBe(1)
  })

  it('resetPasswordSchema enforces a minimum length', () => {
    expect(resetPasswordSchema.parse({ password: 'eight-char' }).password).toBe('eight-char')
    expect(resetPasswordSchema.safeParse({ password: 'short' }).success).toBe(false)
  })

  it('auditActionSchema includes staff + schedule actions and SCHEDULE target', () => {
    expect(auditActionSchema.options).toContain('STAFF_CREATE')
    expect(auditActionSchema.options).toContain('STAFF_UPDATE')
    expect(auditActionSchema.options).toContain('STAFF_PASSWORD_RESET')
    expect(auditActionSchema.options).toContain('SCHEDULE_UPDATE')
    expect(auditTargetSchema.options).toContain('SCHEDULE')
  })
})

describe('attendance contracts (ADR 028)', () => {
  const valid = {
    id: 'a1',
    branchId: 'b1',
    staffId: 'u1',
    staffName: 'Karim',
    staffRole: 'DENTIST',
    date: '2026-08-18T00:00:00.000Z',
    checkIn: '2026-08-18T08:30:00.000Z',
    checkOut: '2026-08-18T16:30:00.000Z',
    workedMinutes: 480,
    notes: null,
    createdByName: 'Yasmine',
  }

  it('attendanceLogSchema validates a read row with derived worked minutes', () => {
    const parsed = attendanceLogSchema.parse(valid)
    expect(parsed.workedMinutes).toBe(480)
    expect(attendanceLogSchema.safeParse({ ...valid, workedMinutes: -5 }).success).toBe(false)
  })

  it('attendanceInputSchema requires staffId + valid date, optional times', () => {
    const ok = attendanceInputSchema.parse({ staffId: 'u1', date: '2026-08-18' })
    expect(ok.checkIn).toBeUndefined()
    expect(attendanceInputSchema.safeParse({ staffId: 'u1' }).success).toBe(false)
    expect(attendanceInputSchema.safeParse({ staffId: 'u1', date: 'not-a-date' }).success).toBe(
      false,
    )
    expect(
      attendanceInputSchema.safeParse({ staffId: 'u1', date: '2026-08-18', checkIn: 'nope' })
        .success,
    ).toBe(false)
  })

  it('attendanceUpdateSchema requires at least one editable field', () => {
    expect(attendanceUpdateSchema.safeParse({ checkOut: null }).success).toBe(true)
    expect(attendanceUpdateSchema.safeParse({ notes: 'ok' }).success).toBe(true)
    expect(attendanceUpdateSchema.safeParse({}).success).toBe(false)
    expect(attendanceUpdateSchema.safeParse({ checkIn: 'bogus' }).success).toBe(false)
  })

  it('attendanceQuerySchema coerces limit/offset and the open flag', () => {
    const q = attendanceQuerySchema.parse({ staffId: 'u1', open: 'true', limit: '5' })
    expect(q.open).toBe(true)
    expect(q.limit).toBe(5)
    expect(attendanceQuerySchema.parse({ open: 'false' }).open).toBe(false)
    expect(attendanceQuerySchema.safeParse({ limit: '9999' }).success).toBe(false)
  })

  it('attendanceListSchema wraps items + total', () => {
    const parsed = attendanceListSchema.parse({ items: [valid], total: 1 })
    expect(parsed.items[0].staffName).toBe('Karim')
    expect(parsed.total).toBe(1)
  })

  it('attendanceRosterSchema validates the minimal roster rows', () => {
    const parsed = attendanceRosterSchema.parse({
      staff: [
        { id: 'u1', name: 'Karim', role: 'DENTIST' },
        { id: 'u2', name: 'Lina', role: 'RECEPTIONIST' },
      ],
    })
    expect(parsed.staff).toHaveLength(2)
    expect(attendanceRosterSchema.safeParse({ staff: [{ id: 'u1', name: 'Karim' }] }).success).toBe(
      false,
    )
  })

  it('auditActionSchema includes attendance actions and ATTENDANCE target', () => {
    expect(auditActionSchema.options).toContain('ATTENDANCE_CREATE')
    expect(auditActionSchema.options).toContain('ATTENDANCE_UPDATE')
    expect(auditTargetSchema.options).toContain('ATTENDANCE')
  })
})

describe('intern contracts (ADR 029)', () => {
  const valid = {
    id: 'p1',
    internId: 'u1',
    internName: 'Rayan Meziane',
    internEmail: 'rayan@dentora.dz',
    school: 'Université d’Alger',
    requiredHours: 200,
    rotation: 'CARE',
    mentorId: 'm1',
    mentorName: 'Dr. Karim Bensalem',
    startDate: '2026-05-01T00:00:00.000Z',
    endDate: '2026-10-01T00:00:00.000Z',
    completedMinutes: 7200,
    progressPct: 60,
    active: true,
    notes: null,
  }

  it('internProfileSchema validates a read row with derived hours', () => {
    const parsed = internProfileSchema.parse(valid)
    expect(parsed.progressPct).toBe(60)
    expect(internProfileSchema.safeParse({ ...valid, requiredHours: 0 }).success).toBe(false)
    expect(internProfileSchema.safeParse({ ...valid, rotation: 'BOGUS' }).success).toBe(false)
  })

  it('internInputSchema requires internId + school + rotation + startDate', () => {
    const ok = internInputSchema.parse({
      internId: 'u1',
      school: 'Université d’Alger',
      requiredHours: 200,
      rotation: 'CARE',
      startDate: '2026-05-01',
    })
    expect(ok.endDate).toBeUndefined()
    expect(internInputSchema.safeParse({ internId: 'u1', rotation: 'CARE' }).success).toBe(false)
    expect(
      internInputSchema.safeParse({
        internId: 'u1',
        school: ' ',
        requiredHours: 1,
        rotation: 'CARE',
        startDate: 'nope',
      }).success,
    ).toBe(false)
    expect(
      internInputSchema.safeParse({
        internId: 'u1',
        school: 'S',
        requiredHours: 0,
        rotation: 'CARE',
        startDate: '2026-05-01',
      }).success,
    ).toBe(false)
  })

  it('internUpdateSchema requires at least one editable field', () => {
    expect(internUpdateSchema.safeParse({}).success).toBe(false)
    expect(internUpdateSchema.safeParse({ active: false }).success).toBe(true)
    expect(internUpdateSchema.safeParse({ mentorId: null }).success).toBe(true)
    expect(internUpdateSchema.safeParse({ endDate: null }).success).toBe(true)
    expect(internUpdateSchema.safeParse({ school: 'CHU Alger Centre' }).success).toBe(true)
    expect(internUpdateSchema.safeParse({ startDate: 'bogus' }).success).toBe(false)
  })

  it('internQuerySchema coerces limit/offset and the active flag', () => {
    const q = internQuerySchema.parse({ active: 'false', rotation: 'SURGERY', limit: '10' })
    expect(q.active).toBe(false)
    expect(q.rotation).toBe('SURGERY')
    expect(internQuerySchema.safeParse({ rotation: 'BOGUS' }).success).toBe(false)
    expect(internQuerySchema.safeParse({ limit: '9999' }).success).toBe(false)
  })

  it('internListSchema wraps items + total', () => {
    const parsed = internListSchema.parse({ items: [valid], total: 1 })
    expect(parsed.items[0].internName).toBe('Rayan Meziane')
    expect(parsed.total).toBe(1)
  })

  it('internMetaSchema validates mentors + interns', () => {
    const parsed = internMetaSchema.parse({
      mentors: [{ id: 'm1', name: 'Dr. Karim Bensalem', role: 'DENTIST' }],
      interns: [{ id: 'u1', name: 'Rayan Meziane', hasProfile: false }],
    })
    expect(parsed.mentors[0].role).toBe('DENTIST')
    expect(parsed.interns[0].hasProfile).toBe(false)
    expect(internMetaSchema.safeParse({ mentors: [{ id: 'm1' }], interns: [] }).success).toBe(false)
  })

  it('internRotationSchema mirrors the exported INTERN_ROTATIONS list', () => {
    expect(internRotationSchema.options).toEqual(INTERN_ROTATIONS)
    expect(INTERN_ROTATIONS).toContain('PROSTHETIC_ORTHO')
  })

  it('auditActionSchema includes intern actions and INTERN target', () => {
    expect(auditActionSchema.options).toContain('INTERN_CREATE')
    expect(auditActionSchema.options).toContain('INTERN_UPDATE')
    expect(auditTargetSchema.options).toContain('INTERN')
  })
})

describe('payroll contracts (ADR 030)', () => {
  const valid = {
    id: 'p1',
    branchId: 'b1',
    staffId: 'u1',
    staffName: 'Dr. Karim Bensalem',
    staffRole: 'DENTIST',
    periodStart: '2026-07-01T00:00:00.000Z',
    periodEnd: '2026-07-31T00:00:00.000Z',
    baseDZD: 180000,
    bonusDZD: 20000,
    deductionsDZD: 5000,
    netDZD: 195000,
    workedMinutes: 12000,
    notes: null,
    voidedAt: null,
    createdByName: 'Dr. Admin',
  }

  it('payslipSchema validates a read row with derived net + worked minutes', () => {
    const parsed = payslipSchema.parse(valid)
    expect(parsed.netDZD).toBe(195000)
    expect(parsed.workedMinutes).toBe(12000)
    expect(payslipSchema.safeParse({ ...valid, netDZD: -1 }).success).toBe(false)
    expect(payslipSchema.safeParse({ ...valid, baseDZD: -5 }).success).toBe(false)
  })

  it('payslipInputSchema requires staffId + period + base, defaults bonus/deductions', () => {
    const ok = payslipInputSchema.parse({
      staffId: 'u1',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      baseDZD: 180000,
    })
    expect(ok.bonusDZD).toBeUndefined()
    expect(ok.deductionsDZD).toBeUndefined()
    expect(payslipInputSchema.safeParse({ staffId: 'u1', baseDZD: 100 }).success).toBe(false)
    expect(
      payslipInputSchema.safeParse({
        staffId: 'u1',
        periodStart: 'nope',
        periodEnd: '2026-07-31',
        baseDZD: 100,
      }).success,
    ).toBe(false)
    expect(
      payslipInputSchema.safeParse({
        staffId: 'u1',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        baseDZD: MAX_PAYROLL_AMOUNT_DZD + 1,
      }).success,
    ).toBe(false)
    expect(payslipInputSchema.safeParse({ staffId: 'u1', baseDZD: -10 }).success).toBe(false)
  })

  it('payslipUpdateSchema requires at least one editable field', () => {
    expect(payslipUpdateSchema.safeParse({}).success).toBe(false)
    expect(payslipUpdateSchema.safeParse({ bonusDZD: 5000 }).success).toBe(true)
    expect(payslipUpdateSchema.safeParse({ notes: null }).success).toBe(true)
    expect(payslipUpdateSchema.safeParse({ baseDZD: 'bogus' }).success).toBe(false)
  })

  it('payslipQuerySchema coerces limit/offset and the voided flag', () => {
    const q = payslipQuerySchema.parse({ voided: '1', staffId: 'u1', limit: '10' })
    expect(q.voided).toBe(true)
    expect(q.limit).toBe(10)
    expect(payslipQuerySchema.parse({ voided: 'false' }).voided).toBe(false)
    expect(payslipQuerySchema.safeParse({ limit: '9999' }).success).toBe(false)
  })

  it('payslipListSchema wraps items + total', () => {
    const parsed = payslipListSchema.parse({ items: [valid], total: 1 })
    expect(parsed.items[0].staffName).toBe('Dr. Karim Bensalem')
    expect(parsed.total).toBe(1)
  })

  it('payrollMetaSchema validates the staff roster', () => {
    const parsed = payrollMetaSchema.parse({
      staff: [{ id: 'u1', name: 'Dr. Karim Bensalem', role: 'DENTIST' }],
    })
    expect(parsed.staff[0].role).toBe('DENTIST')
    expect(payrollMetaSchema.safeParse({ staff: [{ id: 'u1', name: 'x' }] }).success).toBe(false)
  })

  it('auditActionSchema includes payroll actions and PAYROLL target', () => {
    expect(auditActionSchema.options).toContain('PAYROLL_CREATE')
    expect(auditActionSchema.options).toContain('PAYROLL_UPDATE')
    expect(auditActionSchema.options).toContain('PAYROLL_VOID')
    expect(auditTargetSchema.options).toContain('PAYROLL')
  })
})

describe('portal contracts (5.1, ADR 031)', () => {
  const me = {
    id: 'p1',
    firstName: 'Mohammed',
    lastName: 'Bouzid',
    gender: 'M',
    birthDate: '1985-04-12T00:00:00.000Z',
    phone: '0550123456',
    email: 'm.bouzid@mail.dz',
    address: '12 rue Didouche Mourad, Alger',
    notifyWhatsapp: true,
    notifyEmail: true,
  }

  it('portalMeSchema validates the self-scoped profile row', () => {
    expect(portalMeSchema.parse(me)).toMatchObject({ id: 'p1' })
    expect(portalMeSchema.parse(me).notifyWhatsapp).toBe(true)
    expect(portalMeSchema.parse(me).notifyEmail).toBe(true)
    expect(portalMeSchema.safeParse({ ...me, gender: 'X' }).success).toBe(false)
  })

  it('safeUserSchema now carries the nullable patientId link', () => {
    const staff = safeUserSchema.parse({
      id: 'u1',
      email: 'karim@dentora.dz',
      name: 'Dr. Karim Bensalem',
      role: 'DENTIST',
      branchId: 'b1',
      active: true,
      patientId: null,
    })
    expect(staff.patientId).toBeNull()
    const patient = safeUserSchema.parse({ ...staff, role: 'PATIENT', patientId: 'p1' })
    expect(patient.patientId).toBe('p1')
  })

  it('portalAppointmentsSchema wraps appointment rows', () => {
    const row = {
      id: 'a1',
      branchId: 'b1',
      patientId: 'p1',
      patientName: 'Mohammed Bouzid',
      dentistId: 'd1',
      dentistName: 'Dr. Karim Bensalem',
      startAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    expect(portalAppointmentsSchema.parse({ items: [row] }).items[0].status).toBe('PENDING')
  })

  it('portalBookingSchema requires a future window and rejects the past', () => {
    const future = { startAt: new Date(Date.now() + 86_400_000).toISOString(), endAt: '' }
    future.endAt = new Date(Date.parse(future.startAt) + 3_600_000).toISOString()
    expect(portalBookingSchema.parse({ ...future, notes: 'Révision' }).notes).toBe('Révision')
    expect(
      portalBookingSchema.safeParse({ startAt: future.startAt, endAt: future.startAt }).success,
    ).toBe(false)
    const past = { startAt: new Date(Date.now() - 3_600_000).toISOString(), endAt: '' }
    past.endAt = new Date(Date.parse(past.startAt) + 3_600_000).toISOString()
    expect(portalBookingSchema.safeParse(past).success).toBe(false)
  })

  it('portalBookedSchema reuses the appointment row shape', () => {
    expect(
      portalBookedSchema.parse({
        id: 'a1',
        branchId: 'b1',
        patientId: 'p1',
        patientName: 'Mohammed Bouzid',
        dentistId: null,
        dentistName: null,
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(),
        status: 'CANCELLED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).status,
    ).toBe('CANCELLED')
  })

  it('portalDentistListSchema validates the dentist roster', () => {
    expect(
      portalDentistListSchema.parse({ dentists: [{ id: 'd1', name: 'Dr. Karim' }] }).dentists[0]
        .name,
    ).toBe('Dr. Karim')
    expect(portalDentistListSchema.safeParse({ dentists: [{ id: 'd1' }] }).success).toBe(false)
  })

  it('portalInvoicesSchema reuses the invoice list shape', () => {
    const parsed = portalInvoicesSchema.parse({ items: [], total: 0 })
    expect(parsed.total).toBe(0)
  })

  it('portalAccess schemas validate provisioning create/reset', () => {
    expect(portalAccessInputSchema.parse({ action: 'create' }).action).toBe('create')
    expect(portalAccessInputSchema.safeParse({ action: 'delete' }).success).toBe(false)
    expect(
      portalAccessStatusSchema.parse({ hasPortalAccess: true, email: 'x@y.dz' }),
    ).toMatchObject({
      hasPortalAccess: true,
    })
    expect(
      portalAccessResponseSchema.parse({ email: 'x@y.dz', password: '7aBcDeFgHi' }).password,
    ).toHaveLength(10)
  })

  it('auditActionSchema includes the portal access actions', () => {
    expect(auditActionSchema.options).toContain('PORTAL_ACCESS_CREATE')
    expect(auditActionSchema.options).toContain('PORTAL_ACCESS_RESET')
  })
})

describe('notification contracts (5.2, ADR 032)', () => {
  it('channel/status schemas expose the fixed enums', () => {
    expect(notificationChannelSchema.options).toEqual(['WHATSAPP', 'EMAIL'])
    expect(notificationStatusSchema.options).toEqual(['SENT', 'FAILED', 'SKIPPED'])
    expect(notificationChannelSchema.parse('WHATSAPP')).toBe('WHATSAPP')
    expect(() => notificationChannelSchema.parse('SMS')).toThrow()
    expect(notificationStatusSchema.parse('FAILED')).toBe('FAILED')
  })

  it('notificationConfigSchema masks secrets behind set-flags', () => {
    const parsed = notificationConfigSchema.parse({
      enabled: true,
      offsetMinutes: 1440,
      whatsapp: {
        enabled: true,
        provider: 'generic',
        apiUrl: 'https://hooks.example.com/send',
        from: 'dentora',
        token: { set: true },
      },
      email: {
        enabled: false,
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        user: 'no-reply@dentora.dz',
        from: 'no-reply@dentora.dz',
        pass: { set: false },
      },
    })
    expect(parsed.offsetMinutes).toBe(1440)
    expect(parsed.whatsapp.token.set).toBe(true)
    expect(parsed.email.pass.set).toBe(false)
    expect(notificationConfigSchema.safeParse({ enabled: true, offsetMinutes: 15 }).success).toBe(
      false,
    )
    expect(notificationConfigSchema.safeParse({ ...parsed, offsetMinutes: 10081 }).success).toBe(
      false,
    )
  })

  it('notificationConfigUpdateSchema accepts "" secrets to mean keep-stored', () => {
    const parsed = notificationConfigUpdateSchema.parse({
      enabled: true,
      offsetMinutes: 720,
      whatsapp: { enabled: true, provider: 'generic', apiUrl: 'https://x.io', from: '', token: '' },
      email: { enabled: true, host: 'h', port: 465, secure: true, user: 'u', from: '', pass: '' },
    })
    expect(parsed.whatsapp.token).toBe('')
    expect(parsed.email.pass).toBe('')
  })

  it('notificationLogSchema validates a read row with patientName', () => {
    const parsed = notificationLogSchema.parse({
      id: 'n1',
      branchId: 'b1',
      appointmentId: 'a1',
      patientName: 'Mohammed Bouzid',
      channel: 'WHATSAPP',
      status: 'SENT',
      to: '0550123456',
      provider: 'generic-webhook',
      error: null,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })
    expect(parsed.status).toBe('SENT')
    expect(notificationLogSchema.safeParse({ ...parsed, channel: 'SMS' }).success).toBe(false)
  })

  it('notificationLogQuerySchema coerces + bounds pagination', () => {
    expect(notificationLogQuerySchema.parse({ limit: '10', channel: 'EMAIL' })).toMatchObject({
      limit: 10,
      channel: 'EMAIL',
      offset: 0,
    })
    expect(notificationLogQuerySchema.safeParse({ limit: '9999' }).success).toBe(false)
  })

  it('notificationLogListSchema + sweep result validate', () => {
    const list = notificationLogListSchema.parse({ items: [], total: 0 })
    expect(list.total).toBe(0)
    expect(
      notificationSweepResultSchema.parse({ planned: 3, created: 2, sent: 2, failed: 0 }),
    ).toMatchObject({ sent: 2 })
  })

  it('patientPrefsSchema requires both booleans', () => {
    expect(patientPrefsSchema.parse({ notifyWhatsapp: true, notifyEmail: false })).toMatchObject({
      notifyWhatsapp: true,
    })
    expect(patientPrefsSchema.safeParse({ notifyWhatsapp: true }).success).toBe(false)
  })

  it('auditActionSchema/targetSchema include the notification action + target', () => {
    expect(auditActionSchema.options).toContain('NOTIFICATION_CONFIG_UPDATE')
    expect(auditTargetSchema.options).toContain('NOTIFICATION')
  })
})

describe('reports contracts (6.1, ADR 033)', () => {
  it('occupancyReportSchema validates a full report and rejects a bad rate', () => {
    const report = occupancyReportSchema.parse({
      from: '2026-08-17T00:00:00.000Z',
      to: '2026-08-18T00:00:00.000Z',
      days: [
        {
          start: '2026-08-17T00:00:00.000Z',
          planned: 2,
          kept: 1,
          noShow: 1,
          cancelled: 0,
          utilization: 0.5,
        },
      ],
      byDentist: [
        {
          dentistId: null,
          dentistName: null,
          planned: 2,
          kept: 1,
          noShow: 1,
          cancelled: 0,
          utilization: 0.5,
        },
      ],
      summary: { planned: 2, kept: 1, noShow: 1, cancelled: 0, showRate: 0.5, utilization: 0.5 },
    })
    expect(report.summary.utilization).toBe(0.5)
    expect(
      occupancyReportSchema.safeParse({ ...report, summary: { ...report.summary, utilization: 2 } })
        .success,
    ).toBe(false)
  })

  it('reportExportQuerySchema defaults format to csv and coerces windows', () => {
    expect(reportExportQuerySchema.parse({}).format).toBe('csv')
    expect(reportExportQuerySchema.parse({ format: 'pdf' }).format).toBe('pdf')
    expect(reportExportQuerySchema.safeParse({ format: 'xlsx' }).success).toBe(false)
  })

  it('stockValuationReportSchema validates rows + summary and defaults archived to exclude', () => {
    const parsed = stockValuationQuerySchema.parse({})
    expect(parsed.archived).toBe('exclude')
    const report = stockValuationReportSchema.parse({
      generatedAt: '2026-08-17T00:00:00.000Z',
      summary: {
        totalValueDZD: 600,
        products: 1,
        costedProducts: 1,
        byCategory: {
          DISPOSABLES: 600,
          ANESTHETICS: 0,
          MATERIALS: 0,
          INSTRUMENTS: 0,
          EQUIPMENT: 0,
          MEDICATIONS: 0,
          LABORATORY: 0,
          STATIONERY: 0,
          OTHER: 0,
        },
      },
      rows: [
        {
          productId: 'a',
          name: 'Anesthésique',
          code: 'A-1',
          category: 'ANESTHETICS',
          unit: 'BOX',
          quantityOnHand: 6,
          unitCostDZD: 100,
          valueDZD: 600,
          hasCost: true,
        },
      ],
    })
    expect(report.summary.totalValueDZD).toBe(600)
    expect(
      stockValuationReportSchema.safeParse({
        ...report,
        rows: [{ ...report.rows[0], valueDZD: -1 }],
      }).success,
    ).toBe(false)
  })
})
