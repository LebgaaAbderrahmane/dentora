import { z } from 'zod'

export const healthSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  service: z.string(),
  version: z.string(),
  timestamp: z.string(),
})

export type Health = z.infer<typeof healthSchema>

export const systemStatusSchema = z.object({
  ok: z.boolean(),
  db: z.enum(['up', 'down']),
  uptimeSeconds: z.number(),
})

export type SystemStatus = z.infer<typeof systemStatusSchema>

export const roleSchema = z.enum([
  'ADMIN',
  'DENTIST',
  'RECEPTIONIST',
  'ACCOUNTANT',
  'INTERN',
  'PATIENT',
])

export type Role = z.infer<typeof roleSchema>

export const ROLES = roleSchema.options

export const staffRoleSchema = roleSchema.exclude(['PATIENT'])

export type StaffRole = z.infer<typeof staffRoleSchema>

export const STAFF_ROLES = staffRoleSchema.options

export const weekdaySchema = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
])

export type Weekday = z.infer<typeof weekdaySchema>

export const WEEKDAYS = weekdaySchema.options

export const TIME_HHMM_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export const safeUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: roleSchema,
  branchId: z.string(),
  active: z.boolean(),
})

export type SafeUser = z.infer<typeof safeUserSchema>

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export type Login = z.infer<typeof loginSchema>

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'password must be at least 8 characters'),
})

export type ChangePassword = z.infer<typeof changePasswordSchema>

export const updateUserRoleSchema = z.object({ role: roleSchema })

export const authResponseSchema = z.object({ user: safeUserSchema })

export type AuthResponse = z.infer<typeof authResponseSchema>

export const userListSchema = z.object({ users: z.array(safeUserSchema) })

export type UserList = z.infer<typeof userListSchema>

export const revokeSessionsSchema = z.object({ revokedCount: z.number() })

export type RevokeSessions = z.infer<typeof revokeSessionsSchema>

const NAME_MAX = 120
const EMAIL_MAX = 254
const PASSWORD_MAX = 128

export const staffInputSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX, 'name is too long'),
  email: z.string().trim().toLowerCase().email().max(EMAIL_MAX, 'email is too long'),
  password: z
    .string()
    .min(8, 'password must be at least 8 characters')
    .max(PASSWORD_MAX, 'password is too long'),
  role: staffRoleSchema,
  active: z.boolean().optional().default(true),
})

export type StaffInput = z.infer<typeof staffInputSchema>

export const staffUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(NAME_MAX, 'name is too long').optional(),
    email: z.string().trim().toLowerCase().email().max(EMAIL_MAX, 'email is too long').optional(),
    role: staffRoleSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'nothing to update')

export type StaffUpdate = z.infer<typeof staffUpdateSchema>

export const staffQuerySchema = z.object({
  search: z.string().trim().max(EMAIL_MAX).optional(),
  role: staffRoleSchema.optional(),
  active: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1')),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type StaffQueryParams = z.infer<typeof staffQuerySchema>

export const staffListSchema = z.object({
  items: z.array(safeUserSchema),
  total: z.number().int(),
})

export type StaffList = z.infer<typeof staffListSchema>

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'password must be at least 8 characters')
    .max(PASSWORD_MAX, 'password is too long'),
})

export const staffScheduleSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  weekday: weekdaySchema,
  startTime: z.string().regex(TIME_HHMM_RE, 'startTime must be HH:mm'),
  endTime: z.string().regex(TIME_HHMM_RE, 'endTime must be HH:mm'),
  active: z.boolean(),
})

export type StaffSchedule = z.infer<typeof staffScheduleSchema>

export const staffScheduleListSchema = z.object({ schedules: z.array(staffScheduleSchema) })

export type StaffScheduleList = z.infer<typeof staffScheduleListSchema>

export const staffScheduleRowSchema = z.object({
  weekday: weekdaySchema,
  startTime: z.string().regex(TIME_HHMM_RE, 'startTime must be HH:mm'),
  endTime: z.string().regex(TIME_HHMM_RE, 'endTime must be HH:mm'),
  active: z.boolean().optional().default(true),
})

export type StaffScheduleRow = z.infer<typeof staffScheduleRowSchema>

export const staffScheduleInputSchema = z.object({
  schedules: z.array(staffScheduleRowSchema).max(7 * 3, 'too many schedule rows'),
})

export type StaffScheduleInput = z.infer<typeof staffScheduleInputSchema>

const ATTENDANCE_NOTES_MAX = 500

export const attendanceLogSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  staffId: z.string(),
  staffName: z.string(),
  staffRole: roleSchema,
  date: z.string(),
  checkIn: z.string().nullable(),
  checkOut: z.string().nullable(),
  workedMinutes: z.number().int().min(0).nullable(),
  notes: z.string().nullable(),
  createdByName: z.string().nullable(),
})

export type AttendanceLog = z.infer<typeof attendanceLogSchema>

export const attendanceInputSchema = z
  .object({
    staffId: z.string().min(1),
    date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'date must be a valid date'),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    notes: z.string().trim().max(ATTENDANCE_NOTES_MAX, 'notes too long').optional(),
  })
  .refine((v) => v.checkIn === undefined || !Number.isNaN(Date.parse(v.checkIn)), {
    message: 'checkIn must be a valid date-time',
    path: ['checkIn'],
  })
  .refine((v) => v.checkOut === undefined || !Number.isNaN(Date.parse(v.checkOut)), {
    message: 'checkOut must be a valid date-time',
    path: ['checkOut'],
  })

export type AttendanceInput = z.infer<typeof attendanceInputSchema>

export const attendanceUpdateSchema = z
  .object({
    checkIn: z.string().optional().nullable(),
    checkOut: z.string().optional().nullable(),
    notes: z.string().trim().max(ATTENDANCE_NOTES_MAX, 'notes too long').optional().nullable(),
  })
  .refine(
    (v) =>
      Object.keys(v).length > 0 &&
      (v.checkIn !== undefined || v.checkOut !== undefined || v.notes !== undefined),
    'nothing to update',
  )
  .refine(
    (v) => v.checkIn === undefined || v.checkIn === null || !Number.isNaN(Date.parse(v.checkIn)),
    {
      message: 'checkIn must be a valid date-time',
      path: ['checkIn'],
    },
  )
  .refine(
    (v) => v.checkOut === undefined || v.checkOut === null || !Number.isNaN(Date.parse(v.checkOut)),
    { message: 'checkOut must be a valid date-time', path: ['checkOut'] },
  )

export type AttendanceUpdate = z.infer<typeof attendanceUpdateSchema>

export const attendanceQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  staffId: z.string().optional(),
  open: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1')),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type AttendanceQueryParams = z.infer<typeof attendanceQuerySchema>

export const attendanceListSchema = z.object({
  items: z.array(attendanceLogSchema),
  total: z.number().int(),
})

export type AttendanceList = z.infer<typeof attendanceListSchema>

export const attendanceRosterSchema = z.object({
  staff: z.array(z.object({ id: z.string(), name: z.string(), role: roleSchema })),
})

export type AttendanceRoster = z.infer<typeof attendanceRosterSchema>

export const INTERN_ROTATIONS = [
  'CONSULTATION',
  'SURGERY',
  'CARE',
  'HYGIENE',
  'PROSTHETIC_ORTHO',
  'IMAGING',
] as const

export const internRotationSchema = z.enum(INTERN_ROTATIONS)

export type InternRotation = z.infer<typeof internRotationSchema>

export const INTERN_SCHOOL_MAX = 120
export const INTERN_NOTES_MAX = 500
export const INTERN_REQUIRED_HOURS_MAX = 4000

const internDateValue = (label: string) =>
  z.string().refine((s) => !Number.isNaN(Date.parse(s)), `${label} must be a valid date`)

export const internProfileSchema = z.object({
  id: z.string(),
  internId: z.string(),
  internName: z.string(),
  internEmail: z.string(),
  school: z.string(),
  requiredHours: z.number().int().min(1),
  rotation: internRotationSchema,
  mentorId: z.string().nullable(),
  mentorName: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  completedMinutes: z.number().int().min(0),
  progressPct: z.number().int().min(0),
  active: z.boolean(),
  notes: z.string().nullable(),
})

export type InternProfile = z.infer<typeof internProfileSchema>

export const internInputSchema = z.object({
  internId: z.string().min(1),
  school: z.string().trim().min(1).max(INTERN_SCHOOL_MAX, 'school too long'),
  requiredHours: z
    .number()
    .int()
    .min(1)
    .max(INTERN_REQUIRED_HOURS_MAX, 'required hours out of range'),
  rotation: internRotationSchema,
  mentorId: z.string().optional(),
  startDate: internDateValue('startDate'),
  endDate: internDateValue('endDate').optional(),
  notes: z.string().trim().max(INTERN_NOTES_MAX, 'notes too long').optional(),
})

export type InternInput = z.infer<typeof internInputSchema>

export const internUpdateSchema = z
  .object({
    school: z.string().trim().min(1).max(INTERN_SCHOOL_MAX, 'school too long').optional(),
    requiredHours: z
      .number()
      .int()
      .min(1)
      .max(INTERN_REQUIRED_HOURS_MAX, 'required hours out of range')
      .optional(),
    rotation: internRotationSchema.optional(),
    mentorId: z.string().optional().nullable(),
    startDate: internDateValue('startDate').optional(),
    endDate: internDateValue('endDate').optional().nullable(),
    active: z.boolean().optional(),
    notes: z.string().trim().max(INTERN_NOTES_MAX, 'notes too long').optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, 'nothing to update')

export type InternUpdate = z.infer<typeof internUpdateSchema>

export const internQuerySchema = z.object({
  search: z.string().optional(),
  school: z.string().optional(),
  rotation: internRotationSchema.optional(),
  active: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1')),
  mentorId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type InternQueryParams = z.infer<typeof internQuerySchema>

export const internListSchema = z.object({
  items: z.array(internProfileSchema),
  total: z.number().int(),
})

export type InternList = z.infer<typeof internListSchema>

export const internMetaSchema = z.object({
  mentors: z.array(z.object({ id: z.string(), name: z.string(), role: staffRoleSchema })),
  interns: z.array(z.object({ id: z.string(), name: z.string(), hasProfile: z.boolean() })),
})

export type InternMeta = z.infer<typeof internMetaSchema>

export const errorSchema = z.object({ error: z.string(), issues: z.unknown().optional() })

export type ApiError = z.infer<typeof errorSchema>

export const auditActionSchema = z.enum([
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LOGOUT',
  'CHANGE_PASSWORD',
  'REVOKE_ALL_SESSIONS',
  'USER_ROLE_CHANGE',
  'REVOKE_SESSIONS',
  'PATIENT_VIEW',
  'PATIENT_CREATE',
  'PATIENT_UPDATE',
  'PATIENT_ARCHIVED',
  'PATIENT_RESTORE',
  'PATIENT_MEDICAL_VIEW',
  'PATIENT_MEDICAL_UPDATE',
  'PATIENT_ODONTOGRAM_VIEW',
  'PATIENT_ODONTOGRAM_UPDATE',
  'PATIENT_DOCUMENT_CREATE',
  'PATIENT_DOCUMENT_VIEW',
  'APPOINTMENT_CREATE',
  'APPOINTMENT_UPDATE',
  'APPOINTMENT_CANCEL',
  'APPOINTMENT_RESCHEDULE',
  'APPOINTMENT_VIEW',
  'APPOINTMENT_NOSHOW',
  'WAITLIST_CREATE',
  'WAITLIST_UPDATE',
  'WAITLIST_BOOK',
  'WAITLIST_CANCEL',
  'SERVICE_CREATE',
  'SERVICE_UPDATE',
  'SERVICE_ARCHIVE',
  'SERVICE_RESTORE',
  'INVOICE_CREATE',
  'INVOICE_VOID',
  'PAYMENT_CREATE',
  'PAYMENT_REFUND',
  'EXPENSE_CREATE',
  'EXPENSE_UPDATE',
  'EXPENSE_VOID',
  'PRODUCT_CREATE',
  'PRODUCT_UPDATE',
  'PRODUCT_ARCHIVE',
  'PRODUCT_RESTORE',
  'SUPPLIER_CREATE',
  'SUPPLIER_UPDATE',
  'SUPPLIER_ARCHIVE',
  'SUPPLIER_RESTORE',
  'PURCHASE_ORDER_CREATE',
  'PURCHASE_ORDER_UPDATE',
  'PURCHASE_ORDER_RECEIVE',
  'PURCHASE_ORDER_CANCEL',
  'STOCK_OUT',
  'STOCK_ADJUST',
  'STERILIZATION_CREATE',
  'STERILIZATION_UPDATE',
  'STAFF_CREATE',
  'STAFF_UPDATE',
  'STAFF_PASSWORD_RESET',
  'SCHEDULE_UPDATE',
  'ATTENDANCE_CREATE',
  'ATTENDANCE_UPDATE',
  'INTERN_CREATE',
  'INTERN_UPDATE',
])

export type AuditAction = z.infer<typeof auditActionSchema>

export const auditTargetSchema = z.enum([
  'USER',
  'SESSION',
  'PATIENT',
  'BRANCH',
  'SYSTEM',
  'SERVICE',
  'INVOICE',
  'EXPENSE',
  'PRODUCT',
  'SUPPLIER',
  'PURCHASE_ORDER',
  'STERILIZATION',
  'SCHEDULE',
  'ATTENDANCE',
  'INTERN',
])

export type AuditTarget = z.infer<typeof auditTargetSchema>

export const auditEntrySchema = z.object({
  id: z.string(),
  action: auditActionSchema,
  targetType: auditTargetSchema,
  targetId: z.string().nullable(),
  actorId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  metadata: z.unknown().nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
})

export type AuditEntry = z.infer<typeof auditEntrySchema>

export const auditListSchema = z.object({
  entries: z.array(auditEntrySchema),
  total: z.number(),
})

export type AuditList = z.infer<typeof auditListSchema>

export const auditQuerySchema = z.object({
  action: auditActionSchema.optional(),
  targetType: auditTargetSchema.optional(),
  actorEmail: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type AuditQuery = z.infer<typeof auditQuerySchema>

export const genderSchema = z.enum(['M', 'F', 'UNSPECIFIED'])

export type Gender = z.infer<typeof genderSchema>

export const patientInputSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  gender: genderSchema.optional(),
  birthDate: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'birthDate must be a valid date')
    .optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  address: z.string().trim().max(200).optional(),
  notes: z.string().max(4000).optional(),
})

export type PatientInput = z.infer<typeof patientInputSchema>

export const patientUpdateSchema = patientInputSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'at least one field to update')

export type PatientUpdate = z.infer<typeof patientUpdateSchema>

export const patientSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  gender: genderSchema.nullable(),
  birthDate: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Patient = z.infer<typeof patientSchema>

export const patientDetailSchema = patientSchema.extend({
  notes: z.string().nullable(),
  noShowCount: z.number().int().min(0),
  noShowRate: z.number().min(0).max(1),
})

export type PatientDetail = z.infer<typeof patientDetailSchema>

export const patientListSchema = z.object({
  patients: z.array(patientSchema),
  total: z.number(),
})

export type PatientList = z.infer<typeof patientListSchema>

export const patientQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  archived: z.enum(['exclude', 'include', 'only']).default('exclude'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type PatientQuery = z.infer<typeof patientQuerySchema>

export type PatientQueryParams = z.input<typeof patientQuerySchema>

export const versionConflictSchema = z.object({
  error: z.literal('VERSION_CONFLICT'),
  version: z.number().int().min(0),
})

export type VersionConflict = z.infer<typeof versionConflictSchema>

const MAX_FREE_TEXT = 4000

export const medicalHistorySchema = z
  .object({
    allergies: z.string().max(MAX_FREE_TEXT).optional(),
    conditions: z.string().max(MAX_FREE_TEXT).optional(),
    medications: z.string().max(MAX_FREE_TEXT).optional(),
    surgeryHistory: z.string().max(MAX_FREE_TEXT).optional(),
    familyHistory: z.string().max(MAX_FREE_TEXT).optional(),
    lifestyle: z.string().max(MAX_FREE_TEXT).optional(),
    otherNotes: z.string().max(MAX_FREE_TEXT).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'medical history must not be empty')

export type MedicalHistory = z.infer<typeof medicalHistorySchema>

export const medicalHistoryWriteSchema = z.object({
  version: z.number().int().min(0),
  data: medicalHistorySchema,
})

export type MedicalHistoryWrite = z.infer<typeof medicalHistoryWriteSchema>

export const medicalHistoryResponseSchema = z.object({
  version: z.number().int().min(0),
  data: medicalHistorySchema.nullable(),
  updatedAt: z.string().nullable(),
})

export type MedicalHistoryResponse = z.infer<typeof medicalHistoryResponseSchema>

export const toothSurfaceSchema = z.enum(['m', 'd', 'o', 'b', 'l'])

export type ToothSurface = z.infer<typeof toothSurfaceSchema>

export const toothConditionSchema = z.enum([
  'caries',
  'filling',
  'sealant',
  'fracture',
  'wear',
  'stain',
])

export type ToothCondition = z.infer<typeof toothConditionSchema>

export const toothStatusSchema = z.enum(['present', 'missing', 'implant', 'crown', 'root'])

export type ToothStatus = z.infer<typeof toothStatusSchema>

export const toothSurfacesSchema = z.object({
  m: z.array(toothConditionSchema),
  d: z.array(toothConditionSchema),
  o: z.array(toothConditionSchema),
  b: z.array(toothConditionSchema),
  l: z.array(toothConditionSchema),
})

export type ToothSurfaces = z.infer<typeof toothSurfacesSchema>

export const toothEntrySchema = z.object({
  status: toothStatusSchema,
  surfaces: toothSurfacesSchema,
})

export type ToothEntry = z.infer<typeof toothEntrySchema>

export const odontogramSchema = z
  .object({
    teeth: z.record(z.string(), toothEntrySchema),
  })
  .refine((v) => Object.keys(v.teeth).length > 0, 'odontogram must have at least one tooth')
  .refine(
    (v) => Object.keys(v.teeth).every((k) => /^[1-4][1-8]$/.test(k)),
    'teeth keys must be valid FDI permanent tooth codes',
  )

export type Odontogram = z.infer<typeof odontogramSchema>

export const odontogramWriteSchema = z.object({
  version: z.number().int().min(0),
  data: odontogramSchema,
})

export type OdontogramWrite = z.infer<typeof odontogramWriteSchema>

export const odontogramResponseSchema = z.object({
  version: z.number().int().min(0),
  data: odontogramSchema.nullable(),
  updatedAt: z.string().nullable(),
})

export type OdontogramResponse = z.infer<typeof odontogramResponseSchema>

export const FILE_NAME_MAX = 255

export const patientDocumentSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  originalName: z.string().max(FILE_NAME_MAX),
  mimeType: z.string().max(200),
  size: z.number().int().min(0),
  createdAt: z.string(),
})

export type PatientDocument = z.infer<typeof patientDocumentSchema>

export const patientDocumentListSchema = z.object({
  documents: z.array(patientDocumentSchema),
  total: z.number().int().min(0),
})

export type PatientDocumentList = z.infer<typeof patientDocumentListSchema>

export const patientDocumentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})

export type PatientDocumentQuery = z.infer<typeof patientDocumentQuerySchema>

export const appointmentStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NOSHOW',
])

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>

export const APPOINTMENT_STATUSES = appointmentStatusSchema.options

// statuses that permanently release their time-slot and never participate in
// double-booking conflict checks
export const APPOINTMENT_TERMINAL_STATUSES: readonly AppointmentStatus[] = ['CANCELLED', 'NOSHOW']

const APPOINTMENT_NOTES_MAX = 4000

export const appointmentInputSchema = z
  .object({
    patientId: z.string().min(1),
    dentistId: z.string().min(1).nullable().optional(),
    startAt: z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), 'startAt must be a valid date-time'),
    endAt: z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), 'endAt must be a valid date-time'),
    status: appointmentStatusSchema.optional(),
    notes: z.string().max(APPOINTMENT_NOTES_MAX).optional(),
  })
  .refine((v) => Date.parse(v.endAt) > Date.parse(v.startAt), 'endAt must be after startAt')

export type AppointmentInput = z.infer<typeof appointmentInputSchema>

export const appointmentUpdateSchema = z
  .object({
    patientId: z.string().min(1).optional(),
    dentistId: z.string().min(1).nullable().optional(),
    startAt: z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), 'startAt must be a valid date-time')
      .optional(),
    endAt: z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), 'endAt must be a valid date-time')
      .optional(),
    status: appointmentStatusSchema.optional(),
    notes: z.string().max(APPOINTMENT_NOTES_MAX).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'at least one field to update')
  .refine(
    (v) => !v.startAt || !v.endAt || Date.parse(v.endAt) > Date.parse(v.startAt),
    'endAt must be after startAt',
  )

export type AppointmentUpdate = z.infer<typeof appointmentUpdateSchema>

export const appointmentSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  dentistId: z.string().nullable(),
  dentistName: z.string().nullable(),
  startAt: z.string(),
  endAt: z.string(),
  status: appointmentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Appointment = z.infer<typeof appointmentSchema>

export const appointmentDetailSchema = appointmentSchema.extend({
  notes: z.string().nullable(),
})

export type AppointmentDetail = z.infer<typeof appointmentDetailSchema>

export const appointmentListSchema = z.object({
  items: z.array(appointmentSchema),
})

export type AppointmentList = z.infer<typeof appointmentListSchema>

export const appointmentQuerySchema = z.object({
  start: z
    .string()
    .trim()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'start must be a valid date-time'),
  end: z
    .string()
    .trim()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'end must be a valid date-time'),
  status: appointmentStatusSchema.optional(),
  dentistId: z.string().optional(),
  patientId: z.string().optional(),
})

export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>

export type AppointmentQueryParams = z.input<typeof appointmentQuerySchema>

export const appointmentConflictSchema = z.object({
  error: z.literal('CONFLICT'),
  overlaps: z.array(
    z.object({
      id: z.string(),
      startAt: z.string(),
      endAt: z.string(),
      kind: z.enum(['dentist', 'patient']),
      patientName: z.string(),
    }),
  ),
})

export type AppointmentConflict = z.infer<typeof appointmentConflictSchema>

export const waitlistStatusSchema = z.enum([
  'PENDING',
  'CONTACTED',
  'BOOKED',
  'CANCELLED',
  'EXPIRED',
])

export type WaitlistStatus = z.infer<typeof waitlistStatusSchema>

export const WAITLIST_STATUSES = waitlistStatusSchema.options

export const waitlistActiveStatuses: readonly WaitlistStatus[] = ['PENDING', 'CONTACTED']

export const waitlistTerminalStatuses: readonly WaitlistStatus[] = [
  'BOOKED',
  'CANCELLED',
  'EXPIRED',
]

export const waitlistInputSchema = z.object({
  patientId: z.string().min(1),
  dentistId: z.string().min(1).nullable().optional(),
  preferredDate: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'preferredDate must be a valid date-time')
    .optional()
    .nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export type WaitlistInput = z.infer<typeof waitlistInputSchema>

export const waitlistUpdateSchema = z
  .object({
    dentistId: z.string().min(1).nullable().optional(),
    preferredDate: z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), 'preferredDate must be a valid date-time')
      .optional()
      .nullable(),
    notes: z.string().max(1000).optional().nullable(),
    status: waitlistStatusSchema.optional(),
    appointmentId: z.string().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'at least one field to update')

export type WaitlistUpdate = z.infer<typeof waitlistUpdateSchema>

export const waitlistSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  dentistId: z.string().nullable(),
  dentistName: z.string().nullable(),
  preferredDate: z.string().nullable(),
  status: waitlistStatusSchema,
  appointmentId: z.string().nullable(),
  source: z.enum(['staff', 'web']),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type WaitlistEntry = z.infer<typeof waitlistSchema>

export const waitlistDetailSchema = waitlistSchema.extend({
  notes: z.string().nullable(),
})

export type WaitlistEntryDetail = z.infer<typeof waitlistDetailSchema>

export const waitlistListSchema = z.object({
  items: z.array(waitlistSchema),
  total: z.number(),
})

export type WaitlistList = z.infer<typeof waitlistListSchema>

export const waitlistQuerySchema = z.object({
  status: waitlistStatusSchema.optional(),
  dentistId: z.string().optional(),
  patientId: z.string().optional(),
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type WaitlistQuery = z.infer<typeof waitlistQuerySchema>

export type WaitlistQueryParams = z.input<typeof waitlistQuerySchema>

export const waitlistDuplicateErrorSchema = z.object({
  error: z.literal('WAITLIST_ALREADY_ACTIVE'),
  duplicateId: z.string(),
})

export type WaitlistDuplicateError = z.infer<typeof waitlistDuplicateErrorSchema>

export const staffDentistSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
})

export type StaffDentist = z.infer<typeof staffDentistSchema>

export const staffDentistListSchema = z.object({
  dentists: z.array(staffDentistSchema),
})

export type StaffDentistList = z.infer<typeof staffDentistListSchema>

export const appointmentStatusCountsSchema = z.object({
  PENDING: z.number().int().min(0),
  CONFIRMED: z.number().int().min(0),
  COMPLETED: z.number().int().min(0),
  CANCELLED: z.number().int().min(0),
  NOSHOW: z.number().int().min(0),
})

export type AppointmentStatusCounts = z.infer<typeof appointmentStatusCountsSchema>

export const dashboardUpcomingVisitSchema = z.object({
  id: z.string(),
  patientName: z.string(),
  dentistName: z.string().nullable(),
  startAt: z.string(),
  endAt: z.string(),
  status: appointmentStatusSchema,
})

export type DashboardUpcomingVisit = z.infer<typeof dashboardUpcomingVisitSchema>

export const dashboardVisitsSchema = z.object({
  today: z.object({
    total: z.number().int().min(0),
    byStatus: appointmentStatusCountsSchema,
  }),
  upcoming: z.array(dashboardUpcomingVisitSchema),
})

export type DashboardVisits = z.infer<typeof dashboardVisitsSchema>

export const dashboardNoShowSchema = z.object({
  today: z.number().int().min(0),
  rate30d: z.number().min(0).max(1),
})

export type DashboardNoShow = z.infer<typeof dashboardNoShowSchema>

export const dashboardWaitlistSchema = z.object({
  active: z.number().int().min(0),
})

export type DashboardWaitlist = z.infer<typeof dashboardWaitlistSchema>

export const dashboardPatientsSchema = z.object({
  total: z.number().int().min(0),
  new30d: z.number().int().min(0),
})

export type DashboardPatients = z.infer<typeof dashboardPatientsSchema>

export const dashboardKpisSchema = z.object({
  visits: dashboardVisitsSchema,
  noShow: dashboardNoShowSchema,
  waitlist: dashboardWaitlistSchema,
  patients: dashboardPatientsSchema,
})

export type DashboardKpis = z.infer<typeof dashboardKpisSchema>

export const dashboardKpisQuerySchema = z.object({
  from: z
    .string()
    .trim()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'from must be a valid date-time')
    .optional(),
  to: z
    .string()
    .trim()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'to must be a valid date-time')
    .optional(),
  windowStart: z
    .string()
    .trim()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'windowStart must be a valid date-time')
    .optional(),
})

export type DashboardKpisQuery = z.infer<typeof dashboardKpisQuerySchema>

export type DashboardKpisQueryParams = z.input<typeof dashboardKpisQuerySchema>

const PUBLIC_MESSAGE_MAX = 1000

export const publicBookingSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(20)
    .regex(/^\+?[0-9\s-]+$/, 'phone must contain only digits'),
  service: z.string().trim().max(120).optional(),
  preferredDate: z
    .string()
    .trim()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'preferredDate must be a valid date')
    .optional(),
  message: z.string().trim().max(PUBLIC_MESSAGE_MAX).optional(),
})

export type PublicBooking = z.infer<typeof publicBookingSchema>

export const publicBookingResponseSchema = z.object({
  waitlistEntryId: z.string(),
})

export type PublicBookingResponse = z.infer<typeof publicBookingResponseSchema>

export const serviceCategorySchema = z.enum([
  'CONSULTATION',
  'SURGERY',
  'CARE',
  'HYGIENE',
  'PROSTHETIC_ORTHO',
  'IMAGING',
])

export type ServiceCategory = z.infer<typeof serviceCategorySchema>

export const SERVICE_CATEGORIES = serviceCategorySchema.options

export const serviceSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  name: z.string(),
  category: serviceCategorySchema,
  priceDZD: z.number().int().min(0),
  durationMinutes: z.number().int().min(1),
  reimbursablePct: z.number().int().min(0).max(100),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Service = z.infer<typeof serviceSchema>

export const serviceInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: serviceCategorySchema,
  priceDZD: z.number().int().min(0).max(100_000_000),
  durationMinutes: z.number().int().min(1).max(14_400),
  reimbursablePct: z.number().int().min(0).max(100).default(0),
})

export type ServiceInput = z.infer<typeof serviceInputSchema>

export const serviceUpdateSchema = serviceInputSchema.partial()

export type ServiceUpdate = z.infer<typeof serviceUpdateSchema>

export const serviceListResponseSchema = z.object({
  items: z.array(serviceSchema),
  total: z.number().int().nonnegative(),
})

export type ServiceList = z.infer<typeof serviceListResponseSchema>

export const serviceQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: serviceCategorySchema.optional(),
  archived: z.enum(['exclude', 'only']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ServiceQuery = z.infer<typeof serviceQuerySchema>

export type ServiceQueryParams = z.input<typeof serviceQuerySchema>

export const invoiceStatusSchema = z.enum(['UNPAID', 'PARTIAL', 'PAID', 'VOID'])

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>

export const INVOICE_STATUSES = invoiceStatusSchema.options

export const invoiceLineSchema = z.object({
  id: z.string(),
  serviceId: z.string().nullable(),
  serviceName: z.string(),
  priceDZD: z.number().int().min(0),
  quantity: z.number().int().min(1),
})

export type InvoiceLine = z.infer<typeof invoiceLineSchema>

export const invoiceSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  invoiceNumber: z.number().int().positive(),
  issuedAt: z.string(),
  voidedAt: z.string().nullable(),
  status: invoiceStatusSchema,
  subtotalDZD: z.number().int().min(0),
  totalDZD: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Invoice = z.infer<typeof invoiceSchema>

export const paymentMethodSchema = z.enum(['CASH', 'CHEQUE', 'CARD', 'TRANSFER'])

export type PaymentMethod = z.infer<typeof paymentMethodSchema>

export const PAYMENT_METHODS = paymentMethodSchema.options

export const paymentKindSchema = z.enum(['RECEIPT', 'REFUND'])

export type PaymentKind = z.infer<typeof paymentKindSchema>

export const paymentSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  kind: paymentKindSchema,
  method: paymentMethodSchema,
  amountDZD: z.number().int().positive(),
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  receivedAt: z.string(),
  refundsId: z.string().nullable(),
  createdAt: z.string(),
  createdById: z.string().nullable(),
})

export type Payment = z.infer<typeof paymentSchema>

export const invoiceDetailSchema = invoiceSchema.extend({
  lines: z.array(invoiceLineSchema),
  paidDZD: z.number().int().min(0),
  balanceDZD: z.number().int().min(0),
  payments: z.array(paymentSchema),
})

export type InvoiceDetail = z.infer<typeof invoiceDetailSchema>

export const invoiceListSchema = z.object({
  items: z.array(invoiceSchema),
  total: z.number().int().nonnegative(),
})

export type InvoiceList = z.infer<typeof invoiceListSchema>

export const invoiceQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: invoiceStatusSchema.optional(),
  patientId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>

export type InvoiceQueryParams = z.input<typeof invoiceQuerySchema>

export const MAX_INVOICE_LINES = 50

export const invoiceLineInputSchema = z.object({
  serviceId: z.string().optional(),
  serviceName: z.string().trim().min(1).max(120),
  priceDZD: z.number().int().min(0).max(100_000_000),
  quantity: z.number().int().min(1).max(999),
})

export type InvoiceLineInput = z.infer<typeof invoiceLineInputSchema>

export const invoiceCreateSchema = z.object({
  patientId: z.string().min(1),
  lines: z.array(invoiceLineInputSchema).min(1).max(MAX_INVOICE_LINES),
})

export type InvoiceCreate = z.infer<typeof invoiceCreateSchema>

export const paymentListSchema = z.object({
  items: z.array(paymentSchema),
  total: z.number().int().nonnegative(),
})

export type PaymentList = z.infer<typeof paymentListSchema>

export const paymentQuerySchema = z.object({
  invoiceId: z.string().optional(),
  invoiceNumber: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type PaymentQuery = z.infer<typeof paymentQuerySchema>

export type PaymentQueryParams = z.input<typeof paymentQuerySchema>

export const MAX_PAYMENT_AMOUNT_DZD = 100_000_000

export const paymentCreateSchema = z.object({
  invoiceId: z.string().min(1),
  method: paymentMethodSchema,
  amountDZD: z.number().int().min(1).max(MAX_PAYMENT_AMOUNT_DZD),
  reference: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(300).optional(),
  receivedAt: z.string().datetime().optional(),
})

export type PaymentCreate = z.infer<typeof paymentCreateSchema>

export const refundCreateSchema = z.object({
  amountDZD: z.number().int().min(1).max(MAX_PAYMENT_AMOUNT_DZD),
  notes: z.string().trim().max(300).optional(),
  receivedAt: z.string().datetime().optional(),
})

export type RefundCreate = z.infer<typeof refundCreateSchema>

export const expenseCategorySchema = z.enum([
  'SALARY',
  'RENT',
  'SUPPLIES',
  'EQUIPMENT',
  'UTILITIES',
  'MAINTENANCE',
  'MARKETING',
  'TAXES',
  'OTHER',
])

export type ExpenseCategory = z.infer<typeof expenseCategorySchema>

export const EXPENSE_CATEGORIES = expenseCategorySchema.options

export const MAX_EXPENSE_AMOUNT_DZD = 100_000_000

export const expenseSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  category: expenseCategorySchema,
  amountDZD: z.number().int().positive(),
  description: z.string(),
  incurredAt: z.string(),
  voidedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdById: z.string().nullable(),
})

export type Expense = z.infer<typeof expenseSchema>

export const expenseInputSchema = z.object({
  category: expenseCategorySchema,
  amountDZD: z.number().int().min(1).max(MAX_EXPENSE_AMOUNT_DZD),
  description: z.string().trim().min(1).max(300),
  incurredAt: z.string().datetime().optional(),
})

export type ExpenseInput = z.infer<typeof expenseInputSchema>

export const expenseUpdateSchema = z
  .object({
    category: expenseCategorySchema.optional(),
    amountDZD: z.number().int().min(1).max(MAX_EXPENSE_AMOUNT_DZD).optional(),
    description: z.string().trim().min(1).max(300).optional(),
    incurredAt: z.string().datetime().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'at least one field' })

export type ExpenseUpdate = z.infer<typeof expenseUpdateSchema>

export const expenseListSchema = z.object({
  items: z.array(expenseSchema),
  total: z.number().int().nonnegative(),
})

export type ExpenseList = z.infer<typeof expenseListSchema>

export const expenseQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: expenseCategorySchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  voided: z.enum(['exclude', 'only']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ExpenseQuery = z.infer<typeof expenseQuerySchema>

export type ExpenseQueryParams = z.input<typeof expenseQuerySchema>

// ---- Finance report (2.5, ADR 021) ----

// Net per payment method; refunds reduce each method's net within the window.
export const financeByMethodSchema = z.object({
  CASH: z.number().int().nonnegative(),
  CHEQUE: z.number().int().nonnegative(),
  CARD: z.number().int().nonnegative(),
  TRANSFER: z.number().int().nonnegative(),
})

export type FinanceByMethod = z.infer<typeof financeByMethodSchema>

// One row per fixed category (ADR 020), all nine keys always present.
export const financeExpensesSchema = z.object({
  totalDZD: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  byCategory: z.record(expenseCategorySchema, z.number().int().nonnegative()),
})

export type FinanceExpenses = z.infer<typeof financeExpensesSchema>

export const financeDaySchema = z.object({
  start: z.string(),
  receiptsDZD: z.number().int().nonnegative(),
  refundsDZD: z.number().int().nonnegative(),
  revenueDZD: z.number().int(),
  expensesDZD: z.number().int().nonnegative(),
  netDZD: z.number().int(),
})

export type FinanceDay = z.infer<typeof financeDaySchema>

export const financeReportSchema = z.object({
  from: z.string(),
  to: z.string(),
  revenue: z.object({
    receiptsDZD: z.number().int().nonnegative(),
    refundsDZD: z.number().int().nonnegative(),
    netDZD: z.number().int().nonnegative(),
    byMethod: financeByMethodSchema,
  }),
  expenses: financeExpensesSchema,
  netDZD: z.number().int(),
  days: z.array(financeDaySchema),
})

export type FinanceReport = z.infer<typeof financeReportSchema>

// from/to are absolute-instant ISO strings; default = server-local today (ADR 021).
export const financeReportQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export type FinanceReportQuery = z.infer<typeof financeReportQuerySchema>

export type FinanceReportQueryParams = z.input<typeof financeReportQuerySchema>

// ---- Products (3.1, ADR 022) ----

export const productCategorySchema = z.enum([
  'ANESTHETICS',
  'DISPOSABLES',
  'MATERIALS',
  'INSTRUMENTS',
  'EQUIPMENT',
  'MEDICATIONS',
  'LABORATORY',
  'STATIONERY',
  'OTHER',
])

export type ProductCategory = z.infer<typeof productCategorySchema>

export const PRODUCT_CATEGORIES = productCategorySchema.options

export const productUnitSchema = z.enum([
  'UNIT',
  'BOX',
  'PACK',
  'BOTTLE',
  'JAR',
  'SYRINGE',
  'SET',
  'KIT',
])

export type ProductUnit = z.infer<typeof productUnitSchema>

export const PRODUCT_UNITS = productUnitSchema.options

export const MAX_PRODUCT_QUANTITY = 1_000_000
export const MAX_PRODUCT_REORDER_LEVEL = 100_000

export const MAX_STOCK_REASON = 500
export const MAX_STOCK_BATCH = 60

export const productSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  category: productCategorySchema,
  unit: productUnitSchema,
  reorderLevel: z.number().int().nonnegative(),
  quantityOnHand: z.number().int().nonnegative(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdById: z.string().nullable(),
})

export type Product = z.infer<typeof productSchema>

export const productInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(40).optional(),
  category: productCategorySchema,
  unit: productUnitSchema,
  reorderLevel: z.number().int().min(0).max(MAX_PRODUCT_REORDER_LEVEL).default(0),
  quantityOnHand: z.number().int().min(0).max(MAX_PRODUCT_QUANTITY).default(0),
})

export type ProductInput = z.infer<typeof productInputSchema>

export const productUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    code: z.string().trim().max(40).optional(),
    category: productCategorySchema.optional(),
    unit: productUnitSchema.optional(),
    reorderLevel: z.number().int().min(0).max(MAX_PRODUCT_REORDER_LEVEL).optional(),
    quantityOnHand: z.number().int().min(0).max(MAX_PRODUCT_QUANTITY).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'at least one field' })

export type ProductUpdate = z.infer<typeof productUpdateSchema>

export const productListSchema = z.object({
  items: z.array(productSchema),
  total: z.number().int().nonnegative(),
})

export type ProductList = z.infer<typeof productListSchema>

export const productQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: productCategorySchema.optional(),
  archived: z.enum(['exclude', 'only']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ProductQuery = z.infer<typeof productQuerySchema>

export type ProductQueryParams = z.input<typeof productQuerySchema>

// ---- Suppliers (3.2, ADR 023) ----

export const supplierSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdById: z.string().nullable(),
})

export type Supplier = z.infer<typeof supplierSchema>

export const supplierInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(254).optional(),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
})

export type SupplierInput = z.infer<typeof supplierInputSchema>

export const supplierUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().email().max(254).optional(),
    address: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'at least one field' })

export type SupplierUpdate = z.infer<typeof supplierUpdateSchema>

export const supplierListSchema = z.object({
  items: z.array(supplierSchema),
  total: z.number().int().nonnegative(),
})

export type SupplierList = z.infer<typeof supplierListSchema>

export const supplierQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  archived: z.enum(['exclude', 'only']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type SupplierQuery = z.infer<typeof supplierQuerySchema>

export type SupplierQueryParams = z.input<typeof supplierQuerySchema>

// ---- Purchase orders (3.2, ADR 023) ----

export const purchaseOrderStatusSchema = z.enum([
  'DRAFT',
  'ORDERED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
])

export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>

export const PURCHASE_ORDER_STATUSES = purchaseOrderStatusSchema.options

export const MAX_PURCHASE_ORDER_LINES = 50
export const MAX_PURCHASE_ORDER_QUANTITY = 1_000_000
export const MAX_PURCHASE_ORDER_UNIT_PRICE_DZD = 100_000_000

export const purchaseOrderLineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  unit: productUnitSchema,
  unitPriceDZD: z.number().int().nonnegative(),
  quantity: z.number().int().min(1).max(MAX_PURCHASE_ORDER_QUANTITY),
  receivedQuantity: z.number().int().min(0).max(MAX_PURCHASE_ORDER_QUANTITY),
  lineTotalDZD: z.number().int().nonnegative(),
})

export type PurchaseOrderLine = z.infer<typeof purchaseOrderLineSchema>

export const purchaseOrderCreateLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_PURCHASE_ORDER_QUANTITY),
  unitPriceDZD: z.number().int().min(0).max(MAX_PURCHASE_ORDER_UNIT_PRICE_DZD),
})

export type PurchaseOrderCreateLine = z.infer<typeof purchaseOrderCreateLineSchema>

export const purchaseOrderSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  supplierId: z.string().nullable(),
  supplierName: z.string().nullable(),
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  status: purchaseOrderStatusSchema,
  orderedAt: z.string(),
  receivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdById: z.string().nullable(),
  totalDZD: z.number().int().nonnegative(),
  lineCount: z.number().int().nonnegative(),
})

export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>

export const purchaseOrderDetailSchema = purchaseOrderSchema.extend({
  lines: z.array(purchaseOrderLineSchema),
})

export type PurchaseOrderDetail = z.infer<typeof purchaseOrderDetailSchema>

export const purchaseOrderCreateSchema = z.object({
  supplierId: z.string().min(1).optional(),
  reference: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(1000).optional(),
  orderedAt: z.string().datetime().optional(),
  lines: z.array(purchaseOrderCreateLineSchema).min(1).max(MAX_PURCHASE_ORDER_LINES),
})

export type PurchaseOrderCreate = z.infer<typeof purchaseOrderCreateSchema>

export const purchaseOrderUpdateSchema = z
  .object({
    supplierId: z.string().min(1).nullable().optional(),
    reference: z.string().trim().max(60).optional(),
    notes: z.string().trim().max(1000).optional(),
    orderedAt: z.string().datetime().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'at least one field' })

export type PurchaseOrderUpdate = z.infer<typeof purchaseOrderUpdateSchema>

export const purchaseOrderReceiveLineSchema = z.object({
  purchaseOrderLineId: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_PURCHASE_ORDER_QUANTITY),
  // Optional lot capture for the stock ledger (3.3, ADR 024): a receipt can tag the
  // incoming units with a batch number + expiry date.
  batch: z.string().trim().max(MAX_STOCK_BATCH).optional(),
  expiryDate: z.string().datetime().optional(),
})

export const purchaseOrderReceiveSchema = z.object({
  lines: z.array(purchaseOrderReceiveLineSchema).min(1).max(MAX_PURCHASE_ORDER_LINES),
})

export type PurchaseOrderReceive = z.infer<typeof purchaseOrderReceiveSchema>

export const purchaseOrderListSchema = z.object({
  items: z.array(purchaseOrderSchema),
  total: z.number().int().nonnegative(),
})

export type PurchaseOrderList = z.infer<typeof purchaseOrderListSchema>

export const purchaseOrderQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: purchaseOrderStatusSchema.optional(),
  supplierId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type PurchaseOrderQuery = z.infer<typeof purchaseOrderQuerySchema>

export type PurchaseOrderQueryParams = z.input<typeof purchaseOrderQuerySchema>

// ---- Stock ledger (3.3, ADR 024) ----

export const stockLedgerTypeSchema = z.enum(['OPENING', 'IN', 'OUT', 'ADJUST'])

export type StockLedgerType = z.infer<typeof stockLedgerTypeSchema>

export const STOCK_LEDGER_TYPES = stockLedgerTypeSchema.options

// One append-only movement row (ADR 024). For ledger display the API joins
// product name + unit so the UI never needs to re-resolve the catalog.
export const stockEntrySchema = z.object({
  id: z.string(),
  branchId: z.string(),
  productId: z.string(),
  productName: z.string(),
  unit: productUnitSchema,
  type: stockLedgerTypeSchema,
  quantity: z.number().int(),
  unitCostDZD: z.number().int().nonnegative().nullable(),
  batch: z.string().max(MAX_STOCK_BATCH).nullable(),
  expiryDate: z.string().nullable(),
  reason: z.string().max(MAX_STOCK_REASON).nullable(),
  purchaseOrderId: z.string().nullable(),
  appointmentId: z.string().nullable(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
})

export type StockEntry = z.infer<typeof stockEntrySchema>

export const stockOutInputSchema = z.object({
  quantity: z.number().int().min(1).max(MAX_PRODUCT_QUANTITY),
  reason: z.string().trim().min(1).max(MAX_STOCK_REASON),
  occurredAt: z.string().datetime().optional(),
})

export type StockOutInput = z.infer<typeof stockOutInputSchema>

export const stockAdjustInputSchema = z.object({
  quantity: z
    .number()
    .int()
    .refine((n) => n !== 0 && Math.abs(n) <= MAX_PRODUCT_QUANTITY),
  reason: z.string().trim().min(1).max(MAX_STOCK_REASON),
  batch: z.string().trim().max(MAX_STOCK_BATCH).optional(),
  expiryDate: z.string().datetime().optional(),
  occurredAt: z.string().datetime().optional(),
})

export type StockAdjustInput = z.infer<typeof stockAdjustInputSchema>

export const stockListSchema = z.object({
  items: z.array(stockEntrySchema),
  total: z.number().int().nonnegative(),
})

export type StockList = z.infer<typeof stockListSchema>

export const stockQuerySchema = z.object({
  productId: z.string().optional(),
  type: stockLedgerTypeSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type StockQuery = z.infer<typeof stockQuerySchema>

export type StockQueryParams = z.input<typeof stockQuerySchema>

// ---- Stock alerts (3.4, ADR 025) ----

export const ALERT_HORIZON_MAX = 365

export const stockAlertQuerySchema = z.object({
  horizonDays: z.coerce.number().int().min(1).max(ALERT_HORIZON_MAX).default(30),
})

export type StockAlertQuery = z.infer<typeof stockAlertQuerySchema>

export type StockAlertQueryParams = z.input<typeof stockAlertQuerySchema>

export const lowStockAlertSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  unit: productUnitSchema,
  category: productCategorySchema,
  quantityOnHand: z.number().int().nonnegative(),
  reorderLevel: z.number().int().nonnegative(),
})

export type LowStockAlert = z.infer<typeof lowStockAlertSchema>

export const expiringLotAlertSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  unit: productUnitSchema,
  batch: z.string().min(1),
  expiryDate: z.string(),
  remaining: z.number().int().positive(),
  expired: z.boolean(),
})

export type ExpiringLotAlert = z.infer<typeof expiringLotAlertSchema>

export const stockAlertsSchema = z.object({
  lowStock: z.array(lowStockAlertSchema),
  expiring: z.array(expiringLotAlertSchema),
  generatedAt: z.string(),
})

export type StockAlerts = z.infer<typeof stockAlertsSchema>

// ---- Treatment stock consumption (3.6, ADR 026) ----

// One clinical usage of a catalog product during an appointment. The API joins
// product + patient names so the UI never has to re-resolve the catalog.
export const treatmentConsumptionSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  appointmentId: z.string(),
  productId: z.string(),
  productName: z.string(),
  unit: productUnitSchema,
  patientName: z.string(),
  quantity: z.number().int().min(1).max(MAX_PRODUCT_QUANTITY),
  batch: z.string().max(MAX_STOCK_BATCH).nullable(),
  reason: z.string().max(MAX_STOCK_REASON).nullable(),
  consumedAt: z.string(),
  createdByName: z.string().nullable(),
})

export type TreatmentConsumption = z.infer<typeof treatmentConsumptionSchema>

export const treatmentConsumptionInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_PRODUCT_QUANTITY),
  batch: z.string().trim().max(MAX_STOCK_BATCH).optional(),
  reason: z.string().trim().max(MAX_STOCK_REASON).optional(),
})

export type TreatmentConsumptionInput = z.infer<typeof treatmentConsumptionInputSchema>

export const treatmentConsumptionListSchema = z.object({
  items: z.array(treatmentConsumptionSchema),
  total: z.number().int().nonnegative(),
})

export type TreatmentConsumptionList = z.infer<typeof treatmentConsumptionListSchema>

export const treatmentConsumptionQuerySchema = z.object({
  appointmentId: z.string().optional(),
  productId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type TreatmentConsumptionQuery = z.infer<typeof treatmentConsumptionQuerySchema>

export type TreatmentConsumptionQueryParams = z.input<typeof treatmentConsumptionQuerySchema>

// ---- Sterilization logs (3.6, ADR 026) ----

export const sterilizationMethodSchema = z.enum(['AUTOCLAVE', 'CHEMICAL', 'UV', 'OTHER'])

export type SterilizationMethod = z.infer<typeof sterilizationMethodSchema>

export const STERILIZATION_METHODS = sterilizationMethodSchema.options

export const sterilizationStatusSchema = z.enum(['IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'])

export type SterilizationStatus = z.infer<typeof sterilizationStatusSchema>

export const STERILIZATION_STATUSES = sterilizationStatusSchema.options

export const sterilizationLogSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  productId: z.string().nullable(),
  instrument: z.string().min(1).max(120),
  method: sterilizationMethodSchema,
  cycle: z.number().int().min(1).max(9999).nullable(),
  status: sterilizationStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  operatorName: z.string().nullable(),
  notes: z.string().max(500).nullable(),
  createdByName: z.string().nullable(),
  createdAt: z.string(),
})

export type SterilizationLog = z.infer<typeof sterilizationLogSchema>

export const sterilizationInputSchema = z.object({
  productId: z.string().min(1).optional(),
  instrument: z.string().trim().min(1).max(120),
  method: sterilizationMethodSchema,
  cycle: z.number().int().min(1).max(9999).optional(),
  startedAt: z.string().datetime().optional(),
  operatorId: z.string().min(1).optional(),
  notes: z.string().trim().max(500).optional(),
})

export type SterilizationInput = z.infer<typeof sterilizationInputSchema>

export const sterilizationUpdateSchema = z
  .object({
    status: sterilizationStatusSchema.optional(),
    notes: z.string().trim().max(500).optional(),
    method: sterilizationMethodSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'at least one field required')

export type SterilizationUpdate = z.infer<typeof sterilizationUpdateSchema>

export const sterilizationListSchema = z.object({
  items: z.array(sterilizationLogSchema),
  total: z.number().int().nonnegative(),
})

export type SterilizationList = z.infer<typeof sterilizationListSchema>

export const sterilizationQuerySchema = z.object({
  status: sterilizationStatusSchema.optional(),
  productId: z.string().optional(),
  operatorId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type SterilizationQuery = z.infer<typeof sterilizationQuerySchema>

export type SterilizationQueryParams = z.input<typeof sterilizationQuerySchema>
