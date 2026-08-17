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
| GET    | `/api/waitlist`                      | staff*  | List `{items,total}`: filter `status`/`dentistId`/`patientId`/`q` (patient name), `limit` (≤200)/`offset` |
| POST   | `/api/waitlist`                      | staff*  | Add patient to waiting list (`preferredDate`/`notes` encrypted); **409 WAITLIST_ALREADY_ACTIVE** on dup   |
| GET    | `/api/waitlist/:id`                  | staff*  | Entry detail — notes **decrypted only here**                                                              |
| PATCH  | `/api/waitlist/:id`                  | staff*  | Update/status transition; `BOOKED` requires a matching `appointmentId` (audits per action)                |
| GET    | `/api/staff/dentists`                | staff*  | Branch-scoped dentist roster (`{id,name,email}`) for scheduling UIs                                       |

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

## Waiting list (Phase 1.6, ADR 014)

Patients waiting for a slot. Lifecycle is **status-driven** — no hard delete:

- `PENDING` → `CONTACTED` (receptionist called) → `BOOKED` (a real appointment was made), or
  `CANCELLED`/`EXPIRED` as terminal removal states.
- Only one `PENDING`/`CONTACTED` entry per patient: a second add answers
  `409 {"error":"WAITLIST_ALREADY_ACTIVE","duplicateId":...}`.
- `BOOKED` requires an `appointmentId` that must exist, be in the same branch, and belong to the
  same patient (`400 UNKNOWN_APPOINTMENT` otherwise). The appointment itself is created through
  `/api/appointments` (conflict checks apply there); the waitlist entry just links to it.
- `notes` are AES-256-GCM encrypted at rest; the list rows never include them (ADR 006).
- Audit: `WAITLIST_CREATE` / `WAITLIST_UPDATE` / `WAITLIST_BOOK` / `WAITLIST_CANCEL`, always
  targeting the patient with `metadata.waitlistEntryId`.

## No-show stats (Phase 1.6)

`GET /api/patients/:id` additionally returns derived, never-stored fields:

- `noShowCount` — appointments with status `NOSHOW` in the branch.
- `noShowRate` — `noShow / (noShow + completed)` (0–1, 4-decimal precision). Pending and
  cancelled visits never count as a resolved visit.

## Dashboard KPIs (Phase 1.7, ADR 015)

`GET /api/dashboard/kpis` (ADMIN/DENTIST/RECEPTIONIST, branch-scoped). All figures are **derived
on read** — nothing is stored or denormalized. The query takes optional absolute-instant windows
(built by the client as its own local boundaries, mirroring the calendar range calls):

- `from` (start of "today"), `to` (end of "today"), `windowStart` (start of the 30-day lookback).
  Defaults: server-local today and a 30-day lookback.

Response shape:

- `visits.today` — `total` + `byStatus` counts for the window; `visits.upcoming` — today's
  PENDING/CONFIRMED/COMPLETED appointments from now on, sorted, max 10 (list rows never carry
  decrypted notes).
- `noShow` — `today` (NOSHOW count in the window) + `rate30d` (same `noShow/(noShow+completed)`
  formula as the patient detail stat, over the 30-day window).
- `waitlist.active` — PENDING + CONTACTED entries.
- `patients.total` (non-archived) + `patients.new30d` (created in the window).

`revenue` and low-stock alerts are **intentionally absent**: invoicing (Phase 2) and inventory
(Phase 3) do not exist yet — see ADR 015 for the deferral.

## Public booking (Phase 1.8, ADR 016)

`POST /api/public/bookings` is the **only unauthenticated** endpoint — the marketing site's
booking form calls it and it produces a **PENDING waitlist entry** (never an appointment):

- Body: `firstName`, `lastName`, `phone` (required), `service`, `preferredDate`, `message`
  (optional; service + message are folded into the encrypted waitlist `notes`).
- The visitor is **find-or-created as a patient** by `phone` in the resolved branch, so
  repeat requests for the same person collapse onto one patient.
- Reuses the staff rule: an already-active entry answers `409 WAITLIST_ALREADY_ACTIVE`
  (`duplicateId`).
- Branch is `PUBLIC_BRANCH_ID` if set, else the clinic's first branch (single-clinic model).
- A tiny in-memory per-IP limiter (5/hour, fixed window) returns `429 TOO_MANY_REQUESTS`.
- Audited as `WAITLIST_CREATE` targeting the patient with `metadata.source: 'web'`; the entry
  row itself is created with `createdById = null`, which the waitlist list exposes as
  `source: 'web'` (staff-created entries are `source: 'staff'`).
- 201 answers `{ "waitlistEntryId": "<cuid>" }`.

## Service catalog (Phase 2.1, ADR 017)

`/api/services` — branch-scoped, **read for the clinical trio, write ADMIN-only**
(create/update/archive/restore stack `requireRole('ADMIN')`; pricing is
management-sensitive):

- `GET /` — list: `q` (name ILIKE), `category` (enum), `archived` (`exclude` default | `only`),
  `limit` ≤200, `offset`. Archive is soft via `archivedAt`.
- `GET /:id` — one row. `POST /` — create. `PATCH /:id` — update (partial).
  `POST /:id/archive` | `POST /:id/restore`.
- Prices are **whole-dinar `priceDZD` integers — no sub-unit precision**; `durationMinutes`
  is estimated and reserved for scheduling later; `reimbursablePct` is 0–100 convention
  coverage. No per-read audit (not PHI); every write is `SERVICE_*` audited.
- **2.2 contract:** once invoices exist, invoice lines must **snapshot the price at booking
  time** — changing the catalog must never rewrite historical invoices/payments.

## Invoices (Phase 2.2, ADR 018)

`/api/invoices` — read for the clinical trio + ACCOUNTANT, **create/void ADMIN+RECEPTIONIST**:

- `GET /` — list: `q` (patient name, or the invoice number when numeric), `status`
  (`UNPAID`, `PARTIAL`, `PAID`, `VOID`), `patientId`, `limit` ≤200. Statuses are derived
  (`paidDZD` vs `subtotalDZD`), so paid-dependent filters are matched in memory over the
  branch's invoices (single-clinic volume, ADR 019); `VOID` is a `voidedAt` scan.
- `POST /` — create from `{ patientId, lines: [{ serviceId?, serviceName, priceDZD, quantity }] }`.
  Lines **snapshot** name + price; the catalog is never re-read for billing (ADR 017). Numbers
  are whole-dinar `Int` and `invoiceNumber` is allocated **atomically per branch** (ADR 018).
- `POST /:id/void` — the only status mutation (`voidedAt`); there is **no edit route** —
  corrections are void + re-issue (ADR 018). `400 ALREADY_VOID` on a second void;
  `400 INVOICE_HAS_PAYMENTS` while money is still collected (refund first).
- `GET /:id` — line items + `paidDZD`/`balanceDZD` and the full `payments` ledger.
- Totals (`subtotalDZD`, `totalDZD`) and the contract `status`
  (`UNPAID | PARTIAL | PAID | VOID`) are **derived on read** (`lib/invoiceStatus.ts`, with
  `lib/invoice.ts` owning the atomic per-branch number); payments feed `paidDZD` (ADR 019).
- Every create/void is audited (`AuditTarget.INVOICE`, metadata number + patient + total).

## Payments & refunds (Phase 2.3, ADR 019)

`/api/payments` — receipts (money in) and refunds (money out) in **one table** discriminated
by `kind` (`RECEIPT` | `REFUND`); `paidDZD` is always derived = Σ(RECEIPT) − Σ(REFUND), a
single `groupBy` in `lib/payments.ts`, never stored. Methods `CASH | CHEQUE | CARD | TRANSFER`.

- Read for clinical trio + ACCOUNTANT, **write ADMIN+RECEPTIONIST** (same desk as invoice
  create/void). Pure money math lives in `lib/paymentMath.ts` (no prisma import, CI-testable).
- `POST /` — record a receipt `{ invoiceId, method, amountDZD, reference?, notes?, receivedAt? }`.
  No payment on a voided invoice (`400 INVOICE_VOIDED`), never overpays the invoice total
  (`400 PAYMENT_EXCEEDS_BALANCE`); `201` + `PAYMENT_CREATE` audit.
- `POST /:id/refund` — `{ amountDZD, notes?, receivedAt? }` against a receipt, bounded by the
  receipt's remaining net (`400 REFUND_EXCEEDS_RECEIPT`); `201` + `PAYMENT_REFUND` audit with
  the reversed payment id. Refunds never edit money — an immutable reversal row (ADR 019).
- `GET /` — ledger, filter `invoiceId` or `invoiceNumber`, `limit` ≤200.
- A "receipt" is a `RECEIPT` payment row; printing it is a client concern.

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
