# ADR 0016 — Public booking writes a waitlist entry, not an appointment

- **Date:** 2026-08-16
- **Status:** Accepted
- **Relates to:** ADR 014 (waitlist lifecycle + no-show), ADR 006 (encryption), ADR 007 (audit), ADR 002 (contracts)

## Context

Phase 1.8 wires the marketing site's booking form to the API. Until now the form only opened a
WhatsApp link (wa.me) — a soft channel that no staff dashboard ever sees. The roadmap calls for
the API to create a "pending request". A website visitor is not yet a scheduled patient, so the
request must land somewhere staff will act on it. The simplest options were a new `BookingRequest`
table, or reuse of the Phase 1.6 waitlist.

## Decision

**`POST /api/public/bookings` (unauthenticated) creates a `PENDING` waitlist entry.**

- The visitor is **find-or-created as a patient by phone** in the resolved branch, then a
  `PENDING` `WaitlistEntry` is created. Repeat submissions for the same number collapse onto one
  patient and answer `409 WAITLIST_ALREADY_ACTIVE` via the same "one active entry per patient"
  rule the staff form uses (ADR 014).
- `firstName`/`lastName`/`phone` are required; `service`, `preferredDate`, `message` are optional
  and folded into the waitlist `notes`, which stay AES-256-GCM encrypted at rest (ADR 006).
- **Branch resolution**: `PUBLIC_BRANCH_ID` env if set, otherwise the clinic's first branch —
  the web site is a single-clinic property today (ADR 003).
- **Rate limiting**: a minimal in-memory fixed-window limiter (5/hour per IP, `429
TOO_MANY_REQUESTS`). Edge-level limiting can replace it later (ADR 011 deploys Caddy).
- **Audit + provenance**: the entry is created with `createdById = null` and audited as
  `WAITLIST_CREATE` targeting the patient with `metadata.source: 'web'`. The waitlist list rows
  expose `source: 'staff' | 'web'` (null creator ⇒ web), so the staff board visibly marks
  website requests without any new column.
- **No appointment is ever created** here. The existing staff contact → book flow turns the entry
  into a real time-slot with all conflict checks (ADR 013/014), which is exactly how a walk-in
  request should become a booking.
- The `web` app calls the endpoint same-origin through the existing `/api` nginx proxy (dev
  Vite proxy mirrors this) and validates the response with `publicBookingResponseSchema`.

## Consequences

- Zero new tables and zero new admin UI: the Phase 1.6 waitlist board is the public-request
  inbox, distinguishable by the `source: web` badge.
- Public request volume appears directly in the dashboard's `waitlist.active` KPI.
- Deliberately avoided: auto-creating `PENDING` _appointments_ (a request is not a time-slot and
  would pollute the calendar + conflict checks) and a parallel `BookingRequest` model (duplicate
  of the waitlist with no lifecycle benefit).
- If the clinic grows multi-branch later, `PUBLIC_BRANCH_ID` becomes a per-site config or the
  public route learns an explicit branch mapping.
