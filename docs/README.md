# Documentation index

> Docs are maintained in the same commit as the code they describe.

| Doc                                    | Content                                                    | Status                                                              |
| -------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| [setup.md](setup.md)                   | Dev environment, prerequisites, running the stack          | Live                                                                |
| [conventions.md](conventions.md)       | Code standards, commit style, git workflow, i18n rules     | Live                                                                |
| [security.md](security.md)             | Encryption model, sessions/RBAC, audit, hardening          | Live                                                                |
| [deploy.md](deploy.md)                 | VPS deploy runbook — executed by the Deploy workflow       | Live                                                                |
| [backup-restore.md](backup-restore.md) | pg_dump + WAL/PITR, restore procedure, RTO/RPO + drill log | Live                                                                |
| [perf.md](perf.md)                     | Performance notes (6.5 audit)                              | Live                                                                |
| api.md                                 | Auto-generated OpenAPI 3 from Zod schemas                  | Not built — schemas in `packages/contracts` are the contract source |
| [adr/](adr/)                           | Architecture decision records (0002–0036)                  | Live                                                                |

See [`PROCESS.md`](../PROCESS.md) for the roadmap and session log.
