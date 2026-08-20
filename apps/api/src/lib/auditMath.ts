import { MAX_AUDIT_RETENTION_DAYS } from '@dentora/contracts'

const DAY_MS = 86_400_000

// Clamps a requested retention duration into the safe window. The ADR 034 default
// is 365 days; anything outside 1..MAX_AUDIT_RETENTION_DAYS (10 years) is coerced
// rather than rejected, so a bad stored value can never wipe the whole log.
export function retentionDaysClamped(days: number): number {
  return Math.min(MAX_AUDIT_RETENTION_DAYS, Math.max(1, Math.round(days)))
}

// Rows strictly older than this instant are eligible for purge.
export function retentionCutoff(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - retentionDaysClamped(days) * DAY_MS)
}

// Prisma `where` clause for the purge, kept here so the boundary is pure and
// unit-testable without a DB.
export function retentionPurgeWhere(
  branchId: string,
  days: number,
  now: Date = new Date(),
): {
  branchId: string
  createdAt: { lt: Date }
} {
  return { branchId, createdAt: { lt: retentionCutoff(days, now) } }
}
