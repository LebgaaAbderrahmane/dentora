#!/bin/sh
set -e

# Named volumes are root-owned by default, but archive_command runs as the
# `postgres` OS user. With a readable-but-unwritable /wal_archive every WAL
# archiving attempt fails (pg_stat_archiver.failed_count grows indefinitely).
# Re-own the mount on every boot, then hand over to the official entrypoint.
chown -R postgres:postgres /wal_archive

exec /usr/local/bin/docker-entrypoint.sh "$@"