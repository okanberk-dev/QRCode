#!/usr/bin/env bash
# cutover-copy.sh  — the final copy, run while the app is in maintenance
# mode (no writes): dump Supabase → replace the new main database → verify
# every table identical → migration history → Google tokens.
# Exit 0 only when everything matches; only then switch DATABASE_URL.
source "$(dirname "$0")/lib.sh"
d="$(cd "$(dirname "$0")" && pwd)"
code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${PORT:-3000}/tr || true)"
[ "$code" = "503" ] || [ "${FORCE_WITHOUT_MAINTENANCE:-}" = "yes" ] || die "app is not in maintenance mode (GET /tr → $code)"
bash "$d/save-supabase-url.sh"
out="$(bash "$d/dump.sh" supabase final)"; printf '%s\n' "$out"
dump="$(printf '%s\n' "$out" | sed -n 's/^DUMP=//p')"
ALLOW_REPLACE_MAIN=yes bash "$d/restore.sh" "$dump" buaze
bash "$d/verify.sh" supabase new
bash "$d/check-migrations.sh" new
node "$d/check-tokens.mjs" --db new
log "CUTOVER COPY OK — safe to point DATABASE_URL / DIRECT_URL at the new database"
