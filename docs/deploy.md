# Deploy runbook (ADR 011 → ADR 036)

Single-host docker-compose stack (`infra/`). Conventions: branches + PRs only, never
commit to `main`; add a PROCESS.md §9/§14 entry per deploy. **Backup before destructive
migrations** (see `docs/backup-restore.md`).

Since ADR 036 these steps are executed by the manual-trigger **Deploy** workflow
(`.github/workflows/deploy.yml`, requires `DEPLOY_HOST/USER/SSH_KEY/PATH` secrets).
This document remains the source of truth — the workflow is the runbook, scripted.

## Prerequisites (first boot)

- Linux host with docker + compose (**non-root user**; the restore/backup flows depend
  on host-uid ownership and uid-70 tar streaming).
- DNS pointing these at the host — set in `infra/.env` (from `.env.example`):
  `WEB_DOMAIN`, `WWW_WEB_DOMAIN`, `ADMIN_DOMAIN`, `PORTAL_DOMAIN`, `API_DOMAIN`,
  `CADDY_EMAIL` (Let's Encrypt). For a no-DNS test, use `localhost` (Caddy internal CA).
- Secrets in `.env`: `POSTGRES_PASSWORD`, `MINIO_ROOT_USER/PASSWORD` (required),
  `ENCRYPTION_KEY` (AES-256-GCM key, 64 hex chars — **back it up**; losing it loses
  MedicalHistory/notes at rest), `SENTRY_DSN`, `LOG_LEVEL`.

## Deploy / update

```
cd infra
docker compose build          # api, nginx (builds web/admin/portal SPAs), caddy
docker compose up -d
# Apply schema changes FIRST (migrations run from a checkout, see below), then start api.
docker compose ps
```

Ports: host 80/443 (caddy TLS) and 127.0.0.1:5432 (postgres, loopback-only). The
frontends (web 8080 / admin 8081 / portal 8082 inside the `nginx` container), api 4000
and minio 9000/9001 are **not** exposed to the host — only reachable via caddy routes.

### Migrations

Prisma's CLI is a devDependency and is **not** in the slim api image, so
`prisma migrate deploy` runs from the repo checkout against the DB port:

```
cd apps/api && DATABASE_URL=postgresql://<user>:<pass>@localhost:5432/dentora \
  pnpm exec prisma migrate deploy
```

Slot it into the flow: run the new migration, start the new api image. (A from-image
migration entrypoint is an option; not done yet — the container stays unprivileged.)

### Verify

- `curl -fsS https://api.<domain>/api/system/status` → `{"ok":true,"db":"up",…}`
- Browse web/admin/portal; admin login then Audit panel to confirm logging lives.
- Postgres: `docker compose exec postgres psql -c "select * from pg_stat_archiver;"`
  → `archived_count` must keep rising (a stuck/failing archive = a backup hole, see the
  backup runbook).

## Rollback

- Tag images for the ability to roll back cleanly:
  `docker compose build`, `docker tag dentora-api:latest dentora-api:git-<sha>` (repeat
  for nginx/caddy); on revert, retag the previous sha and `up -d`.
- **Database:** apply the _new_ migration's inverse first (write a down-migration) or
  restore from backup — `restore.sh --logical <daily dump>` (destructive) / PITR per
  `docs/backup-restore.md`. Never roll an app back past its DB schema.

## Incident quick-reference

| Symptom                                  | Action                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| data loss / bad write up to time T       | PITR fork to T on 55432, inspect, then promote or logical-restore (backup runbook)          |
| ENCRYPTION_KEY lost                      | undecryptable fields; restore from backup before key rotation                               |
| `pg_stat_archiver.failed_count` climbing | archiving broken — check volume ownership (chown in postgres-entrypoint.sh), re-sync `wal/` |
| api down/misbehaving                     | `docker compose logs api`, Sentry; restart container                                        |
| TLS issuance                             | check caddy logs (`docker compose logs caddy`) — DNS/ports 80/443 must reach the host       |
