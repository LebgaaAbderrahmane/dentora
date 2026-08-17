# ADR 024 — Stock ledger: movements journal, derived stock, batch + expiry

- **Date:** 2026-08-17
- **Status:** Accepted
- **Relates to:** ADR 022 (products, transitional stored quantity), ADR 023 (purchase receipts,
  the first "in" movements), ADR 018 (snapshot/immutable precedent), ADR 014 (derived figures),
  ADR 007 (audit)

## Context

Phase 3.3 closes the stock story promised by ADR 022/023: the product's `quantityOnHand` was a
transitional stored field so 3.1/3.2 could ship a stock number and let purchase receipts move
it. This milestone replaces that with a **stock ledger** — an append-only journal of every unit
that enters or leaves stock — and adds **batch + expiry** capture on inward movements so the
3.4 expiry/low-stock alerts and 3.5 treatment consumption have a defensible trail. The ledger
must open the 3.2 receipts without rewriting them (ADR 023's closing consequence).

## Decision

**Stock is a movement journal, `StockLedgerEntry`.** Every change to inventory is one immutable
row: `type` (`OPENING | IN | OUT | ADJUST`), `quantity` (whole, ADR 017), the affected
`productId`, optional `batch`/`expiryDate` (inward movements), optional `reason` (required for
OUT/ADJUST), optional `unitCostDZD` (captured from the PO line on receipts), optional
`purchaseOrderId` linking receipts back to the ADR 023 document, and `createdById`. Rows are
append-only — there is no edit or delete, matching the invoice-line immutable precedent
(ADR 018); corrections are new movements.

**`quantityOnHand` stays, but becomes a ledger-synced value.** The stored column is kept so the
read contract and UI never change (ADR 022), and every write updates it **inside the same
transaction** that appends the ledger row. Its invariant is always `Σ ledger = quantityOnHand`.
The invariant is established by the migration, which inserts one `OPENING` row per existing
product equal to its current `quantityOnHand`, then enforced by every new write.

**Movement semantics.** `OPENING` and `IN` add; `OUT` subtracts (magnitude, with a reason);
`ADJUST` is signed — positive adds (manual in / stock-up), negative subtracts (loss, damage,
count correction). `OUT` and any negative adjustment refuse to go below zero
(`400 INSUFFICIENT_STOCK`). `ADJUST` allows positive lots with optional `batch`/`expiryDate`
(donations, corrections of a batch).

**Receipts become the "in" side.** The 3.2 receive endpoint now appends one `IN` row per
received line in the same transaction that increments `quantityOnHand`, capturing
`unitCostDZD`, `purchaseOrderId` and the optional `batch`/`expiryDate` supplied at receive
time (contract extended, defaults batchless). No separate money ledger: cost flow continues via
`Expense` (ADR 020/023).

**RBAC mirrors ADR 022.** Ledger reads go to the clinical trio + ACCOUNTANT (same as products);
movements (out/adjust) are written only by the finance/management desk (ADMIN + ACCOUNTANT).
Purchase receipts keep their existing PURCHASE_ORDER_RECEIVE audit row carrying per-line
movements (ADR 023). Manual movements get their own audit: `STOCK_OUT`, `STOCK_ADJUST`
(`AuditTarget.PRODUCT` with before/after quantities, reason, batch/expiry).

## Consequences

- Every unit of stock is explainable by a journal row; a bad count is fixed by an adjustment,
  never by rewriting history.
- 3.4 expiry alerts read open lots (positive IN/ADJUST minus subsequent OUT/negative ADJUST)
  from the same journal; 3.5 treatment consumption is an OUT with a reason.
- The migration backfills OPENING rows, so the ledger and the stored quantity agree on day one
  without data drama.
