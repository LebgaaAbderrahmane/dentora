# ADR 0007 — Audit log from Phase 0

- **Status:** Accepted
- **Date:** 2026-08-14

## Context

For a system holding patient medical records, knowing _who_ accessed or changed _what_ and _when_ is a compliance and trust requirement. Adding it at the end leaves the first months of operation unrecorded.

## Decision

- A basic **audit log** (actor, action, entity, entityId, before/after, timestamp) is implemented in **Phase 0** (service + middleware), covering views and edits of patient records.
- Admin audit UI + retention policy land in Phase 6.

## Consequences

- Visibility into patient-data access from day one.
- Slight write overhead per audited action; mitigated by an append-only, index-friendly table.
- Audit events must never be editable by application users.
