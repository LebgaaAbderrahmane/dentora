# Performance notes (Phase 6.5 audit)

Findings from the 6.5 hardening pass. Numbers are dev-host measurements — re-measure
on production hardware before treating them as budgets.

## API

- **Compression** happens at the nginx edge (`infra/nginx/nginx.conf`: gzip for JSON +
  SPA assets ≥ 1024 B). The API intentionally ships no compression middleware; adding
  one would double-compress behind the proxy.
- **Indexes reviewed (6.5)**: Appointment (branch+startAt, branch+status+startAt,
  branch+dentist+startAt, patient+startAt), AuditLog (branch+createdAt, branch+action+
  createdAt, action, actorId), Session (tokenHash unique, userId) all cover their
  query shapes. Gap found & fixed: `Patient(branchId, phone)` was queried un-indexed by
  the public booking find-or-create (ADR 016) — migration
  `20260821180801_add_patient_phone_index`.
- **N+1**: no annotated hot paths; list endpoints batch derived fields (dashboard KPIs,
  payroll worked-minutes, notifications joins) in single `findMany` calls.
- **Rate limiter is in-memory per instance** (`lib/rateLimit.ts`): resets on restart and
  does not aggregate across replicas. Fine for the single-node deployment; revisit if
  the API ever scales horizontally (edge-level limiting then becomes mandatory).

## Frontends (dist, minified, before edge gzip)

| App    | Main JS  | CSS   | Notes                                            |
| ------ | -------- | ----- | ------------------------------------------------ |
| admin  | ~1.09 MB | 68 KB | code-splitting candidate (largest chunk warning) |
| web    | ~592 KB  | 35 KB | PWA precache ≈ 643 KB total incl. workbox        |
| portal | ~356 KB  | 20 KB | smallest surface                                 |

- All hashed assets ship `immutable, max-age=31536000`; HTML `no-cache` (nginx).
- Deferred: route-level/dynamic `import()` splitting for admin (tracked with 6.6 docs/CD
  consolidation); no user-facing slowness reported at current data volumes.

## Database / DR interplay

- WAL archiving healthy at drill time (`pg_stat_archiver`: archived rising, failed = 0).
- RPO ≤ 5 min by `archive_timeout=300`; see `docs/backup-restore.md` for the drill log.
