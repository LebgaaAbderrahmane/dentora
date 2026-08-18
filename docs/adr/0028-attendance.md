# ADR 028 — Daily attendance logs

- **Date:** 2026-08-18
- **Status:** Accepted
- **Relates to:** ADR 007 (audit — new `ATTENDANCE_*` actions + `ATTENDANCE` target),
  ADR 027 (the staff weekly template this builds on), ADR 018/022 (RBAC + no-delete
  precedents), ADR 020 (finance-desk gating precedent)

## Context

Phase 4.2 adds the attendance record that 4.4 payroll will sum: a daily **clock-in/clock-out**
for staff, tracked against the recurring weekly template from ADR 027. Three design questions:

1. **What is "present"?** A punch (check-in/check-out) in/out of a shift, or an implicit
   presence derived from the schedule? Punches are what payroll and the clinic need; the
   schedule is a plan, not a fact.
2. **What granularity?** A raw `DateTime` instant per action yields exact worked time but is
   awkward to reconcile (a punch before midnight, an extended day). A business-**date** +
   open/close pair is the mental model the clinic already uses.
3. **Who records and who may write?** The receptionist performs most of the clocking; no one
   under `RECEPTIONIST` should touch it, while accounting and admins read it for payroll.

## Decision

**A single `AttendanceLog` row per staff per business day**: `branchId + staffId + date`
(stored as Postgres `DATE` — the business day the shift belongs to) with optional
`checkIn`/`checkOut` `DateTime?` instants and `notes ≤ 500`; `@@unique([staffId, date])`
enforces the one-record-per-day invariant at the database level, and an index on
`[branchId, date]` serves range queries. A record is **open** when `checkIn` is set and
`checkOut` is null; exactly one of the two may be null at rest. `workedMinutes` is **derived
on read** by pure `attendanceMath.ts` (`attendanceWorkedMinutes` — diff truncated to whole
minutes, no Prisma import), so stored state stays minimal and there is no drift to fix.
`isOpenRecord` and `minutesToHoursLabel` (for the UI's `8h30` display) live in the same module,
tested separately. The weekly template from ADR 027 is _not_ enforced here — the clinic may
open the door outside scheduled days — but the seed keeps punches aligned with it.

**RBAC follows the finance-desk precedent (ADR 020/022-style), not the clinic desk**:
reads (`GET /`, `GET /roster`) open to **ADMIN + ACCOUNTANT + RECEPTIONIST**; writes
(`POST /`, `PATCH /:id`) are **ADMIN + RECEPTIONIST only**. Dentists and interns are excluded
from both (a clinic desk member is not HR staff), matching the rule that financial data stays
away from clinical roles. `GET /roster` returns the minimal `{id,name,role}` staff list the
attendance screen needs for its dropdown so `/api/staff` (ADMIN-only directory, ADR 027) stays
closed; it does not duplicate the dentist roster.

**No DELETE, no void**: an error is corrected by patching the punch with the actual time —
the audit trail (`ATTENDANCE_CREATE`/`ATTENDANCE_UPDATE`, target `ATTENDANCE`, update audited
with before/after) is the record of what happened, consistent with the no-hard-delete
philosophy applied since ADR 018/022. `POST /` returns `409 ATTENDANCE_EXISTS` on the
`(staffId, date)` unique, `404 UNKNOWN_STAFF` for a non-branch member; `PATCH /:id` returns
`404 UNKNOWN_ATTENDANCE`. Purely invalid times (check-out without check-in, check-out ≤
check-in) reject with `422 CHECKOUT_WITHOUT_CHECKIN`/`CHECKOUT_BEFORE_CHECKIN` instead of
mutating state.

## Consequences

- Payroll (4.4) can sum `workedMinutes` per staff per period from one normalized table, and
  attendance can be cross-checked against the ADR 027 template later if desired.
- One record per day keeps the "did X work on Y?" question trivially answerable; the unique
  constraint makes double-punching impossible rather than merely discouraged.
- The receptionist drives the flow (the nav exposes it to the read trio, edit controls to the
  write duo), keeping the directory/HR surface ADMIN-only.
- The admin UI derives today's summary (records, currently on duty, hours) from the list
  fetching the same dataset, so numbers cannot disagree across cards.
- Seed now writes 60 attendance rows (last 10 working days × 6 demo staff) with times aligned
  to the schedules; the demo shows a realistic open/closed mix for UIs to display.
