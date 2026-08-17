# ADR 023 — Suppliers & purchase orders: finance-desk book, status-driven

- **Date:** 2026-08-17
- **Status:** Accepted
- **Relates to:** ADR 022 (products, the ledger that receipts feed), ADR 020 (expenses,
  finance-desk RBAC), ADR 017 (whole dinars + fixed enums), ADR 018 (derived totals),
  ADR 007 (audit)

## Context

Phase 3.2 builds purchasing on top of the 3.1 product catalog: a **supplier** directory and
**purchase orders (POs)** — the documents that record what a clinic orders and what actually
arrives. The immediate consumer is 3.3's stock ledger (receipts become the "in" side), so the
PO must capture, per line, how much of each ordered item has been received. Money is involved
(unit prices), so the same management discipline that expenses (ADR 020) and invoices
(ADR 018/019) carry applies here: immutable history once received, derived totals, full audit.

## Decision

**The procurement desk is ADMIN + ACCOUNTANT only** — POs are read _and_ written exclusively by
the finance/management desk, exactly like expenses (ADR 020). Clinical roles never see
purchasing costs; they consume stock through the product/stock view (which stays read-only for
them, ADR 022). This is deliberately stricter than the product catalog (where the clinical
trio reads stock levels).

**PO lines are snapshots, like invoice lines (ADR 018).** Each line copies `productName` +
`unit` from the product at order time; changing the product catalog never rewrites an order.
`productId` is kept for traceability, and `product` is referenced with `Restrict` so an order
always points at a real product.

**Status is stored as one column and derived transitions are enforced at write time.**
`PurchaseOrderStatus` = `DRAFT | ORDERED | PARTIALLY_RECEIVED | RECEIVED | CANCELLED`. Created
as `ORDERED` (`orderedAt` default now); a `POST /:id/receive` bumps per-line `receivedQuantity`
and re-derives the status (any receipts but not all ⇒ `PARTIALLY_RECEIVED`, all ⇒ `RECEIVED`

- `receivedAt`). `CANCELLED` is only reachable while **nothing has been received** (money-safe
  parallel to invoices refusing void while paid, ADR 018/019). A PO with any receipt or a
  `CANCELLED`/`RECEIVED` status is **locked** — header edits return 400 `ORDER_LOCKED`, matching
  expenses' frozen-after-void rule (ADR 020).

**Receipts move stock.** Each received quantity **increments `Product.quantityOnHand`** in the
same transaction. This is the transitional stored quantity (ADR 022): 3.3 will open these
movements as ledger rows and derive stock from the ledger. Nothing from batch/expiry is pulled
forward (their ADR lives with 3.3).

**Totals are derived, never stored (ADR 014/018):** `totalDZD = Σ unitPriceDZD × quantity`,
whole dinars (ADR 017). There is no money ledger for purchasing separate from expenses; the P&L
continues to book costs via `Expense` entries (2.5).

**Audit every state change**: `SUPPLIER_CREATE/UPDATE/ARCHIVE/RESTORE` and
`PURCHASE_ORDER_CREATE/UPDATE/RECEIVE/CANCEL`, with supplier/order metadata (reference, status,
totals, per-line received quantities). Reads are not PHI and not audited (catalog convention).

## Consequences

- POs are immutable once a receipt exists; corrections are new receipts or a re-issued order.
- Purchasing stays inside the finance desk's audit trail end-to-end.
- 3.3's ledger opens stock movements from 3.2 receipts without rewriting this milestone.
- Suppliers and orders are branch-scoped; supplier names unique per branch (`NAME_TAKEN`).
