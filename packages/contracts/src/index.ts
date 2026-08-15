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
])

export type AuditAction = z.infer<typeof auditActionSchema>

export const auditTargetSchema = z.enum(['USER', 'SESSION', 'PATIENT', 'BRANCH', 'SYSTEM'])

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
