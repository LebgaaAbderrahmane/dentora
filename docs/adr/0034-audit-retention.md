# ADR 034 — Audit log UI + retention policy (Phase 6.2)

- **Date:** 2026-08-20
- **Status:** Accepted
- **Relates to:** ADR 007 (audit — the write surface and row shape), ADR 032 (the
  per-branch `Setting` config + unref'd interval-sweep precedent the retention policy
  reuses), ADR 002 (shared Zod contracts)

## Context

Phase 6.2 makes the audit log actually queryable day-to-day and adds a **retention
policy** so the log doesn't grow without bound. The audit write path (ADR 007) has been
in place since the early phases; the read side has been a single ADMIN-only `GET /api/audit`
with an action filter and a hard 50-row cap — no date range, no target filter, no user
search, no pagination, and no way to expire old rows.

Three design questions:

1. **What is the admin consumption surface?** The desk wants to answer "what happened
   on record X, by user Y, in window Z". That maps to filters (action, target type,
   actor email, `from`/`to`) plus offset pagination — everything already in the row shape,
   so the contracts only add optional query fields, nothing stored.
2. **Do reads get audited?** No. Auditing the "read the audit log" action would either
   create feedback (each page load writes a new row that could itself be purged by a
   subsequent run) or require an exclusion rule for no benefit — the log's purpose is
   inspecting _mutations and sensitive views_, not its own pagination.
3. **How do old rows leave the system?** A per-branch policy — keep rows for `days`, then
   delete — stored in a `Setting` row exactly like the notification config (ADR 032):
   one `audit.retention` key per branch, `enabled` as the kill-switch, an unref'd
   interval sweep that is a strict no-op while disabled, plus a manual "purge now" button
   sharing the same code path. The one difference from notifications: **this sweep deletes
   data**, so the days value is clamped to a hard bound and the policy change is itself
   audited.

## Decision

**Read — `routes/audit.ts` (ADMIN)**: `GET /api/audit` gains `targetType`, `actorEmail`
(substring, case-insensitive), `from`/`to` (ISO instants, `.datetime()` in the contract)
and offset pagination (`limit` default 50, max 200). The query is branch-scoped to the
requester. Reading writes nothing.

**Retention — a new `AUDIT` target + `AUDIT_RETENTION_UPDATE` action** (one migration,
enum `ALTER TYPE … ADD VALUE` only, per house practice) so the policy decision is itself
traceable:

- `GET /api/audit/retention` — reads the stored `{ enabled, days, lastPurgedAt }`.
- `PUT /api/audit/retention` — full-replace `{ enabled, days }`; `days` bounded
  1..`MAX_AUDIT_RETENTION_DAYS` (3650) by the contract, re-clamped on load so a corrupt
  stored value can't wipe history; every save writes an `AUDIT_RETENTION_UPDATE`/`AUDIT`
  row with the new policy.
- `POST /api/audit/retention/purge` — runs the purge immediately, returning
  `{ deleted, cutoff }`, or `409 AUDIT_RETENTION_DISABLED` while the kill-switch is off
  (so the UI never shows a fake "0 deleted" run against a disabled policy).
- The purge is one pure boundary (`lib/auditMath.ts`): `retentionCutoff(days, now)` and
  `retentionPurgeWhere(branchId, days, now)` — `deleteMany` on `branchId` +
  `createdAt < cutoff`. Pure means the arithmetic is unit-tested without a DB.
- A background sweep mirrors the reminder sweep (ADR 032): unref'd interval across all
  branches (`AUDIT_RETENTION_INTERVAL_MIN`, default 1440 = daily), per-branch stored
  policy, no-op while disabled, `lastPurgedAt` bookkeeping written after a purge.

**Admin UI (`AuditView`)** gains the filters, a paginator (previous/next + visible range),
and a retention card — toggle, days input, save, "purge now" with a deleted-count result.
Target type gets a label map (`audit.targets.*`) parallel to the existing actions map.

## Consequences

- **Filterable, paged, bounded extent.** The desk can triage a specific record/time/actor;
  the paginator uses the same branch-scoped `total` so the count is always honest.
- **Policy changes are visible after the fact.** The `AUDIT_RETENTION_UPDATE` rows carry
  the `days`/`enabled` snapshot, and because a policy row is newer than any row it would
  purge, the audit of the policy survives its own purge window.
- **Deletion is conservative by construction.** Clamped days (1..3650), branch-scoped
  where clause (no cascade, plain rows — ADR 007 design pays off), and a kill-switch that
  stops _both_ the interval and the manual button. Defaults are **disabled** so nothing is
  deleted until the desk opts in — the demo seed provisions a disabled policy to show the
  UI without risk.
- **No feedback loop** for reads; the only new audit actions are the policy updates themselves.
- One migration, forward-only enum extension — no backfills, no new tables.
