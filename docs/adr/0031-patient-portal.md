# ADR 031 — Patient portal (Phase 5.1)

- **Date:** 2026-08-19
- **Status:** Accepted
- **Relates to:** ADR 003 (three frontends — the portal is the patient SPA), ADR 002
  (shared Zod contracts), ADR 007 (audit — new `PORTAL_ACCESS_*` actions), ADR 013
  (appointments), ADR 018/019 (invoices/payments shape reused read-only)

## Context

Phase 5.1 gives patients a self-service portal: log in, see their history (appointments +
invoices), book online and cancel. The clinic has three existing facts to build on:

- **Appointments** already exist with a full status lifecycle and conflict detection
  (ADR 013). A patient booking should feed the **same** pipeline, not a parallel one.
- **Invoices/payments** already produce a read model with derived status and paid/balance
  amounts (ADR 018/019) — the portal only needs a self-scoped read of it.
- **Auth/RBAC** already has a cookie session, `roles`, and a `requireRole` guard. The
  portal needs _patient_ accounts, which today don't exist.

Three design questions:

1. **How is a patient identity created?** Patients are managed by the desk
   (ADMIN/RECEPTIONIST). There is no self-signup — the clinic knows the patient. So portal
   access is **provisioned by the desk** from the existing patient record, generating a
   temporary password that is shown **exactly once** and never stored or retrievable again.
2. **How does the API know which patient is calling?** The portal must never be able to
   read another patient's data. The identity is therefore the **session itself**: `User`
   gets a `patientId` unique link to the linked `Patient`, and every portal endpoint
   derives its scope from `user.patientId` — no patient/user id is ever accepted from the
   request body.
3. **Are portal bookings instantly confirmed?** No. A patient cannot see the desk's full
   schedule rules; bookings are created **PENDING** and the desk confirms exactly like any
   other appointment. Cancellation is allowed by the patient only before the start time.

## Decision

**A `User` row per patient**, `role: 'PATIENT'`, linked to the patient via
`User.patientId String? @unique` (relation `"PatientUser"`) and `Patient.user` back-relation.
The login email is **the patient's own email** (the field already on `Patient`). Portal
auth reuses the existing cookie session + `requireRole('PATIENT')`; the staff apps reject
`PATIENT` logins as before (the shared `safeUser` now carries a nullable `patientId`).

**Desk provisioning** (`GET/POST /api/patients/:id/portal-access`, ADMIN + RECEPTIONIST):
`POST { action: 'create' }` creates the PATIENT user (409 `PORTAL_ACCESS_EXISTS` if already
present, 409 `EMAIL_IN_USE`, 400 `NO_EMAIL`), `{ action: 'reset' }` re-hashes the password
and **revokes all live sessions** in the same transaction so a lost phone can't keep an old
session alive. Both return `{ email, password }` with the generated password **exactly once**
(`lib/password.ts` — 10 chars, ambiguity-free alphabet, leading digit for phone-keypad
typing). Actions are audited (`PORTAL_ACCESS_CREATE`/`PORTAL_ACCESS_RESET`, target `USER`).

**Self-scoped portal API** (`/api/portal`, all `requireAuth + requireRole('PATIENT')`):

- `GET /me`, `GET /dentists` (branch dentists for the booking form)
- `GET /appointments` — the patient's own rows (shared `APPOINTMENT_SELECT`/`mapNames`/`toAppointment`)
- `POST /bookings` — validates dentist + conflicts via the shared `findConflicts`, then
  creates a **PENDING** appointment (notes encrypted, `createdById` = the patient user,
  audited `APPOINTMENT_CREATE` with `source: 'portal'`)
- `POST /appointments/:id/cancel` — only the patient's own, only before `startAt`, 404 on
  unknown, 400 `NOT_CANCELLABLE` otherwise, audited `APPOINTMENT_CANCEL`
- `GET /invoices`, `GET /invoices/:id` — self-scoped reuse of the shared invoice read
  model (derived status + paid/balance), never exposing staff data

A `PATIENT` session whose patient row is gone (or link missing) gets `403 NO_PORTAL_PATIENT`.
Portal booking responses reuse `appointmentSchema` (the normalized row, **no notes** — notes
stay desk-only, matching the admin list contract).

## Consequences

- Patients can never cross-read: scope is always `user.patientId`, never a client-supplied id.
- Portal bookings flow through the exact same PENDING→confirmed lifecycle and conflict checks
  as desk bookings, so the desk keeps full control of the schedule.
- The desk owns credential issuance; a reset is a true revoke (all sessions killed), so a
  forgotten/stolen credential is recoverable without exposure.
- The generated password is a one-time display — if lost, the desk just resets again.
- The seed provisions a demo portal patient (`Mohammed Bouzid`, `m.bouzid@mail.dz`,
  password = demo password) so the flow is testable immediately.
