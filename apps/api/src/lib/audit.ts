import type { Request } from 'express'
import { Prisma } from '../generated/prisma/client'
import type { AuditAction, AuditTarget } from '../generated/prisma/enums'
import { prisma } from './prisma'

export interface AuditEntryInput {
  action: AuditAction
  targetType: AuditTarget
  targetId?: string | null
  actorId?: string | null
  actorEmail?: string | null
  branchId: string
  metadata?: Prisma.InputJsonValue | null
  ip?: string | null
  userAgent?: string | null
}

export async function recordAudit(input: AuditEntryInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      branchId: input.branchId,
      metadata: input.metadata ?? Prisma.JsonNull,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  })
}

export function requestMeta(req: Request): { ip: string | null; userAgent: string | null } {
  return {
    ip: req.ip ?? null,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
  }
}

export function recordAuditFor(req: Request) {
  return (
    entry: Omit<AuditEntryInput, 'actorId' | 'actorEmail' | 'branchId' | 'ip' | 'userAgent'>,
  ): Promise<void> => {
    const { ip, userAgent } = requestMeta(req)
    return recordAudit({
      ...entry,
      actorId: req.auth?.user.id ?? null,
      actorEmail: req.auth?.user.email ?? null,
      branchId: req.auth?.user.branchId ?? 'system',
      ip,
      userAgent,
    })
  }
}
