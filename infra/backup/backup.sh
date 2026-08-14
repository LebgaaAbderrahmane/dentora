#!/usr/bin/env bash
# Dentora backups — logical dump + WAL archive sync + physical base for PITR.
#
# Usage:
#   ./backup/backup.sh                 # full run (dump + WAL + base)
#   BACKUP_DIR=/var/lib/dentora/backups ./backup/backup.sh
#
# Produces (under BACKUP_DIR, default <repo>/infra/backups):
#   daily/  dentora-<ts>.sql.gz   — portable logical dump (pg_dump, gzip)
#   wal/    <xxxx…>.partial        — continuous WAL archive copied off the volume
#   base/   <ts>/base.tar.gz       — physical base backup (pg_basebackup -Ft)
#
# Run it from anywhere; it locates infra/ itself. Requires `docker compose`.
set -euo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$INFRA_DIR/backups}"
DAILY_RETENTION="${DAILY_RETENTION:-14}"   # keep N logical dumps
BASE_RETENTION="${BASE_RETENTION:-3}"      # keep N physical base backups

ENV_FILE="$INFRA_DIR/.env"
COMPOSE_YML="$INFRA_DIR/docker-compose.yml"

get() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }
POSTGRES_USER="$(get POSTGRES_USER)"
POSTGRES_DB="$(get POSTGRES_DB)"
POSTGRES_PASSWORD="$(get POSTGRES_PASSWORD)"

# Project-scoped docker resources (compose `name: dentora`).
NET="dentora_internal"
WAL_VOL="dentora_wal_archive"

[ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_DB" ] || { echo "ERROR: missing POSTGRES_USER/DB in $ENV_FILE"; exit 1; }

TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/wal" "$BACKUP_DIR/base"
cd "$INFRA_DIR"

compose() { docker compose -f "$COMPOSE_YML" --env-file "$ENV_FILE" "$@"; }

echo "==> [$TS] logical dump"
if compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fp -Z6 -f /tmp/dentora-dump.sql.gz; then
  compose cp "postgres:/tmp/dentora-dump.sql.gz" "$BACKUP_DIR/daily/dentora-$TS.sql.gz" >/dev/null
  compose exec -T postgres rm -f /tmp/dentora-dump.sql.gz
else
  echo "!! pg_dump failed — check container + credentials"; exit 1
fi

echo "==> [$TS] WAL archive sync (volume $WAL_VOL -> $BACKUP_DIR/wal)"
# The volume's WAL files are postgres-uid(70)/0600. Read them as uid 70 inside the
# container and stream out via tar, so the host copies are owned by the host uid
# (readable by this user and by the restore container, which also runs as host uid).
docker run --rm --user 70:70 \
  -v "$WAL_VOL":/wal_archive:ro \
  postgres:16-alpine tar -C /wal_archive -cf - . \
  | tar -C "$BACKUP_DIR/wal" -xf -

echo "==> [$TS] physical base backup (PITR anchor)"
mkdir -p "$BACKUP_DIR/base/$TS"
# --user maps to the host uid so the base backup is owned by (and readable to) the
# repo user — pg_basebackup only needs a replication connection, not OS root.
docker run --rm \
  --network "$NET" \
  --user "$(id -u):$(id -g)" \
  -e "PGPASSWORD=$POSTGRES_PASSWORD" \
  -v "$BACKUP_DIR/base/$TS":/out \
  postgres:16-alpine pg_basebackup -h postgres -U "$POSTGRES_USER" -D /out -Ft -z -X stream

echo "==> [$TS] pruning (daily<=$DAILY_RETENTION, base<=$BASE_RETENTION)"
ls -1t "$BACKUP_DIR"/daily/dentora-*.sql.gz 2>/dev/null | tail -n +"$((DAILY_RETENTION + 1))" | xargs -r rm -f
ls -1t "$BACKUP_DIR"/base 2>/dev/null | tail -n +"$((BASE_RETENTION + 1))" | xargs -r -I{} rm -rf "$BACKUP_DIR/base/{}"

echo "==> [$TS] done."
ls -lh "$BACKUP_DIR/daily" | tail -n +2
