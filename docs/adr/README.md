# Architecture Decision Records

Each ADR captures a decision and its rationale so future contributors stay in context.
Format follows [Michael Nygard's template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

| #                                      | Status   | Decision                                              |
| -------------------------------------- | -------- | ----------------------------------------------------- |
| [0002](0002-rest-zod-contracts.md)     | Accepted | REST + Zod + shared `packages/contracts`              |
| [0003](0003-three-frontends.md)        | Accepted | Three frontends: web / admin / portal                 |
| [0005](0005-minio-object-storage.md)   | Accepted | MinIO object storage, signed-URL delivery             |
| [0006](0006-field-level-encryption.md) | Accepted | Field-level AES-256-GCM for MedicalHistory            |
| [0007](0007-audit-log.md)              | Accepted | Basic audit log from Phase 0                          |
| [0009](0009-sentry.md)                 | Accepted | Sentry from Phase 0                                   |
| [0010](0010-backups.md)                | Accepted | pg_dump + WAL/PITR, documented RTO/RPO                |
| [0011](0011-manual-deploy.md)          | Accepted | Manual deploy runbook initially; CI/CD decided in 6.6 |
