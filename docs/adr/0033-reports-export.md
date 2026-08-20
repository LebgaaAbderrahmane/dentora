# ADR 033 — Reports & export (Phase 6.1)

- **Date:** 2026-08-20
- **Status:** Accepted
- **Relates to:** ADR 021 (finance report — derived cash P&L), ADR 022 (products), ADR 024
  (stock ledger — the cost basis for valuation), ADR 002 (shared Zod contracts), ADR 017
  (whole-dinar money), ADR 007 (audit — exports are read-only, see Consequences)

## Context

Phase 6.1 surfaces the clinic's operational and financial picture as **reports**, each with a
**CSV/PDF export**:

- **Occupancy** — how busy were the chairs: booked vs performed appointments per day and per
  dentist, plus no-show/cancellation pressure.
- **Revenue** — the cash P&L + daily close-out already defined in ADR 021 (`/finance/report`),
  exposed on the reports surface so the reports screen is self-contained.
- **Stock valuation** — the money tied up in current inventory.

Three design questions:

1. **Where do the numbers come from?** Every report must be _derived on read_ (the house rule
   since ADR 015/021/024): nothing new is stored; the report recomputes from immutable
   appointment/payment/ledger history. That keeps the reports honest and the schema untouched.
2. **What does "occupancy" actually mean?** The clinic has no slot/capacity model — only booked
   appointments and weekly schedule templates. A true "chairs × hours" capacity figure would
   require scheduling data the system does not yet capture. The honest fully-derived metric is
   **slot realization**: `planned` = non-cancelled booked appointments (PENDING/CONFIRMED/
   COMPLETED/NOSHOW), `kept` = COMPLETED, `abandoned` = NOSHOW + CANCELLED, `utilization` =
   kept / planned, and `showRate` = kept / (kept + NOSHOW). CANCELLED slots are reported but
   excluded from the planned denominator because the slot was released.
3. **How is inventory valued?** Current stock × a cost per unit. The ledger (ADR 024) records a
   `unitCostDZD` on every inward movement (OPENING/IN), so the defensible per-product cost is
   the **weighted average** of all costed inward movements, rounded to whole dinars (ADR 017).
   Products with no costed movement value at 0 and stay visible with a "no cost" flag so the
   finance desk can fill the gap.

## Decision

A single `GET /api/reports/…` surface (router `routes/reports.ts`, registered at `/reports`)
backed by a pure, CI-tested aggregation library (`lib/reportMath.ts`):

- `GET /reports/occupancy?from&to` — ADMIN/DENTIST/RECEPTIONIST. Day grid (24h buckets,
  timezone-agnostic like ADR 021) + per-dentist breakdown + summary. Window defaults to the
  server-local today.
- `GET /reports/stock-valuation?archived=exclude|include` — ADMIN/ACCOUNTANT. Every product row
  (`quantityOnHand`, weighted-average `unitCostDZD` or null, `valueDZD`) + category/global
  totals. Default `exclude`, because archived stock is provably off the shelf.
- `GET /reports/revenue?from&to` — ADMIN/ACCOUNTANT. Same shape as `/finance/report` (ADR 021),
  so the reports screen and the finance screen never diverge.
- Each has `…/export?format=csv|pdf` reusing the same RBAC + window. CSV = RFC 4180 with a
  UTF-8 BOM (French diacritics open correctly in Excel); PDF = a dependency-free writer
  (`lib/pdf.ts`).

**Reports, not logs.** Reports carry no PHI/PII (no patient names) and writes nothing, so no
per-read audit rows (ADR 007 targets patient-document access). Every request is already
line-logged by the API request middleware.

**Export copy is French.** Like the reminder copy in `notifyMath.ts`, the generated CSV/PDF
labels are French constants in `lib/reportMath.ts` — the clinic's working language. The API
does not import the UI i18n package (keeps `api` → only `contracts`), and the exported file is
a document, not UI. A future multi-lingual export would parameterize the label set.

## Consequences

- **Zero schema change.** All reports derive from existing tables; the demo seed (which already
  exercises appointments, payments and the ledger) populates them. DoD: no migration generated.
- **Occupancy is slot-realization, not capacity.** Utilization answers "of the appointments we
  booked, how many produced care". A true chair-capacity metric is deferred until scheduling
  data (opening hours, dentist calendars) exists; the day/dentist grid already gives the raw
  demand signal.
- **Valuation is approximate for uncosted stock.** Rows without a ledger cost show `hasCost:
false` and value 0, surfaced in the UI summary as `costedProducts` so the gap is visible, not
  silently wrong.
- **Exports are free of runtime dependencies** (no PDFKit/Excel libs): the PDF is hand-assembled
  with a valid xref table and WinAnsi/Latin-1 text. Non-French glyphs (e.g. Arabic names) in
  exports degrade to `?`; the summary/tables are numbers and category labels, so the impact is
  limited. Revisit with a real PDF engine only if Arabic PDF output becomes a requirement.
- RBAC parity: the frontend hides the stock/revenue tabs for non-ADMIN/ACCOUNTANT and the API
  enforces the same split — clinical roles can export occupancy only.
