# ADR 021 — Finance report: derived cash P&L + daily close-out

- **Date:** 2026-08-17
- **Status:** Accepted
- **Relates to:** ADR 019 (payments, derived paid amount), ADR 020 (expenses, derived sums),
  ADR 015 (derived figures), ADR 014 (derived stats), ADR 003 (single clinic)

## Context

Phase 2.5 closes the billing track: the practice manager needs (a) a **daily cash close-out** —
what the desk actually collected today, broken down by payment method so the physical drawer
reconciles — and (b) a **P&L report** for a window — revenue vs. expenses vs. net. All the
source data already exists: `payments` (RECEIPT/REFUND, `method`, `amountDZD`, `receivedAt`) and
`expenses` (`category`, `amountDZD`, `incurredAt`, `voidedAt`). Following ADR 014/015, nothing
new is stored — the report is derived on read.

## Decision

**Cash basis, not accrual.** Revenue = net receipts in the window: Σ(RECEIPT) − Σ(REFUND) by
`receivedAt`. A close-out is about cash actually in the drawer; invoiced-but-unpaid amounts are
an accounts-receivable concern for later, not today's P&L. Refunds reduce revenue in the period
they occur.

**One endpoint, one shape.** `GET /api/finance/report?from&to` returns:

- `revenue` — `receiptsDZD`, `refundsDZD`, `netDZD`, and `byMethod` net per method
  (`CASH | CHEQUE | CARD | TRANSFER`) so the drawer reconciles per tender type.
- `expenses` — `totalDZD`, `count`, `byCategory` (all nine fixed categories from ADR 020).
- `netDZD` = revenue net − expenses total.
- `days` — the per-day series for the window, each with receipts/refunds/revenue/expenses/net.
  This IS the daily close-out; the summary is the P&L for the same window.

**Windows and day boundaries.** `from`/`to` are absolute-instant ISO strings, optional (default:
the server-local today — i.e. the endpoint is a close-out out of the box). Day buckets are fixed
24-hour steps from `from`, so the API stays timezone-agnostic: a client asking for local-day
buckets passes local midnight → midnight instants (Algeria is UTC+1 year-round, no DST, so
24-hour steps from local midnight align exactly with local calendar days). This is the same
convention the dashboard windows already use.

**Who sees it.** ADMIN + ACCOUNTANT only — the same finance desk as expenses (ADR 020). Clinical
roles never see the clinic's costs. There is no per-read audit: the report is aggregate, not
PHI, matching the dashboard/catalog convention; the underlying invoice/patient details are
already gated by their own routes.

**Derived in memory.** The window's payments and live expenses are fetched (branch-scoped) and
aggregated in pure, prisma-free helpers in `lib/finance.ts` (`revenueStats`, `dayGrid`,
`dailySeries`) — CI-testable and reused by the admin UI. Volume is single-clinic (ADR 003), the
same in-memory reasoning as the 2.3 invoice-status matching.

## Consequences

- The close-out and P&L always reflect the data — the DoD of Phase 2 is met with zero denormalized
  counters.
- A voided expense (ADR 020) drops out of the P&L; a refund drops out of the day's revenue.
- The UI (ADMIN+ACCOUNTANT) gets period presets (today/this month/last month/last 30 days +
  custom), revenue/expense/net KPIs, per-method and per-category breakdowns, and the daily table.
- No new table, no new audit action, no migration. Accrual/accounts-receivable stays future work.
