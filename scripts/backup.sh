#!/usr/bin/env bash
# Backup the sqlite database in the running `backend` container.
#
# Uses `sqlite3 .backup` so writers are not blocked and the resulting file is
# a consistent snapshot, not a partial flush. The .backup is then compressed
# and written to BACKUP_DIR on the host (default: ./backups/).
#
# Suitable for cron, e.g.:
#   0 3 * * *  /opt/shift-planner/scripts/backup.sh >> /var/log/shift-backup.log 2>&1
#
# Environment variables:
#   COMPOSE_PROJECT   docker compose project name (default: shift-sparkle-planner)
#   BACKEND_SERVICE   service name of the backend (default: backend)
#   BACKUP_DIR        host dir to write into (default: ./backups)
#   KEEP_DAYS         delete backups older than this (default: 30)

set -euo pipefail

COMPOSE_PROJECT="${COMPOSE_PROJECT:-shift-sparkle-planner}"
BACKEND_SERVICE="${BACKEND_SERVICE:-backend}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/shiftplanner-$ts.sqlite.gz"

container="$(docker compose -p "$COMPOSE_PROJECT" ps -q "$BACKEND_SERVICE")"
if [ -z "$container" ]; then
  echo "No running $BACKEND_SERVICE container in project $COMPOSE_PROJECT" >&2
  exit 1
fi

# Use sqlite3 .backup for a consistent snapshot (not a raw file copy).
# /tmp inside the container avoids touching the mounted /data volume.
docker exec "$container" sh -c '
  set -e
  apt-get -qq -o Dpkg::Use-Pty=0 install -y sqlite3 >/dev/null 2>&1 || true
  if ! command -v sqlite3 >/dev/null 2>&1; then
    # Fallback: copy the file. Less safe under heavy write load.
    cp /data/shiftplanner.sqlite /tmp/backup.sqlite
  else
    sqlite3 /data/shiftplanner.sqlite ".backup /tmp/backup.sqlite"
  fi
'

docker exec "$container" sh -c 'gzip -c /tmp/backup.sqlite' > "$out"
docker exec "$container" rm -f /tmp/backup.sqlite

echo "Backed up to $out ($(du -h "$out" | awk '{print $1}'))"

# Prune old backups.
find "$BACKUP_DIR" -name 'shiftplanner-*.sqlite.gz' -type f -mtime "+$KEEP_DAYS" -print -delete
