# Architecture Decision Records

Each ADR captures a decision and its rationale so future contributors stay in context.
Format follows [Michael Nygard's template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

| #                                       | Status   | Decision                                                                     |
| --------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| [0002](0002-rest-zod-contracts.md)      | Accepted | REST + Zod + shared `packages/contracts`                                     |
| [0003](0003-three-frontends.md)         | Accepted | Three frontends: web / admin / portal                                        |
| [0005](0005-minio-object-storage.md)    | Accepted | MinIO object storage, proxied delivery + envelope enc.                       |
| [0006](0006-field-level-encryption.md)  | Accepted | Field-level AES-256-GCM for MedicalHistory                                   |
| [0007](0007-audit-log.md)               | Accepted | Basic audit log from Phase 0                                                 |
| [0009](0009-sentry.md)                  | Accepted | Sentry from Phase 0                                                          |
| [0010](0010-backups.md)                 | Accepted | pg_dump + WAL/PITR, documented RTO/RPO                                       |
| [0011](0011-manual-deploy.md)           | Accepted | Manual deploy runbook initially; CI/CD decided in 6.6                        |
| [0012](0012-design-foundations.md)      | Accepted | Two intentional design identities, tokens per identity                       |
| [0013](0013-fullcalendar.md)            | Accepted | FullCalendar 6 for the appointments calendar                                 |
| [0014](0014-waitlist-noshow.md)         | Accepted | Waiting list status-driven, no hard delete; derived no-show stats            |
| [0015](0015-dashboard-kpis.md)          | Accepted | Dashboard KPIs derived on read; revenue/low-stock deferred to Ph.2/3         |
| [0016](0016-public-booking-waitlist.md) | Accepted | Public web booking → PENDING waitlist entry (no new table)/API               |
| [0017](0017-service-catalog.md)         | Accepted | Service catalog: whole-DZD Int prices, ADMIN-only write, 2.2 snapshot        |
| [0018](0018-invoices.md)                | Accepted | Immutable snapshot lines, atomic per-branch numbering, derived status        |
| [0019](0019-payments-refunds.md)        | Accepted | Payments & refunds: one table, derived paid amount, refunds reverse receipts |
