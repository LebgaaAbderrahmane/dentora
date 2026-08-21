# Security model

> Draft: schema-level decisions are locked (ADRs 006/007/009/010/011). Auth + RBAC landed in Phase 0.5,
> basic audit log in 0.6; Sentry is next (0.7).

## Data classification

| Class     | Examples                                               | Protection                                                          |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| Public    | clinic info, services list                             | none                                                                |
| Internal  | staff, schedule, expenses                              | RBAC                                                                |
| Sensitive | patients, medical history, appointment notes, invoices | RBAC + **field-level encryption** (AES-256-GCM)                     |
| Documents | X-rays, consents                                       | RBAC + MinIO **server-side encryption** at rest + signed-URL access |

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

- MedicalHistory, Odontogram, Patient.notes and Appointment.notes encrypted field-level with AES-256-GCM.
- App-level key supplied via environment variable (not in DB).
- Appointment notes are decrypted **only** on `GET /api/appointments/:id`; range lists never
  include them. Calendar conflict checks query only unencrypted fields (start/end/dentist/patient).
- MinIO buckets encrypted server-side; objects never delivered directly — short-lived signed URLs.

## Network & infra

- Non-root containers; caddy terminates TLS (Let's Encrypt, automatic renewal).
- **Helmet** on the API (6.5): default security headers, `crossOriginResourcePolicy: same-site`;
  CSP defaults on, COEP off (same-origin SPA + API behind one host).
- **`trust proxy = 1`** (6.5): the API sits behind exactly one nginx/Caddy hop, so `req.ip`
  is the real client address — used as the rate-limit key instead of a spoofable raw
  `X-Forwarded-For` header.
- Rate limiting: in-memory fixed window (`lib/rateLimit.ts`, 5/hour per IP,
  `PUBLIC_RATE_MAX` overrides) on the public booking endpoint; login throttling added
  in 6.5. Edge-level enforcement (Caddy/nginx) remains the place for global limits.
- Backups are host-local today; off-host copy is tracked as a gap below (ADR 010 follow-up).

## Incident visibility (ADR 009)

- Sentry wired on `api` + `admin`/`portal` — DSN from environment (`SENTRY_DSN`,
  `VITE_SENTRY_DSN` at build time); disabled when empty. Public web SPA wired in 6.5.
- API also logs structured JSON (pino) per request + on errors (`LOG_LEVEL`).
- API error events carry route/method and the signed-in user when available.

## Threat notes to revisit before launch

- ~~Brute-force protection on login~~ — done in 6.5: per-IP+email fixed-window throttle
  on `POST /api/auth/login` (10/hour, `LOGIN_RATE_MAX` overrides), failures still audited.
- File type/size validation on document uploads.
- S3/MinIO credential scoping (separate access key per bucket).
- Session expiry / idle timeout policy.
- ~~Dependency scanning~~ — `pnpm audit` run in 6.5 (see PROCESS §14); CI wiring in 6.6.
- Off-host backup copies + `pg_stat_archiver` alerting (see `docs/backup-restore.md`).
