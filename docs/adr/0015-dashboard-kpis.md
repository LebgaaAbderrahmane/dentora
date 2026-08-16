# ADR 0015 — Dashboard KPIs: derived on read; revenue/low-stock deferred

- **Date:** 2026-08-16
- **Status:** Accepted
- **Relates to:** ADR 014 (derived no-show stats), ADR 013 (FullCalendar range convention)

## Context

Phase 1.7 asks for dashboard KPIs: today's visits, revenue, no-shows, and low-stock alerts.
The admin already has a post-login dashboard stub (0.8) that only reads `/api/system/status`.
Two of the four requested KPIs cannot be computed today: **revenue** requires the invoicing
domain (Phase 2 — no invoice/payment models exist) and **low-stock alerts** require the
inventory domain (Phase 3 — no product/stock models exist). Building placeholders or manual
data entry now would be speculative.

## Decision

**One read-only aggregate endpoint, everything derived on read, revenue/low-stock absent.**

- `GET /api/dashboard/kpis` (ADMIN/DENTIST/RECEPTIONIST, branch-scoped).
- **Derived, never stored** — same reasoning as the patient no-show stats in ADR 014: the
  endpoint counts from `appointments`/`waitlist_entries`/`patients` on every read. No
  denormalized counters to keep in sync.
- **Client-supplied absolute-instant windows** (`from`, `to`, `windowStart`) so the API is
  timezone-agnostic, mirroring how the calendar already sends date ranges (ADR 013). The admin
  passes its local "today" and a 30-day lookback.
- Today's visits: `total` + `byStatus` over the window; `upcoming` = today's
  PENDING/CONFIRMED/COMPLETED appointments from the server clock on, sorted, capped at 10.
- No-show: count today + trailing-30-day rate reusing the ADR 014 `noShow/(noShow+completed)`
  formula so there is exactly one definition of a no-show rate.
- Waitlist: `active` = PENDING + CONTACTED entries. Patients: non-archived total + new-created
  within the window.
- **`revenue` and low-stock alerts are not in the response.** They are deferred to Phases 2/3;
  the UI adds those cards when the source domains exist. No placeholder or fake-data fields are
  shipped.
- No audit event for dashboard reads — consistent with other aggregate/list reads (only
  detail views are audited).

## Consequences

- The response is deterministic given the same windows; "today" is what the client's timezone
  says it is, exactly like the calendar.
- Query set is cheap and index-backed: `appointments` has `[branchId, startAt]` /
  `[branchId, status, startAt]`, and per-branch `patients`/`waitlist_entries` counts are
  prefixed by `branchId`.
- No-show rate semantics stay identical between the patient detail line and the dashboard.
- When Phase 2/3 land, the schema and UI are extended in place; the endpoint will not need a
  rename or a version bump.
