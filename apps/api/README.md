# @dentora/api

Express REST API for Dentora PMS.

- Dev: `pnpm --filter @dentora/api dev` (tsx watch, port 4000)
- Build: `pnpm --filter @dentora/api build` (tsup → `dist/`)
- Smoke test: `curl http://localhost:4000/api/health`

Endpoints validate with Zod schemas from `@dentora/contracts`. Prisma schema, migrations,
and the seed script live here from Phase 0.4 (`pnpm prisma:migrate`, `pnpm prisma:seed`).

## Routes (Phase 0.5)

| Method | Path                             | Auth    | Description                                        |
| ------ | -------------------------------- | ------- | -------------------------------------------------- |
| POST   | `/api/auth/login`                | —       | Create session, set httpOnly cookie                |
| POST   | `/api/auth/logout`               | session | Revoke current session, clear cookie               |
| GET    | `/api/auth/me`                   | session | Current user (safe fields)                         |
| POST   | `/api/auth/revoke-all`           | session | Revoke all other sessions                          |
| POST   | `/api/auth/change-password`      | session | Verify current + rotate password, revoke others    |
| GET    | `/api/users`                     | ADMIN   | List staff of the branch                           |
| PATCH  | `/api/users/:id/role`            | ADMIN   | Change role — **revokes all sessions** of the user |
| POST   | `/api/users/:id/revoke-sessions` | ADMIN   | Revoke all sessions of the user                    |

Sessions are opaque 256-bit tokens; the DB stores only the SHA-256 hash (see `docs/security.md`).
