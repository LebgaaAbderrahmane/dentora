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
