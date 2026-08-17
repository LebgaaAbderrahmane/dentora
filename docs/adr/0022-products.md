# ADR 022 — Products & stock basics: fixed categories/units, ADMIN+ACCOUNTANT bookkeeping

- **Date:** 2026-08-17
- **Status:** Accepted
- **Relates to:** ADR 017 (fixed enum + whole-dinar), ADR 020 (finance-desk RBAC), ADR 015
  (derived figures), ADR 007 (audit), ADR 003 (single clinic)

## Context

Phase 3.1 opens the stock domain: the clinic's **products** — consumables, instruments,
medications, materials — with categories, units of measure, and reorder levels. The roadmap
sequences it deliberately: 3.1 is the **catalog**; 3.3 adds the stock ledger (in/out/adjust,
batch + expiry); 3.4 low-stock/expiry alerts; 3.5 treatment-stock consumption. The design must
leave room for those without blocking 3.1 behind them.

## Decision

**Categories and units are fixed enums.** `ProductCategory` (`ANESTHETICS | DISPOSABLES |
MATERIALS | INSTRUMENTS | EQUIPMENT | MEDICATIONS | LABORATORY | STATIONERY | OTHER`) and
`ProductUnit` (`UNIT | BOX | PACK | BOTTLE | JAR | SYRINGE | SET | KIT`) mirror the
service/expense precedent (ADR 017/020). A clinic does not invent categories or units
day-to-day; rigid sets keep 3.4 alerts and 3.5 consumption reporting stable. Values change only
via migration.

**A product is a branch-scoped catalog row**: `name`, optional `code` (internal SKU, unique per
branch), `category`, `unit`, `reorderLevel` (Int ≥ 0, default 0), `archivedAt` soft-delete,
`createdById`. `quantityOnHand` is **stored in 3.1 as a transitional field** so the UI already
shows a stock number and a low-stock badge — **3.3 replaces it with a ledger-derived figure**
(opening the 3.1 value as an opening-balance ledger row), the same incremental "start stored,
become derived" trajectory 2.2 → 2.3 used for invoice status. Nothing else from the ledger,
batch or expiry is pulled forward.

**RBAC — read for the clinical trio + ACCOUNTANT, write ADMIN + ACCOUNTANT.** Stock levels and
reorder points are management-sensitive; the finance/management desk owns the books
(purchasing follows in 3.2), clinical roles consume stock read-only. This mirrors expenses
(ADR 020) rather than the ADMIN-only service catalog (ADR 017), because purchasing and
stock-taking are ACCOUNTANT work in a small clinic.

**Audit on every write** (`PRODUCT_CREATE/UPDATE/ARCHIVE/RESTORE`, `AuditTarget.PRODUCT`, with
name/category/quantity metadata; `PRODUCT_UPDATE` carries before/after). Catalog reads are not
PHI and are not audited (matches services/catalog convention).

## Consequences

- 3.1 ships the catalog + on-hand number + reorder level with a low-stock badge; 3.3 converts
  stored quantity to ledger-derived without touching the UI contract.
- Whole integers everywhere (quantities, reorder levels) — no fractional stock units.
- Accountants and admins manage the book; dentists and receptionists see it read-only.
- Audit trail for every product change, ready for 3.4 alerting decisions.
