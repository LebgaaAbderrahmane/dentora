# @dentora/api

Express REST API for Dentora PMS.

- Dev: `pnpm --filter @dentora/api dev` (tsx watch, port 4000)
- Build: `pnpm --filter @dentora/api build` (tsup → `dist/`)
- Smoke test: `curl http://localhost:4000/api/health`

Endpoints validate with Zod schemas from `@dentora/contracts`. Prisma schema, migrations,
and the seed script live here from Phase 0.4 (`pnpm prisma:migrate`, `pnpm prisma:seed`).

## Routes (Phase 0.5–0.6)

| Method | Path                                 | Auth    | Description                                                                                               |
| ------ | ------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`                    | —       | Create session, set httpOnly cookie                                                                       |
| POST   | `/api/auth/logout`                   | session | Revoke current session, clear cookie                                                                      |
| GET    | `/api/auth/me`                       | session | Current user (safe fields)                                                                                |
| POST   | `/api/auth/revoke-all`               | session | Revoke all other sessions                                                                                 |
| POST   | `/api/auth/change-password`          | session | Verify current + rotate password, revoke others                                                           |
| GET    | `/api/users`                         | ADMIN   | List staff of the branch                                                                                  |
| PATCH  | `/api/users/:id/role`                | ADMIN   | Change role — **revokes all sessions** of the user                                                        |
| POST   | `/api/users/:id/revoke-sessions`     | ADMIN   | Revoke all sessions of the user                                                                           |
| GET    | `/api/audit`                         | ADMIN   | Audit trail: paginated + filterable (action/actorEmail)                                                   |
| GET    | `/api/patients`                      | staff*  | Paginated list: `q`, `archived`, `limit` (≤200), `offset`                                                 |
| POST   | `/api/patients`                      | staff*  | Create patient — **notes encrypted** at rest                                                              |
| GET    | `/api/patients/:id`                  | staff*  | Detail — notes **decrypted only here** (audits VIEW)                                                      |
| PATCH  | `/api/patients/:id`                  | staff*  | Update patient (partial), notes encrypted on change                                                       |
| POST   | `/api/patients/:id/archive`          | staff*  | Soft-delete: sets `archivedAt`, logs `PATIENT_ARCHIVED`                                                   |
| POST   | `/api/patients/:id/restore`          | staff*  | Clear `archivedAt`, logs `PATIENT_RESTORE`                                                                |
| GET    | `/api/patients/:id/medical-history`  | staff*  | Record + `version`; `data: null` until first save (audits VIEW)                                           |
| PUT    | `/api/patients/:id/medical-history`  | staff*  | Upsert encrypted blob, **optimistic lock** (see below)                                                    |
| GET    | `/api/patients/:id/odontogram`       | staff*  | Tooth chart + `version`; `data: null` until first save (audits VIEW)                                      |
| PUT    | `/api/patients/:id/odontogram`       | staff*  | Upsert encrypted blob, **optimistic lock** (see below)                                                    |
| GET    | `/api/patients/:id/documents`        | staff*  | List document metadata (`originalName`, `mimeType`, `size`)                                               |
| POST   | `/api/patients/:id/documents`        | staff*  | Upload: raw body (`application/octet-stream`, ≤50 MB), headers `X-File-Name` (URI-encoded), `X-File-Mime` |
| GET    | `/api/patients/:id/documents/:docId` | staff*  | **Proxied download**: RBAC + branch scope, decrypts, streams, audits `PATIENT_DOCUMENT_VIEW`              |
| GET    | `/api/appointments`                  | staff*  | Range list: `start`+`end` ISO required; optional `status`/`dentistId`/`patientId`. **No notes**           |
| POST   | `/api/appointments`                  | staff*  | Create (PENDING/CONFIRMED/COMPLETED/CANCELLED/NOSHOW); notes encrypted; **409 CONFLICT** on double-book   |
| GET    | `/api/appointments/:id`              | staff*  | Detail — notes **decrypted only here** (audits `APPOINTMENT_VIEW`)                                        |
| PATCH  | `/api/appointments/:id`              | staff*  | Update/reschedule/cancel/no-show; re-checks conflict unless becoming terminal (audits per action)         |

`*` staff = ADMIN, DENTIST, RECEPTIONIST (branch-scoped). Patient list/search never returns
`notes` (ADR 006); they are only decrypted on `GET /api/patients/:id`.

### Documents (Phase 1.4, ADR 005 amended)

Binary files live in MinIO under `branch/{branchId}/patient/{patientId}/{documentId}` and are
**never directly reachable** — every byte is served through the API so RBAC and the audit
trail apply to each request (no signed URLs).

Encryption is **client-side envelope** (consistent with ADR 006):

- Upload: a fresh random **data key** (DEK) AES-256-GCM-encrypts the bytes; the DEK is
  **wrapped under the master `ENCRYPTION_KEY`** and stored on the object as
  `x-amz-meta-dentora-envelope-{key,iv,tag}`. MinIO never sees plaintext or the unwrapped DEK.
- `PatientDocument.size` is the **original plaintext length**, captured from the raw request
  at upload — never the (AEAD-overhead-free, but metadata-carried) stored size. `Content-Length`
  on download uses this field, so streamed/ranged clients never truncate or hang.
- Every download logs `PATIENT_DOCUMENT_VIEW` (`auto`); every upload logs `PATIENT_DOCUMENT_CREATE`.

Sessions are opaque 256-bit tokens; the DB stores only the SHA-256 hash (see `docs/security.md`).

Both are 1:1 encrypted records per patient. The whole record is one AES-256-GCM blob
(`data`); a plaintext `version` column gives atomic optimistic concurrency, so two staff
editing the same patient (e.g. dentist on the odontogram, receptionist on allergies)
cannot silently clobber each other:

- First save is an **upsert** (no row → created with `version: 1`).
- `PUT` bodies are `{ version, data }`. If the stored version differs, the API answers
  `409 {"error":"VERSION_CONFLICT","version":<current>}` and the client should refetch.
- Every `GET` logs `PATIENT_MEDICAL_VIEW` / `PATIENT_ODONTOGRAM_VIEW`; every `PUT`
  logs the matching `_UPDATE` audit event.

Sessions are opaque 256-bit tokens; the DB stores only the SHA-256 hash (see `docs/security.md`).

## Appointments (Phase 1.5)

Calendar windows are `[startAt, endAt)`. Double-booking is checked against **both** the assigned
dentist and the patient — any overlap with a `PENDING`/`CONFIRMED`/`COMPLETED` appointment
answers `409 {"error":"CONFLICT","overlaps":[{id,startAt,endAt,kind:"dentist"|"patient",patientName}]}`.
Terminal statuses (`CANCELLED`/`NOSHOW`) never block rebooking a slot.

- `POST`: validates the patient is in the caller's branch (`400 UNKNOWN_PATIENT`) and that the
  dentist exists in the same branch with `role = DENTIST` (`400 UNKNOWN_DENTIST`).
- `PATCH`: only the fields sent change. Schedule/assignment changes re-run the conflict check
  (excluding the appointment itself); a transition to `CANCELLED`/`NOSHOW` skips it so cancels
  never conflict. The merged window must satisfy `endAt > startAt` (a single-field PATCH cannot
  invert the schedule). Audit actions: `APPOINTMENT_UPDATE` / `_CANCEL` / `_NOSHOW` / `_RESCHEDULE`.
- Notes are AES-256-GCM encrypted at rest; `GET /:id` decrypts, the range list never includes them.

## Error tracking (ADR 009, Phase 0.7)

- `Sentry.init` runs when `SENTRY_DSN` is set (empty = disabled); API error middleware
  captures exceptions with route/method and the signed-in user context.
- Structured JSON request + error logs via `pino` (`src/lib/logger.ts`, level from `LOG_LEVEL`).

## Audit (ADR 007)

Every mutating/auth event writes a row to `audit_logs` via `src/lib/audit.ts`
(`recordAudit` / `recordAuditFor(req)`): who, what (`action`), on which record
(`targetType`/`targetId`), `metadata` (before/after snapshots), `ip`, `userAgent`, and `createdAt`.
Logged today: login success/failure, logout, change-password, revoke-all, role change, revoke sessions,
patient view/create/update/archive/restore, medical-history view/update, odontogram view/update.
