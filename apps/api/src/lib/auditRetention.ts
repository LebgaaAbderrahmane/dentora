import { MAX_AUDIT_RETENTION_DAYS } from '@dentora/contracts'
import { prisma } from './prisma'
import { logger } from './logger'
import { retentionCutoff, retentionPurgeWhere } from './auditMath'

// One `Setting` row (`audit.retention`) per branch holds the purge policy.
// Nothing here touches patient data — it deletes only the branch's audit rows,
// and the `enabled` flag is the kill-switch (the sweep is a no-op while off),
// mirroring the notification-config precedent (ADR 032).
const CONFIG_KEY = 'audit.retention'

export interface StoredRetention {
  enabled: boolean
  days: number
  lastPurgedAt: string | null
}

export function defaultStoredRetention(): StoredRetention {
  return { enabled: false, days: 365, lastPurgedAt: null }
}

export async function loadStoredRetention(branchId: string): Promise<StoredRetention> {
  const row = await prisma.setting.findUnique({
    where: { branchId_key: { branchId, key: CONFIG_KEY } },
  })
  if (!row?.value) return defaultStoredRetention()
  const empty = defaultStoredRetention()
  try {
    const raw = JSON.parse(row.value) as StoredRetention
    return {
      enabled: Boolean(raw.enabled),
      days: typeof raw.days === 'number' ? raw.days : empty.days,
      lastPurgedAt: typeof raw.lastPurgedAt === 'string' ? raw.lastPurgedAt : null,
    }
  } catch {
    return defaultStoredRetention()
  }
}

export async function saveStoredRetention(branchId: string, r: StoredRetention): Promise<void> {
  const value = JSON.stringify(r)
  await prisma.setting.upsert({
    where: { branchId_key: { branchId, key: CONFIG_KEY } },
    create: { branchId, key: CONFIG_KEY, value },
    update: { value },
  })
}

// Read shape for the admin board: the stored value is always clamped so the UI
// never shows a config the sweeper would reinterpret differently.
export function toRetentionShape(r: StoredRetention) {
  return {
    enabled: r.enabled,
    days: Math.min(MAX_AUDIT_RETENTION_DAYS, Math.max(1, Math.round(r.days))),
    lastPurgedAt: r.lastPurgedAt,
  }
}

// Full-replace merge (ADR 032 precedent); keeps bookkeeping fields untouched.
export function applyRetentionUpdate(
  stored: StoredRetention,
  update: { enabled: boolean; days: number },
): StoredRetention {
  return {
    enabled: update.enabled,
    days: update.days,
    lastPurgedAt: stored.lastPurgedAt,
  }
}

// Purges the branch's rows older than the retention window. Honours the
// kill-switch: while disabled the purge is a no-op (returns 0 deleted), exactly
// like the disabled reminder sweep — the manual "purge now" button and the
// interval share this path, so toggling `enabled` off stops ALL deletion.
export async function purgeAuditLogs(
  branchId: string,
  retention: StoredRetention,
  now: Date = new Date(),
): Promise<{ deleted: number; cutoff: string }> {
  if (!retention.enabled) {
    logger.info({ branchId }, 'audit retention disabled — purge skipped')
    return { deleted: 0, cutoff: retentionCutoff(retention.days, now).toISOString() }
  }
  const where = retentionPurgeWhere(branchId, retention.days, now)
  const result = await prisma.auditLog.deleteMany({ where })
  return { deleted: result.count, cutoff: where.createdAt.lt.toISOString() }
}
