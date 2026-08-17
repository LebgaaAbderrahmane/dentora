# ADR 019 — Payments & refunds: one table, derived paid amount, refunds reverse receipts

- **Date:** 2026-08-17
- **Status:** Accepted
- **Relates to:** ADR 017 (whole-dinar `Int` prices), ADR 018 (derived status, void + re-issue),
  ADR 007 (audit), ADR 003 (single clinic)

## Context

Phase 2.3 adds the money the invoices quote: payments in **cash / cheque / card / transfer**,
partial settlements, receipts, and the flip side — refunds. Inherited hard requirements:

- ADR 017: every money value is a whole-dinar `Int`; no sub-unit precision.
- ADR 018: payment "status" is derived (`UNPAID | PARTIAL | PAID | VOID`) from a `paidDZD`
  amount that payments must feed; no stored status column; the list filter must switch from
  a `voidedAt`-only proxy to a paid-vs-total comparison.

A refund is money leaving the practice. It must be traceable to the receipt it reverses and
must never drive a derived `paidDZD` below zero. It must not require reopening immutable
billing records: payments, like invoices, are written once and never edited.

## Decision

**One `Payment` table with a `kind` discriminator (`RECEIPT` | `REFUND`). A receipt is money
in; a refund is money out — always a distinct row with a positive `Int` amount.** There is
**no `id`-condition on refunds, because the condition guaranteeing no over-refund is enforced
at write time.** `paidDZD` is always derived on read:

```
paidDZD = Σ(amountDZD WHERE kind = RECEIPT) − Σ(amountDZD WHERE kind = REFUND)
```

- `method` (`CASH | CHEQUE | CARD | TRANSFER`), `reference` (cheque/card/transfer trace), and
  `receivedAt` are captured on the receipt; a refund records the original method so the money
  path stays auditable.
- A refund **must reference the receipt it reverses** (`refundsId`, a self-relation) and its
  amount is bounded by the receipt's remaining net (`receipt.amount − Σ its refunds`). A receipt
  whose remaining net is `0` cannot be refunded again (`400 REFUND_EXCEEDS_RECEIPT`).
- **No payment on a voided invoice** (`400 INVOICE_VOIDED`). **No overpayment**: a new receipt
  may not push `paidDZD` over `totalDZD` (`400 PAYMENT_EXCEEDS_BALANCE`). Over-refund is the
  receipt bound above; the per-invoice aggregate can therefore never go negative.
- **Void is blocked while money is on the invoice** (`400 INVOICE_HAS_PAYMENTS`): refund first,
  re-issue after. This extends 2.2's void + re-issue correction flow without reopening history.

**`paidDZD` is computed per invoice via a single `groupBy` aggregate** (receipts and refunds
summed separately), attached to list/detail reads and used by the invoice `statusWhere`. The
list endpoint computes status in-memory over derived totals when a paid-dependent filter
(`UNPAID`/`PARTIAL`/`PAID`) is requested — a single clinic's invoice volume makes this
trivially cheap and keeps ADR 014's "derive, don't denormalize" stance. `VOID` stays a
pure `voidedAt` scan.

**Who touches money.** Same as invoicing: clinical trio + ACCOUNTANT read payments; create
payment and refund are `requireRole('ADMIN','RECEPTIONIST')` — the checkout desk and the admin.
Every receipt and refund is audited (`PAYMENT_CREATE`/`PAYMENT_REFUND`, `AuditTarget.INVOICE`,
metadata invoice number + amount + method + running balance), matching ADR 007.

**Not in this ADR:** receipt/refund numbering as its own sequence — receipts are identified by
their invoice number and timestamp; a dedicated receipt/refund counter can be layered on the
same settings-counter pattern as `invoiceCounter` if a future requirement asks for it.

## Consequences

- Derived `paidDZD` means ADR 018's status transition lands for free: the existing
  `invoiceStatus()` is fed real amounts and `UNPAID | PARTIAL | PAID` start resolving.
- A "receipt" is a `RECEIPT` payment row — print/PDF rendering of it is a client concern.
- Refund auditing (who, how much, which instrument, which receipt) is complete without a
  ledger-double-entry model; a later P&L/close-out (2.5) re-uses the same `groupBy`.
- Void-with-money becomes impossible, closing the "voided but collected" hole.
- One table keeps the money trail in a single derived figure; there is no balance drift.
