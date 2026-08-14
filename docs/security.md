# Security model

> Draft: schema-level decisions are locked (ADRs 006/007/009/010/011). Auth + RBAC landed in Phase 0.5,
> basic audit log in 0.6; Sentry is next (0.7).

## Data classification

| Class     | Examples                            | Protection                                                          |
| --------- | ----------------------------------- | ------------------------------------------------------------------- |
| Public    | clinic info, services list          | none                                                                |
| Internal  | staff, schedule, expenses           | RBAC                                                                |
| Sensitive | patients, medical history, invoices | RBAC + **field-level encryption** (AES-256-GCM)                     |
| Documents | X-rays, consents                    | RBAC + MinIO **server-side encryption** at rest + signed-URL access |

## Authentication & sessions

- **Opaque random tokens** (256-bit), **not JWT**: the raw token lives only in the httpOnly
  `dentora_session` cookie; the DB stores only its SHA-256 hash (ADR-consistent server-side store).
- Sessions live in the `sessions` table (expiry + `revokedAt`); loading a session also checks the
  user is still `active`.
- Endpoints (Phase 0.5): `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/auth/me`, `POST /api/auth/revoke-all`, `POST /api/auth/change-password`.
- **Revoke-all** and **automatic revocation on role change** (sessions revoked on `PATCH /api/users/:id/role`).
- CSRF mitigation: `SameSite=Lax` httpOnly cookie (state-changing endpoints are same-site);
  a CSRF token header is listed as a hardening item before launch.

## Authorization

- RBAC with a granular permission matrix.
- Roles: `admin` · `dentist` · `receptionist` · `accountant` · `intern` · `patient`.
- Every request is checked against the role's permissions via middleware.

## Audit (ADR 007)

- Audit log implemented in Phase 0.6: every auth/mutation event writes `who / what / which record / when`
  (+ `ip`, `userAgent`, before/after `metadata`) to `audit_logs` via `src/lib/audit.ts`.
  Read API: `GET /api/audit` (ADMIN, branch-scoped, paginated, filterable).
- Events logged today: login success/failure, logout, change-password, revoke-all, role change,
  revoke sessions. Patient view/edit/create/delete events wire in with Phase 1.1.
- Admin audit UI + retention policy in Phase 6.

## Encryption at rest (ADR 006)

- MedicalHistory and other sensitive fields encrypted field-level with AES-256-GCM.
- App-level key supplied via environment variable (not in DB).
- MinIO buckets encrypted server-side; objects never delivered directly — short-lived signed URLs.

## Network & infra

- Non-root containers; caddy terminates TLS (Let's Encrypt, automatic renewal).
- Rate limiting and helmet on the API.
- Backups are encrypted and off-host (ADR 010).

## Incident visibility (ADR 009)

- Sentry wired on `api` + `admin`/`portal` in Phase 0.7 — DSN from environment (`SENTRY_DSN`,
  `VITE_SENTRY_DSN` at build time); disabled when empty.
- API also logs structured JSON (pino) per request + on errors (`LOG_LEVEL`).
- API error events carry route/method and the signed-in user when available.
- Restore drill and security/perf audit in Phase 6.5.

## Threat notes to revisit before launch

- Brute-force protection on login (rate limit already listed).
- File type/size validation on document uploads.
- S3/MinIO credential scoping (separate access key per bucket).
- Session expiry / idle timeout policy.
- Dependency scanning in CI (e.g. `pnpm audit`) — add in Phase 6.
