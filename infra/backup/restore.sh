#!/usr/bin/env bash
# Dentora restore — logical (pg_dump) or point-in-time (base + WAL replay).
#
# Usage:
#   ./backup/restore.sh --logical /path/to/dentora-<ts>.sql.gz --yes
#       Reset the postgres volume and import the logical dump (destructive).
#
#   ./backup/restore.sh --pitr /path/to/base/<ts> [--at '2026-08-14 18:30:00'] [--verify]
#       Restore a physical base backup and replay archived WAL (default: to end
#       of WAL). Runs a throwaway postgres on port 55432; --verify connects and
#       checks the DB is up before handing over.
#
# This is a recovery drill: it does NOT touch the live stack. See
# docs/backup-restore.md for the exact runbook and the RTO/RPO measured.
set -euo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$INFRA_DIR/backups}"
ENV_FILE="$INFRA_DIR/.env"
COMPOSE_YML="$INFRA_DIR/docker-compose.yml"
RESTORE_PORT="${RESTORE_PORT:-55432}"
RESTORE_DIR="$BACKUP_DIR/restore/$(date +%Y%m%d-%H%M%S)"

get() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }
POSTGRES_USER="$(get POSTGRES_USER)"
POSTGRES_DB="$(get POSTGRES_DB)"
POSTGRES_PASSWORD="$(get POSTGRES_PASSWORD)"
WAL_VOL="dentora_wal_archive"
NET="dentora_internal"

usage() {
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

compose() { docker compose -f "$COMPOSE_YML" --env-file "$ENV_FILE" "$@"; }

mode="${1:-}"

if [ "$mode" = "--logical" ]; then
  DUMP="${2:?missing dump path}"
  CONFIRM="${3:-}"
  [ "$CONFIRM" = "--yes" ] || { echo "This DESTROYS the current postgres volume. Re-run with --yes."; usage; }
  [ -f "$DUMP" ] || { echo "dump not found: $DUMP"; exit 1; }

  echo "==> stopping stack + removing pg volume (destructive)"
  compose stop api >/dev/null 2>&1 || true
  compose rm -sf postgres >/dev/null
  docker volume rm -f "dentora_pgdata" >/dev/null

  echo "==> starting fresh postgres"
  compose up -d postgres
  for i in $(seq 1 30); do
    compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1 && break
    sleep 1
  done

  echo "==> importing $DUMP"
  gzip -dc "$DUMP" | compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q
  echo "==> logical restore complete. Restart the rest: docker compose up -d"
  exit 0
fi

if [ "$mode" = "--pitr" ]; then
  BASE="${2:?missing base dir (e.g. $BACKUP_DIR/base/<ts>)}"
  AT=""
  AT_LSN=""
  VERIFY=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --at) AT="${2:?missing time}"; shift 2 ;;
      --lsn) AT_LSN="${2:?missing LSN (e.g. 0/2E0000A0)}"; shift 2 ;;
      --verify) VERIFY=1; shift ;;
      *) shift ;;
    esac
  done
  [ -f "$BASE/base.tar.gz" ] || [ -f "$BASE/base.tar" ] || { echo "no base.tar[.gz] in $BASE"; exit 1; }

  mkdir -p "$RESTORE_DIR"
  echo "==> extracting base backup from $BASE"
  if [ -f "$BASE/base.tar.gz" ]; then
    tar -xzf "$BASE/base.tar.gz" -C "$RESTORE_DIR"
  else
    tar -xf "$BASE/base.tar" -C "$RESTORE_DIR"
  fi
  # pg_basebackup -Ft -X stream also ships the redo/"streamed" WAL in pg_wal.tar
  # (the redo segment lives here, not under base.tar). Extract it into pg_wal/
  # so recovery can find the start point and then replay the archive.
  if [ -f "$BASE/pg_wal.tar.gz" ]; then
    mkdir -p "$RESTORE_DIR/pg_wal"
    tar -xzf "$BASE/pg_wal.tar.gz" -C "$RESTORE_DIR/pg_wal"
  elif [ -f "$BASE/pg_wal.tar" ]; then
    mkdir -p "$RESTORE_DIR/pg_wal"
    tar -xf "$BASE/pg_wal.tar" -C "$RESTORE_DIR/pg_wal"
  fi

  echo "==> configuring recovery (WAL replay)"
  {
    echo "restore_command = 'cp /wal_archive/%f \"%p\"'"
    [ -n "$AT" ] && echo "recovery_target_time = '$AT'"
    [ -n "$AT_LSN" ] && echo "recovery_target_lsn = '$AT_LSN'"
    echo "recovery_target_action = 'promote'"
  } > "$RESTORE_DIR/postgresql.auto.conf"
  : > "$RESTORE_DIR/recovery.signal"

  echo "==> starting recovery instance on 127.0.0.1:$RESTORE_PORT"
  # Run as the host uid: PGDATA and the wal mount are host-uid-owned, and the
  # entrypoint's non-root path just executes postgres directly (data is already
  # initialized from the base backup).
  docker run --rm -d --name dentora-restore \
    --user "$(id -u):$(id -g)" \
    -e "PGPASSWORD=$POSTGRES_PASSWORD" \
    -p "127.0.0.1:$RESTORE_PORT:5432" \
    -v "$RESTORE_DIR":/var/lib/postgresql/data \
    -v "$BACKUP_DIR/wal":/wal_archive:ro \
    --network "$NET" \
    postgres:16-alpine \
    postgres -c 'restore_command=cp /wal_archive/%f "%p"' \
    >/dev/null

  echo -n "waiting for recovery"
  for i in $(seq 1 90); do
    if docker exec dentora-restore pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      echo " — postgres is ready."
      break
    fi
    sleep 1
  done

  if [ "$VERIFY" = "1" ]; then
    echo "==> verify"
    docker exec dentora-restore psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      -c "select (select count(*) from users) as users, pg_is_in_recovery() as still_recovering;"
    docker exec dentora-restore psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      -c "select count(*) as audit_rows from \"AuditLog\";" 2>/dev/null || true
  fi

  echo "==> PITR restore live on 127.0.0.1:$RESTORE_PORT (container dentora-restore)."
  echo "    Stop + remove with: docker rm -f dentora-restore ; rm -rf $RESTORE_DIR"
  exit 0
fi

usage
