# ADR 0018 — Invoices: immutable snapshot lines, atomic per-branch numbering, derived status

- **Date:** 2026-08-17
- **Status:** Accepted
- **Relates to:** ADR 017 (whole-DZD prices + 2.2 snapshot clause), ADR 014 (derived figures),
  ADR 007 (audit), ADR 003 (single clinic)

## Context

Phase 2.2 introduces invoices + lines + numbering and a status vocabulary
(paid/partial/unpaid/void). The hard requirements inherited from ADR 017: an invoice line
must capture its own price at issue time so catalog changes never rewrite history, and every
money value is a whole-dinar `Int`. This ADR settles the invoice shape, how numbers behave in
a single-clinic deployment, and what "status" means before payments exist (Phase 2.3).

## Decision

**Lines are immutable snapshots, and invoices are never edited — they are voided and
re-issued.** `InvoiceLine` stores `serviceId?` (reference only), `serviceName`, `priceDZD`,
`quantity`; it never re-reads the catalog, and there is no `PATCH /invoices`/`PUT /invoices`.
Corrections are `POST /invoices/:id/void` + a fresh invoice. Totals are derived on read
(`Σ priceDZD × quantity`), never stored, mirroring the no-denormalized-counter stance of
ADR 014/015.

**`invoiceNumber` is an integer allocated atomically per branch**, bumped inside the settings
counter row (`branchId + key = invoiceCounter`) in its own transaction, so concurrent creates
can never collide; `@@unique([branchId, invoiceNumber])` is the backstop. Display formatting
(`#000123`, or a year prefix) is a client concern. Gaps are acceptable and expected (an
aborted create still consumes a number) — a gap is cheaper than a reused number.

**Status is derived, segmentation stored.** `voidedAt` is the only mutable status row; the
contract `status` (`UNPAID | PARTIAL | PAID | VOID`) is computed by `invoiceStatus()` from
`paidDZD`, `subtotalDZD` and `voidedAt`. Before Phase 2.3 there is no payment source, so the
paid amount is `0` and every issued, non-voided invoice is `UNPAID`. The `PARTIAL`/`PAID`
wiring is already tabled so 2.3 ("payments") only has to feed `paidDZD` in — no schema change,
no stored-status migration.

**Who bills.** The clinical trio reads invoices (they quote and book), the finance desk plus
ADMIN write: `requireRole('ADMIN','RECEPTIONIST')` on create/void. The admin nav exposes
**Factures** to ADMIN/RECEPTIONIST/ACCOUNTANT with create/void controls rendering only where
write is allowed — nav and API RBAC agree, as settled for the catalog. Written invoices and
voids are audited (`INVOICE_CREATE`/`INVOICE_VOID`, `AuditTarget.INVOICE`, metadata number +
patient + total), matching ADR 007.

## Consequences

- Catalog price edits can never alter issued invoices or (later) payments/refunds.
- No invoice editing UI; corrections are void + re-issue, which also keeps an automatic
  audit trail of the mistake.
- 2.3 payments compute `paidDZD` and status transitions for free; the status filter on the
  list endpoint (`UNPAID`/`VOID`) uses `voidedAt` today and will switch to a paid-vs-total
  join in 2.3.
- Only whole dinars everywhere; `Int` from catalog through lines to totals.
