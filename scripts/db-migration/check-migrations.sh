#!/usr/bin/env bash
# check-migrations.sh <target>  — the migration folders shipped with the app
# and the applied rows in _prisma_migrations must match exactly, so the next
# deploy's `prisma migrate deploy` is a no-op on the restored database.
source "$(dirname "$0")/lib.sh"
url="$(resolve_target "${1:-new}")"
dir="${APP_DIR:-/app}/prisma/migrations"
expected="$(find "$dir" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)"
applied="$(psql "$url" -XAtc "select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null order by 1")"
pending="$(psql "$url" -XAtc "select count(*) from _prisma_migrations where finished_at is null and rolled_back_at is null")"
if [ "$expected" = "$applied" ] && [ "$pending" = "0" ]; then
  log "MIGRATIONS OK: $(printf '%s\n' "$applied" | wc -l) applied, none pending, matches the app"
else
  log "MIGRATIONS DIFFER (pending rows: $pending):"; diff <(printf '%s\n' "$expected") <(printf '%s\n' "$applied") | head -20; exit 1
fi
