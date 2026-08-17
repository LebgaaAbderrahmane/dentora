# ADR 020 — Expenses & categories: a fixed category enum, editable corrections, soft void

- **Date:** 2026-08-17
- **Status:** Accepted
- **Relates to:** ADR 017 (whole-dinar `Int` prices), ADR 015 (derived figures), ADR 007 (audit),
  ADR 003 (single clinic)

## Context

Phase 2.4 adds the money a clinic spends: salaries, rent, consumables, equipment, utilities,
marketing, maintenance, taxes. Expenses differ from the 2.2/2.3 money model in one fundamental
way: an invoice or a payment is a transaction **between two parties** — immutable, reversed by
void/refund. An expense is a **discretionary journal entry** the practice manager records and
often corrects (typo in the description, wrong category, adjusted amount). Yet it feeds the same
derived sums (2.5 close-out and P&L), so it must keep an audit trail and never quietly vanish
from history.

Two open questions inherited from the roadmap: how are "categories" modeled, and is an expense
mutable?

## Decision

**Categories are a fixed enum `ExpenseCategory`** (`SALARY | RENT | SUPPLIES | EQUIPMENT |
UTILITIES | MAINTENANCE | MARKETING | TAXES | OTHER`), mirroring `ServiceCategory` (ADR 017).
A clinic does not invent categories day-to-day; a rigid set keeps 2.5 reporting stable and the
summary rows predictable. Values can only change via a migration.

**An expense is editable but never hard-deleted.** `PATCH` corrects description/category/amount/
date — every change is audited (`EXPENSE_UPDATE` with before/after metadata). Removing an expense
from the sums is done by voiding it (`voidedAt`, `EXPENSE_VOID`), the same soft terminal state as
invoices — a voided expense disappears from all totals (2.5) but stays in the audit trail.
There is no `DELETE /api/expenses`. This trades a little strictness for the operability a
practice manager needs while keeping every dinar accountable.

**Money stays whole-dinar `Int` (ADR 017)**; `incurredAt` (not `createdAt`) is the date an
expense belongs to, so 2.5 can close a day/month of expenses independent of when they were
typed in. Sums by category and window are derived on read (ADR 015) — a pure `expenseSums`
helper aggregates rows, ready for the P&L.

**Who books expenses.** Only the finance desk: **ADMIN + ACCOUNTANT read and write**. Dentists
and receptionists collect revenue but do not record the clinic's costs; the ACCOUNTANT gets a
real management role here (it stays read-only on invoices/payments where the money desk is
ADMIN/RECEPTIONIST). The admin nav exposes **Dépenses** to ADMIN+ACCOUNTANT and hides it from
everyone else — nav and API RBAC agree.

## Consequences

- Reporting (2.5) sums live expenses by category and window with a single derived query.
- A wrong expense is corrected in place with full before/after audit — no void+repost ceremony.
- An expense that should never have existed is voided, not deleted; totals exclude it.
- Accountants manage the book directly; no clinical role can see or alter costs.
- Only whole dinars from form to sums, consistent with every Phase 2 value.
