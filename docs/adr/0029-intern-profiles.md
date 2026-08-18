# ADR 029 — Intern profiles

- **Date:** 2026-08-18
- **Status:** Accepted
- **Relates to:** ADR 027 (staff directory — interns are `INTERN` users), ADR 028
  (attendance — intern hours are derived from it), ADR 007 (audit — new
  `INTERN_*` actions + `INTERN` target), ADR 020/022 (HR/finance-desk RBAC precedent)

## Context

Phase 4.3 adds the intern management layer the roadmap calls for (school, hours, mentor,
rotation). Interns already exist as `User` rows with `role = INTERN` (ADR 027) and their
clocked time already lives in `AttendanceLog` (ADR 028). What is missing is the **placement
context**: which school they come from, what rotation they are on, who mentors them, what
their contractual hour target is, and over which window those hours count. Two design
questions:

1. **Stored vs derived hours.** The roadmap lists "hours" as part of intern management, but
   every worked minute is already in `attendance_logs`. Storing a completed-hours counter
   would be a second source of truth that drifts; deriving it on read keeps one source.
2. **Who administers.** Staff management (ADR 027) is ADMIN-only; attendance reads are open
   to the read trio. Intern supervision is a dentist's job and payroll needs the numbers, so
   the reader set must include the accounting desk without opening clinical doorways.

## Decision

**A single `InternProfile` row per intern, storing only the placement facts**:
`internId` (unique, the `INTERN` user), `school`, `requiredHours` (the contractual target,
whole hours), `rotation` (fixed `InternRotation` enum — consultation/surgery/care/hygiene/
prosthetics-ortho/imaging, mirroring the service-catalog enums), `mentorId` (a `DENTIST` in
the branch — supervision is a clinical act), `startDate`/`endDate` (Postgres `DATE`, bounding
the counting window), `notes`, `active` (soft deactivate, matching the no-delete philosophy).

**Hours are derived on read from attendance** (ADR 028): `completedMinutes` = Σ closed
`AttendanceLog.workedMinutes` for the intern whose `date` falls inside
`[startDate, endDate ?? today]`; `progressPct` = `completedMinutes / (requiredHours × 60)`,
**not capped** (an intern can over-perform). The derivation is a pure, unit-tested
`internMath.ts` module (no Prisma) plus one batched query per page in the route — the whole
page's logs are fetched in a single `findMany` bounded by the earliest start/latest end, then
split per profile. Stored state stays minimal and payroll (4.4) can recompute everything from
the same two tables.

**RBAC follows the finance-desk precedent (ADR 020/022), not the clinic desk**: reads
(`GET /`, `GET /meta`) open to **ADMIN + ACCOUNTANT** (payroll desk), writes
(`POST /`, `PATCH /:id`) **ADMIN only** — same shape as expenses, and dentists/receptionists
are excluded because intern placement is HR data, not clinical workflow. Mentors must be
`DENTIST`s in the branch (`400 UNKNOWN_MENTOR`); creating a profile for a non-`INTERN` user is
`404 NOT_FOUND`, a second profile for the same intern is `409 INTERN_PROFILE_EXISTS`, and an
inverted window is `422 END_BEFORE_START` (guarded by `internMath`).

**No DELETE**: corrections are edits, deactivation is `active = false` — consistent with staff
and the no-hard-delete philosophy. Writes are audited (`INTERN_CREATE`/`INTERN_UPDATE`, target
`INTERN`, updates with before/after).

## Consequences

- One canonical source of placement data feeds 4.4 payroll (required vs completed hours per
  intern) and the 4.3 admin screen; nothing to reconcile against attendance.
- The accounting desk can see intern progress without touching staff management (still
  ADMIN-only), and interns cannot edit their own records.
- The seed gives the sole demo intern (Rayan) a profile with the dentist as mentor and a
  counting window that makes his derived progress non-zero and realistic.
- Rotation is a closed enum; new departments require a migration, same trade-off as every
  other fixed enum in the schema.
