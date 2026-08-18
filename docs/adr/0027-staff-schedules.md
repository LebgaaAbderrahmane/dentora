# ADR 027 — Staff directory & weekly availability

- **Date:** 2026-08-18
- **Status:** Accepted
- **Relates to:** ADR 007 (audit — new `STAFF_*`/`SCHEDULE_UPDATE` actions), ADR 0015
  (derived-on-read precedent), ADR 022 (RBAC precedent), ADR 008 (roles enum),
  the `/api/users` ADMIN surface from Phase 0

## Context

Phase 4.1 starts the HR track: the clinic needs a real **staff directory** (create, edit,
deactivate, reset password — today `POST/users`-style management does not exist, only
role-change + session-revocation) and a **recurring weekly availability** template per staff
member that 4.2 (attendance) and 4.4 (payroll hours) will build on. Two design questions:

1. Management of `User` rows is currently split: `/api/users` only patches role and revokes
   sessions. Where do create/update/deactivate/password-reset live, and who may do them?
2. What shape is a weekly schedule — a 7+ slot recurring template stored as rows, or a
   date-keyed calendar of shifts (attendance)? And how should slot writes behave?

## Decision

**Staff CRUD lives on `/api/staff`, ADMIN-only, branching the existing `/staff/dentists`
roster.** The `User` model already is the staff record (branch-scoped, `active`, roles incl.
`INTERN`); we do not add a separate `Staff` table. `GET /api/staff` returns the branch's
non-`PATIENT` users (`ADMIN | DENTIST | RECEPTIONIST | ACCOUNTANT | INTERN`) with
search/role/active filters, `POST /` creates a staff account (bcrypt, unique email →
`409 EMAIL_IN_USE`), `PATCH /:id` edits name/email/role/active — **a role change revokes all
of the target's sessions** (existing `/users/:id/role` semantics) and forces logout if the
actor edits their own role — and `POST /:id/reset-password` sets a fresh password and revokes
sessions. The public `/dentists` subset stays open to the clinical desk for dropdowns
(`active: true` only now). Every write is audited (`STAFF_CREATE`/`STAFF_UPDATE`/
`STAFF_PASSWORD_RESET`, target `USER`).

**A weekly schedule is a recurring template: one `StaffSchedule` row per weekday slot** —
`branchId + staffId + weekday + startTime/endTime (HH:mm) + active`. Times are local clinic
time stored as `HH:mm` strings (the clinic is single-timezone, Algeria UTC+1; ISO instants
add no information for a weekly template). Writes are **bulk-replace**: `PUT /api/staff/:id/schedules`
accepts the whole template, validates through the pure `scheduleMath` module (each row is
`HH:mm`, `end > start`, and **no overlapping or touching slots on the same weekday**), then
deletes + recreates atomically. An empty template is valid (it clears availability — a staff
member may simply have none yet). The API resolves the slot gap (a day with two half-days) by
allowing multiple rows per weekday; the 4.1 admin editor presents one slot per day for
simplicity. Concurrency is safe because replace is idempotent and reads are by `staffId`.

**Validation is pure and unit-tested** (`lib/scheduleMath.ts`): `isHhMm`, `timeToMinutes` /
`minutesToTime`, `validateScheduleRows` (normalize → per-row sanity → per-weekday overlap),
independent of Prisma, mirroring `sterilizationMath`/`stockMath`.

## Consequences

- Staff management is finally ADMIN-only, audited, and branch-scoped; role/session semantics
  stay consistent with `/users`.
- A single stable shape (`staff_schedules`) feeds 4.2 attendance (assert against template)
  and 4.4 payroll (sum worked hours per staff) without schema churn.
- Multiple slots per weekday are supported by the API but not by the 4.1 editor — a known
  simplification to revisit when attendance needs real shift coverage.
- Empty-template clearing is explicit; there is still no hard delete of staff (deactivate via
  `active`), matching the no-delete philosophy of patients/ledger.
- Seed now writes 27 weekly rows across the 6 demo staff (invariant re-verified).
