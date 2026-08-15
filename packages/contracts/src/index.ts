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
