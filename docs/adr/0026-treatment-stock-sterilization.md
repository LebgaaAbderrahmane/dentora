# ADR 026 — Treatment stock consumption & sterilization logs

- **Date:** 2026-08-18
- **Status:** Accepted
- **Relates to:** ADR 024 (the ledger consumption appends), ADR 025 (FEFO expiry — consumption
  now carries a batch), ADR 022 (catalog + RBAC precedent), ADR 018 (snapshot-at-write precedent),
  ADR 007 (audit)

## Context

Phase 3.6 closes the loop promised in the roadmap since 3.1: **per-treatment stock
consumption** (a dentist consumes catalog stock while treating a patient) and **instrument
sterilization logs** (traceability for autoclave/UV/chemical cycles). Two design questions:

1. Consumption is an `OUT` stock movement (ADR 024) — but manual `OUT`/`ADJUST` writes are the
   finance desk's book (ADMIN + ACCOUNTANT only, ADR 022), while a treatment is a clinical act
   done by the dentist/receptionist at the chair. Who writes it, and how does the journal trace
   back to the appointment?
2. Where does the sterilization log live, and what are its lifecycle + RBAC?

## Decision

**Treatment consumption is a clinical record that appends stock rows in one transaction.** A
`POST /api/consumption/appointments/:id` (roles: ADMIN + DENTIST + RECEPTIONIST) atomically:

- creates a `TreatmentStockConsumption` row (`appointmentId` + `productId` + `quantity`,
  optional batch/reason),
- appends a `StockLedgerEntry` `OUT` row carrying `appointmentId` (new nullable column on the
  ledger — ADR 024's "OUT with a reason" is now _linked to the appointment_, so the finance
  journal traces the clinical act),
- decrements `Product.quantityOnHand` via `applyStock` (below zero → `INSUFFICIENT_STOCK`),
- records the usual `STOCK_OUT` audit with `source: 'TREATMENT'`.

Because the ledger row and the on-hand decrement happen inside the transaction, ADR 024's
invariant `Σ ledger == quantityOnHand` holds exactly, and ADR 025's alerts read it unchanged.
Consumption is refused for terminal appointments (`CANCELLED`/`NOSHOW`) — no treatment happened.
There is **no delete**: mistakes are corrected with new movements, matching ADR 024's
append-only ledger.

**Batch on consumption makes ADR 025's FIFO split exact.** Consumption rows now accept a
`batch`; the appending `OUT` row stores it. Combined with 3.5's seed this moves expiry
accounting from FEFO approximation toward exact lot tracing — ADR 025's stated plan.

**Sterilization logs are a separate append-style table.** `SterilizationLog` stores one cycle
per row: `instrument` (a snapshot name) + optional `productId` link to the catalog instrument,
`method` (`AUTOCLAVE | CHEMICAL | UV | OTHER`), `cycle`, `status`
(`IN_PROGRESS → COMPLETED/FAILED/CANCELLED`), `startedAt`/`completedAt`, `operator` and `notes`.
Status transitions are enforced by `sterilizationMath.applySterilizationTransition`: only
in-progress cycles reach a terminal state, and terminal cycles are never reopened — mistakes are
re-recorded, matching the append-only philosophy. Writes (create/PATCH) are the clinical desk
(ADMIN + DENTIST + RECEPTIONIST); reads are the stock-read audience (clinical trio +
ACCOUNTANT, ADR 022). Create/update are audited (`STERILIZATION_CREATE`/`STERILIZATION_UPDATE`,
target `STERILIZATION`).

**RBAC split is the point of the ADR.** The manual finance `OUT`/`ADJUST` stays ADMIN +
ACCOUNTANT; treatment consumption is deliberately a _different_ write surface so the dentist at
the chair can record what they used without touching the finance book — while the journal itself
remains readable by ACCOUNTANT for costing.

## Consequences

- Consumption writes are clinical and auditable; the ledger keeps one consistent story with the
  manual finance book.
- The invariant holds by construction; `seed-demo.ts` re-verifies it and now seeds 8
  consumptions (batch-tagged) + 5 sterilization cycles (incl. one `IN_PROGRESS` and one
  `FAILED`).
- No hard deletes anywhere: corrections are new consumption/sterilization rows, never edits.
- Adds two new read surfaces (`/api/consumption`, `/api/sterilizations`) and one write surface
  per feature; contracts are validated exactly like every other 3.x endpoint.
