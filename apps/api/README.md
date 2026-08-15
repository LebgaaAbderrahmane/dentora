# @dentora/api

Express REST API for Dentora PMS.

- Dev: `pnpm --filter @dentora/api dev` (tsx watch, port 4000)
- Build: `pnpm --filter @dentora/api build` (tsup → `dist/`)
- Smoke test: `curl http://localhost:4000/api/health`

Endpoints validate with Zod schemas from `@dentora/contracts`. Prisma schema, migrations,
and the seed script live here from Phase 0.4 (`pnpm prisma:migrate`, `pnpm prisma:seed`).

## Routes (Phase 0.5–0.6)

| Method | Path                             | Auth    | Description                                             |
| ------ | -------------------------------- | ------- | ------------------------------------------------------- |
| POST   | `/api/auth/login`                | —       | Create session, set httpOnly cookie                     |
| POST   | `/api/auth/logout`               | session | Revoke current session, clear cookie                    |
| GET    | `/api/auth/me`                   | session | Current user (safe fields)                              |
| POST   | `/api/auth/revoke-all`           | session | Revoke all other sessions                               |
| POST   | `/api/auth/change-password`      | session | Verify current + rotate password, revoke others         |
| GET    | `/api/users`                     | ADMIN   | List staff of the branch                                |
| PATCH  | `/api/users/:id/role`            | ADMIN   | Change role — **revokes all sessions** of the user      |
| POST   | `/api/users/:id/revoke-sessions` | ADMIN   | Revoke all sessions of the user                         |
| GET    | `/api/audit`                     | ADMIN   | Audit trail: paginated + filterable (action/actorEmail) |
| GET    | `/api/patients`                  | staff*  | Paginated list: `q`, `archived`, `limit`, `offset`      |
| POST   | `/api/patients`                  | staff*  | Create patient — **notes encrypted** at rest            |
| GET    | `/api/patients/:id`              | staff*  | Detail — notes **decrypted only here** (audits VIEW)    |
| PATCH  | `/api/patients/:id`              | staff*  | Update patient (partial), notes encrypted on change     |
| POST   | `/api/patients/:id/archive`      | staff*  | Soft-delete: sets `archivedAt`, logs `PATIENT_ARCHIVED` |
| POST   | `/api/patients/:id/restore`      | staff*  | Clear `archivedAt`, logs `PATIENT_RESTORE`              |

`*` staff = ADMIN, DENTIST, RECEPTIONIST (branch-scoped). Patient list/search never returns
`notes` (ADR 006); they are only decrypted on `GET /api/patients/:id`.

Sessions are opaque 256-bit tokens; the DB stores only the SHA-256 hash (see `docs/security.md`).

## Error tracking (ADR 009, Phase 0.7)

- `Sentry.init` runs when `SENTRY_DSN` is set (empty = disabled); API error middleware
  captures exceptions with route/method and the signed-in user context.
- Structured JSON request + error logs via `pino` (`src/lib/logger.ts`, level from `LOG_LEVEL`).

## Audit (ADR 007)

Every mutating/auth event writes a row to `audit_logs` via `src/lib/audit.ts`
(`recordAudit` / `recordAuditFor(req)`): who, what (`action`), on which record
(`targetType`/`targetId`), `metadata` (before/after snapshots), `ip`, `userAgent`, and `createdAt`.
Logged today: login success/failure, logout, change-password, revoke-all, role change, revoke sessions.
Patient events (`PATIENT_VIEW/_CREATE/_UPDATE/_DELETE`) are wired for Phase 1.1.
