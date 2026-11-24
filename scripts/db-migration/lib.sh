#!/usr/bin/env bash
# Shared helpers for the Supabase → Coolify Postgres move (CLAUDE.md §55).
# Runs inside the app container (Coolify scheduled task), where the
# connection strings live in the environment. Never print a URL: they carry
# passwords. Output is counts, sizes, hashes and file paths only.
set -euo pipefail

OPS_DIR="${OPS_DIR:-/app/ops-data}"
umask 077
mkdir -p "$OPS_DIR/dumps" "$OPS_DIR/storage" "$OPS_DIR/rollback" "$OPS_DIR/reports"

# Same text output on both servers, so row checksums compare.
export PGTZ=UTC PGDATESTYLE='ISO, MDY' PGINTERVALSTYLE=postgres PGCONNECT_TIMEOUT=15 PGAPPNAME=buaze-db-migration

ts() { date -u +%Y%m%dT%H%M%SZ; }
log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { log "ERROR: $*"; exit 1; }

# url_for supabase|new|<ENV_NAME> — the connection string, never echoed.
#   supabase: the saved Supabase session-pooler URL (saved by
#             save-supabase-url.sh before the switch), else DIRECT_URL.
#   new:      NEW_DATABASE_URL (Coolify Postgres, database "buaze").
url_for() {
  case "$1" in
    supabase)
      if [ -s "$OPS_DIR/rollback/supabase-direct-url" ]; then cat "$OPS_DIR/rollback/supabase-direct-url"
      else printf '%s' "${DIRECT_URL:?DIRECT_URL missing}"; fi ;;
    new) printf '%s' "${NEW_DATABASE_URL:?NEW_DATABASE_URL missing}" ;;
    *) local v="${!1:-}"; [ -n "$v" ] || die "env $1 missing"; printf '%s' "$v" ;;
  esac
}

# Same server, another database: replaces the path of a URL without a query.
url_with_db() {
  local url="$1" db="$2"
  case "$url" in *\?*) die "url_with_db: URL must not have a query string" ;; esac
  printf '%s/%s' "${url%/*}" "$db"
}

# Resolves `new:<db>` to a database on the Coolify server.
resolve_target() {
  case "$1" in
    new:*) url_with_db "$(url_for new)" "${1#new:}" ;;
    *) url_for "$1" ;;
  esac
}
