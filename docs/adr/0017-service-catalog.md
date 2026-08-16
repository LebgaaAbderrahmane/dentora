# ADR 0017 — Service catalog: flat whole-DZD prices, pricing is management-only

- **Date:** 2026-08-16
- **Status:** Accepted
- **Relates to:** ADR 003 (single clinic), ADR 007 (audit), ADR 014 (derived figures),
  ADR 015 (dashboard revenue deferred to Phase 2)

## Context

Phase 2.1 starts billing/finance with the service catalog. It must be branch-scoped
(single-clinic today, multi-branch later — ADR 003), cheap to build, and priced in DZD.
Two decisions shape everything that touches money afterwards, so they are pinned here
rather than discovered mid-invoice:

1. **Currency precision** — Algerian dinar quotes almost never carry centimes in clinic
   practice; prices are whole dinars.
2. **Who may touch pricing** — catalog prices feed quotations now and invoice lines in 2.2,
   so they are management-sensitive.

## Decision

**`priceDZD` is a whole-dinar integer, `Int`, with no sub-unit precision.** Invoice lines
(2.2), payments / partial payments and refunds (2.3) all inherit this: the smallest unit is
one DA. This matches real-world quoting and avoids a whole currency-precision migration
later. A `durationMinutes` integer and a `reimbursablePct` (0–100, CNAS/CASNOS convention
style) ride along — duration is _recorded_ now and reserved for scheduling/availability in
Phase 2+; coverage steers patient-facing cost estimates.

**Write access to the catalog is ADMIN-only** (`requireRole('ADMIN')`); the clinical trio
(ADMIN/DENTIST/RECEPTIONIST) reads — dentists quote treatment plans from it, receptionists
answer cost questions at check-in. Consistent with this, the admin nav exposes **Catalogue**
to the same trio as a read-only table, and create/edit/archive/restore controls render only
for ADMIN. No audit-VIEW noise: catalog rows are not patient data (ADR 007 stays reserved
for people/PHI + money mutations), but every create/update/archive/restore is audited with
`AuditTarget.SERVICE` and `SERVICE_CREATE/UPDATE/ARCHIVE/RESTORE`.

**Archive over delete** matches patients/waitlist: `archivedAt` hides a service from the
default list without breaking future references, and restore is a supported action.

**Price snapshotting (2.2 clause).** When invoices exist, `service.priceDZD` becomes a
_reference price only_. Invoice lines must capture their own price at booking time, so
changing the catalog never retroactively alters historical invoices/payments. The snapshot
`priceDZD` constraint (`>= 0`, integer) intentionally matches the catalog field, so a drifted
line value from before the redesign cannot exceed the invoice domain someday.

## Consequences

- No cents anywhere: `Int` DA everywhere money moves; formatting appends `DA` (fr) / `DA` (en)
  / `دج` (ar).
- Non-admin clinical staff see prices and durations but can never mutate them — API and nav
  gating agree (fixed before this ADR, not patched later).
- 2.2 must snapshot, never re-derive, invoice-line prices from the live catalog.
- No seed data: the clinic populates its own catalog through the admin UI.
