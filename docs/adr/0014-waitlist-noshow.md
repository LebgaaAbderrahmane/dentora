# ADR 0014 — Waiting list + no-show handling

- **Date:** 2026-08-16
- **Status:** Accepted
- **Relates to:** ADR 006 (field-level encryption), ADR 007 (audit log), ADR 013 (FullCalendar)

## Context

Phase 1.6 asks for a "waiting list" so staff can capture patients who want a slot that is
currently unavailable, and for "no-show handling" beyond the existing `NOSHOW` appointment
status. We already mark appointments `NOSHOW` (status + `APPOINTMENT_NOSHOW` audit, and terminal
statuses never block rebooking). The open questions were how a waiting list should behave.

## Decision

**Waitlist lifecycle is status-driven; there is no hard delete.**

- `WaitlistEntry` (branch-scoped: `branchId`, `patientId`, optional `preferredDentist` +
  `preferredDate`, `notes`, `status`, optional linked `appointmentId`, `createdById`).
- Statuses: `PENDING → CONTACTED → BOOKED`, with `CANCELLED`/`EXPIRED` as terminal removal
  states. Staff never delete a row; they move it to a terminal state (adds history + audit).
- **One active entry per patient**: a second `PENDING`/`CONTACTED` entry is rejected with
  `409 WAITLIST_ALREADY_ACTIVE` to keep the board readable. Multiple _terminal_ entries are
  allowed (patients cycle through the list over time).
- **`BOOKED` requires a real appointment**: the caller must pass an `appointmentId` that
  exists, is in the same branch, and belongs to the same patient. The appointment itself is
  created through the normal `/api/appointments` flow (so double-booking conflict checks and
  audit still apply); the entry only links to it. This enforces "booked = actually scheduled".
- **Preferred dentist** is validated branch-scoped with role `DENTIST` (`400 UNKNOWN_DENTIST`),
  mirroring appointments.
- `notes` follow ADR 006: AES-256-GCM at rest, decrypted only on `GET /waitlist/:id`, never in
  list rows.
- Audit events `WAITLIST_CREATE/UPDATE/BOOK/CANCEL` use `targetType: PATIENT` with
  `metadata.waitlistEntryId` — the AuditTarget enum does not grow a `WAITLIST` value (the
  patient is the entity that matters).
- **No-show stats are derived, not stored**: `GET /api/patients/:id` returns `noShowCount` and
  `noShowRate = noShow / (noShow + completed)` (0–1). Pending/cancelled visits never count as a
  resolved visit. No denormalized counter to keep in sync; the derivation is a two-`COUNT()`
  query on appointments and is reflected live after every status transition.

## Consequences

- Patient-facing and admin UX stays consistent: a patient can be on the list, contacted, booked
  (linked to a real calendar event), or removed — never half-deleted.
- The `appointmentId` uniqueness on `WaitlistEntry` is a `@unique` scalar-backed relation with
  `ON DELETE SET NULL`, so deleting the appointment unlinks the entry instead of blocking.
- Lists need `branchId`-first composite indexes (`[branchId, status, createdAt]`,
  `[branchId, dentistId, status]`) which are included in the migration.
- Derived no-show stats cost two counts per patient-detail read; fine at this scale and avoids
  write-path complexity. Revisit with the Phase 2/3 reporting if needed.
