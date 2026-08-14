# ADR 0010 — Backups: pg_dump + WAL/PITR

- **Status:** Accepted
- **Date:** 2026-08-14

## Context

Medical and financial data must survive hardware failure, corruption, or operator error. A nightly `pg_dump` alone can lose up to 24h of data.

## Decision

- **Nightly `pg_dump`** (base snapshot) with 7/30/90-day retention.
- **Continuous WAL archiving** enabled to allow **point-in-time recovery** (e.g. restore to minutes before a failure).
- MinIO buckets are included in the backup rotation.
- RTO/RPO are measured and documented; a restore runbook and a periodic restore **drill** are mandatory (Phase 0.9 + Phase 6.5).

## Consequences

- Recovery granularity of minutes instead of days.
- More storage + tooling (pgBackRest or WAL-E style scripts) to operate.
- Backups are encrypted and stored off-host.
