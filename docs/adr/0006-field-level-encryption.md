# ADR 0006 — Field-level encryption for MedicalHistory

- **Status:** Accepted
- **Date:** 2026-08-14

## Context

Medical history is the most sensitive data in the system. Database-at-rest protections can be bypassed via backups, disk theft, or DB-adjacent compromise. The law in Algeria (18-07) requires protective measures for personal data.

## Decision

- Encrypt sensitive fields (MedicalHistory, and any future sensitive free-text) **field-level** with **AES-256-GCM**.
- The app-level key is provided via environment variable (never stored in the DB).
- A single `encrypt`/`decrypt` helper (added in Phase 0.4) is the only place crypto is touched.

## Consequences

- Backups and DB dumps no longer contain plaintext medical history.
- Adds a key-management requirement: key rotation and loss-protection must be documented.
- Non-searching fields only — field-level encryption prevents SQL LIKE/search on encrypted text; searchable fields are restricted to non-sensitive data.
