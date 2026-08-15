# Backup & Restore runbook (ADR 010)

Postgres survivability: logical dumps (`daily/`) + continuous WAL archive (`wal/`) +
physical base backups (`base/`) for point-in-time recovery (PITR).

Scripts: `infra/backup/backup.sh`, `infra/backup/restore.sh` (run them from anywhere;
they locate `infra/` themselves and read `infra/.env`).

## Layout

Everything lives under `BACKUP_DIR` (default `<repo>/infra/backups`, gitignored).

| Path                        | Purpose                                                                              | Retention   |
| --------------------------- | ------------------------------------------------------------------------------------ | ----------- |
| `daily/dentora-<ts>.sql.gz` | portable logical dump (`pg_dump -Fp -Z6`) — survives corrupted/PG-version drifts     | 14          |
| `wal/`                      | continuous copy of archived WAL segments (`dentora_wal_archive` volume)              | manual      |
| `base/<ts>/base.tar.gz`     | physical base backup (`pg_basebackup -Ft -z -X stream`)                              | 3           |
| `base/<ts>/pg_wal.tar.gz`   | redo/"streamed" WAL shipped with the base (`-X stream`) — must be restored alongside | (with base) |
| `restore/`                  | throwaway recovery-instance PGDATA (created by `restore.sh`)                         | manual      |

**RPO ≤ 5 min** (`archive_timeout=300` in compose). Reduce it or tighten `wal/` off-host
copying if the clinic needs less data loss. **RTO measured 2026-08-15 drill: ~2 s**
to fork a base to a target LSN 128 KB past its redo point (small dev DB, warm disk).
Real recovery time is dominated by base extraction + how far past the base the target
sits; measure on the target hardware before relying on a number.

## How WAL archiving is wired (and the bug that broke it)

`infra/docker-compose.yml` starts postgres with:

- `archive_mode=on`, `archive_command='test ! -f /wal_archive/%f && cp %p /wal_archive/%f'`
  writing into the `dentora_wal_archive` volume (RPO via `archive_timeout=300`),
- hba_file override (`infra/postgres-pg_hba.conf`) that adds the replication rule
  `host replication all all scram-sha-256` so `pg_basebackup` works over the network.

**Silent-failure bug (fixed 2026-08-15):** the `wal_archive` volume was docker-root-owned,
but each `archive_command` runs as the postgres user, so **every** archive failed
(`pg_stat_archiver` showed `archived_count=0`, `failed_count` climbing). Detection:
`SELECT * FROM pg_stat_archiver;`. Fix: `infra/postgres-entrypoint.sh` chowns
`/wal_archive` before postgres starts. If you ever see `failed_count` increase, WAL
archiving is broken — no new base/PITR coverage exists past the last good segment.

`backup.sh` copies WAL off the volume by streaming via `tar` as uid 70 (volume files
are postgres-owned `0700` and the host user can't read them); the host copy is then
host-uid-owned and readable by the restore instance.

## Running `backup.sh`

`./infra/backup/backup.sh` does, in one shot: logical dump (`daily/`) → WAL sync
(`wal/`) → physical base (`base/`) → prune (len 14 / 3). Tune with `DAILY_RETENTION`,
`BASE_RETENTION`, `BACKUP_DIR`. For PITR cadence just run it on a schedule (e.g. cron):
each run's base becomes a new restore anchor.

## Restore

### 1. Full restore from logical dump (simplest, no point-in-time)

DESTROYS the live postgres volume — unplug the app first:

```
./infra/backup/restore.sh --logical infra/backups/daily/dentora-<ts>.sql.gz --yes
docker compose up -d
```

### 2. PITR — throwaway, non-destructive (drill / forensics)

Runs a disposable instance on `127.0.0.1:55432`, leaving the live stack untouched:

```
./infra/backup/restore.sh --pitr infra/backups/base/<ts>            # to end of WAL
./infra/backup/restore.sh --pitr infra/backups/base/<ts> --at '2026-08-14 18:30:00'
./infra/backup/restore.sh --pitr infra/backups/base/<ts> --lsn '0/41020028' --verify
```

`--verify` connects once postgres is up and prints user/audit counts. Whatever it
recovers, your answer is: `select … ; docker rm -f dentora-restore; rm -rf <restore dir>`.

### 3. PITR into production (live swap after an incident)

Same shape, but you're committing to the recovered data. Concrete flow:

1. **Stop writes** (stop `api`; block user traffic at the proxy) — freeze now.
2. Make sure the archive covering your target is already synced: force a final segment
   (`docker compose exec postgres psql -c "select pg_switch_wal();"`) and re-run
   `./infra/backup/backup.sh` (the WAL sync step), or the recovery will stop short.
3. Validate the target on a throwaway instance first (mode 2, with `--verify`).
4. Swap in: `docker compose stop api`, `docker compose rm -sf postgres`,
   `docker volume rm -f dentora_pgdata`, then start the recovered PGDATA as the live
   postgres volume and `docker compose up -d` (same extraction + `--user` + mount
   pattern `restore.sh` uses), or — simpler and proven — `restore.sh --logical` of a
   fresh dump if the target is "now".
5. Re-create any users the window lost, then verify end-to-end + check the audit log.

## PITR gotchas (all hit during the drill)

- **Target must be after the base's redo point** (`Start-LSN` in
  `base/…/backup_manifest`). Restoring `0/41020028` from a base whose redo was
  `0/44000028` fails with `FATAL: requested recovery stop point is before consistent
recovery point`. Pick the newest base whose redo ≤ target.
- **The archive must already contain the segments up to the target.** Missing segment
  → recovery ends at `cp: can't stat '/wal_archive/…': No such file or directory`
  (end of available WAL, silent under-promise). Always `pg_switch_wal()` + re-run
  `backup.sh` first (step 2 in the prod flow).
- **Redo WAL ships in `pg_wal.tar.gz`, not `base.tar.gz`** (`-X stream`). If you skip
  it, recovery can't find its start LSN. `restore.sh` extracts it into `pg_wal/`.
- **Permissions:** base archives + `wal/` host copy are host-uid-owned; run the restore
  container `--user $(id -u):$(id -g)` (restore.sh does). Volume copy stays uid 70 — only
  read via tar-as-70, never as root (root would chown it postgres, same bug as before).
- **Promote:** `recovery_target_action='promote'` is set, so the instance comes up
  read-write automatically once the target is reached.

## DR drill checklist (regression test for this runbook)

1. `docker compose exec -T postgres psql` → `create table pitr_drill(ts timestamptz, label text, value text);`
   and insert distractor rows.
2. `./infra/backup/backup.sh` — note the new base's redo `Start-LSN`, call it `R`.
3. `select pg_switch_wal();` produce a second incident LSN `I` (read `pg_current_wal_lsn()`
   after a bad UPDATE/INSERT).
4. Re-run `backup.sh` so `wal/` covers up to `I`. Target `T = R + 131072` (first byte of
   the next segment) — assert `R < T < I`.
5. `restore.sh --pitr base/<first> --lsn T --verify`; `select` asserts the pre-incident
   values are back and the incident row is absent.
6. `docker rm -f dentora-restore`; drop `pitr_drill`; note the measured RTO.

## Off-site copies

`backups/` is host-local — a dead host still loses everything. Copy `daily/`, `wal/`,
`base/` off-host (rclone/s3/webdav cron) to make ADR 010 real DR. Track that alongside
CD (ADR 011 deferral) and alerting/Sentry on `pg_stat_archiver`.
