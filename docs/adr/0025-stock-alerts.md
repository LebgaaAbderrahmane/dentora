# ADR 025 — Low-stock & expiry alerts: derived on read from the stock ledger

- **Date:** 2026-08-18
- **Status:** Accepted
- **Relates to:** ADR 024 (the ledger these alerts read), ADR 022 (reorderLevel +
  transitional stored quantity), ADR 021 (derived figures precedent), ADR 015 (read-time KPIs)

## Context

Phase 3.4 fires the alerts promised since 3.1: **which products are running low** and **which
lots are about to expire**. The data already lives in the catalog (`reorderLevel` +
`quantityOnHand`, ADR 022) and in the stock ledger (batches + expiry dates on inward
movements, ADR 024). The question is where the alert logic lives and how "remaining per lot"
is computed when the ledger's `OUT`/negative-`ADJUST` rows are batchless.

## Decision

**Alerts are derived on read — no new tables, no stored flags.** Following the derived-figure
precedent (ADR 021/015), a `GET /api/alerts?horizonDays=30` computes everything at request
time. There is nothing to become stale or drift.

**Low stock is a catalog rule.** An active product alerts when
`reorderLevel > 0 && quantityOnHand <= reorderLevel` — the same `<=` as the 3.1 client badge,
plus a `reorderLevel > 0` guard so products with no configured threshold (typically zero-stock
new rows) don't spam the alert feed.

**Expiry is a FIFO read over open lots.** "Remaining per batch" is the hard part because
consumption rows don't carry a batch. We approximate consumption as **first-expiry-first-out**:
per product, the lots with a batch + expiry date are the pool, consumption
(`Σ OUT + Σ negative ADJUST`) is drained from the soonest-expiring lot first, batchless
incoming lots act as the tail of the pool. A lot alerts when `remaining > 0` and its expiry
falls inside `(now, now + horizonDays]`; already-expired lots with stock are flagged
`expired`. The invariant from ADR 024 (`Σ ledger == quantityOnHand`) makes the totals exact —
only the lot-level split is an approximation, and FEFO is the defensible one for a clinic.

**RBAC matches the stock reads (ADR 022): clinical trio + ACCOUNTANT.** Reorder points and
expiry are management-sensitive stock data, the same audience that already reads
`/api/products` and `/api/stock`. No per-read audit (catalog data, not PHI).

## Consequences

- Alerting never goes stale; a movement is reflected the moment it is committed.
- The FIFO split is an approximation documented in code — exact lot accounting would require
  batch on every consumption row, which 3.5 may introduce; until then FEFO is conservative for
  expiry risk.
- 3.4 adds zero schema; the only new surface is the read route and its contracts.
