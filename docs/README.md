# Documentation index

> Docs are maintained in the same commit as the code they describe.

| Doc                                    | Content                                                | Status                              |
| -------------------------------------- | ------------------------------------------------------ | ----------------------------------- |
| [setup.md](setup.md)                   | Dev environment, prerequisites, running the stack      | Live                                |
| [conventions.md](conventions.md)       | Code standards, commit style, git workflow, i18n rules | Live                                |
| [security.md](security.md)             | Encryption model, sessions/RBAC, audit, threat notes   | Draft (schema-level decisions made) |
| [deploy.md](deploy.md)                 | VPS deploy runbook, caddy TLS, updates, rollback       | Planned — Phase 0.9                 |
| [backup-restore.md](backup-restore.md) | pg_dump + WAL/PITR, restore procedure, RTO/RPO         | Planned — Phase 0.9                 |
| [api.md](api.md)                       | Auto-generated OpenAPI 3 (served at `/docs`)           | Planned — first endpoints           |
| [adr/](adr/)                           | Architecture decision records                          | Live                                |

See [`PROCESS.md`](../PROCESS.md) for the roadmap and session log.
