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
