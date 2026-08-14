import { describe, expect, it } from 'vitest'
import {
  auditActionSchema,
  auditEntrySchema,
  auditQuerySchema,
  loginSchema,
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
})
