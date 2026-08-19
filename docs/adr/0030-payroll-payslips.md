# ADR 030 — Payroll payslips

- **Date:** 2026-08-19
- **Status:** Accepted
- **Relates to:** ADR 028 (attendance — worked minutes are derived from it), ADR 029
  (intern profiles — intern payslips reuse the same derivation), ADR 007 (audit — new
  `PAYROLL_*` actions + `PAYROLL` target), ADR 017 (whole-DZD money), ADR 020/022/029
  (finance-desk RBAC precedent)

## Context

Phase 4.4 adds payroll: monthly payslips for staff (base salary + bonus − deductions = net).
The two building blocks already exist: every worked minute is in `AttendanceLog` (ADR 028) and
intern hour targets are derived from it (ADR 029). What payroll needs is the **compensation
facts** — base, bonus, deductions, period, and a note — plus a way to see derived net and
worked minutes per period. Three design questions:

1. **Stored vs derived amounts.** The money components are compensation facts a bookkeeper
   types in, so they are stored. But `netDZD` is pure arithmetic (`base + bonus − deductions`)
   and `workedMinutes` is pure derivation from attendance — storing either would create a
   second source of truth that drifts when a record is edited. Both are derived on read.
2. **Negative net.** A payslip whose deductions exceed base + bonus is a data-entry mistake.
   Rather than storing a signed net, the write path refuses it (`422 NEGATIVE_NET`) so net is
   always `>= 0` by construction.
3. **Who sees payroll.** Compensation is sensitive HR/finance data — the accounting desk must
   read it, but it is not a clinical workflow. Same shape as expenses/interns: reads
   ADMIN + ACCOUNTANT, writes ADMIN only.

## Decision

**A single `Payslip` row per staff member per period**, storing only the compensation facts:
`staffId` → a branch `User` (ADMIN/DENTIST/RECEPTIONIST/ACCOUNTANT/INTERN — anyone paid, not
patients), `periodStart`/`periodEnd` (Postgres `DATE`), `baseDZD` (required), `bonusDZD` /
`deductionsDZD` (default `0`), `notes`, `voidedAt` (soft void, matching the no-delete
philosophy), and `createdById` (who wrote it). A unique constraint
`[branchId, staffId, periodStart, periodEnd]` makes re-posting the same period a
`409 PAYSLIP_EXISTS`.

**Net and worked minutes are derived on read**: `netDZD = baseDZD + bonusDZD − deductionsDZD`
and `workedMinutes` = Σ closed attendance logs for that staff member whose `checkOut` falls
inside `[periodStart, periodEnd]` — the same derivation as interns (ADR 029), extracted into a
pure, unit-tested `payrollMath.ts` (`payrollDateError`, `payCheckError`, `payslipNetDZD`,
`payslipWorkedMinutes`) plus one batched `findMany` per page bounded by the window extremes.
Money is whole DZD ints (ADR 017), capped at `MAX_PAYROLL_AMOUNT_DZD`.

**RBAC follows the finance-desk precedent (ADR 020/022/029)**: reads (`GET /`, `GET /meta`)
open to **ADMIN + ACCOUNTANT**, writes (`POST /`, `PATCH /:id`, `POST /:id/void`) **ADMIN
only**. A payslip for a non-staff/non-branch user is `404 NOT_FOUND`, an inverted period is
`422 PERIOD_END_BEFORE_START`, deductions over base+bonus is `422 NEGATIVE_NET`, re-posting an
existing period is `409 PAYSLIP_EXISTS`, and voiding an already-voided slip is
`409 ALREADY_VOIDED`.

**No DELETE**: corrections are edits, retirements are voids (`voidedAt` set, row retained for
history) — consistent with staff, invoices and the no-hard-delete philosophy. Writes are
audited (`PAYROLL_CREATE`/`PAYROLL_UPDATE`/`PAYROLL_VOID`, target `PAYROLL`, updates with
before/after).

## Consequences

- One canonical source of compensation facts; net and worked minutes can always be recomputed
  from `payslips` + `attendance_logs` (reused by the future payslip PDF/export).
- `netDZD >= 0` is guaranteed by the write guard, so the whole money pipeline stays unsigned.
- The accounting desk can read payroll without touching ADMIN-only staff management; dentists
  and receptionists never see compensation.
- The seed creates four realistic payslips (dentists, accountant, receptionist) for the last
  30 days, so the demo shows non-zero derived worked minutes next to net.
