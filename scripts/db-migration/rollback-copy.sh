#!/usr/bin/env bash
# rollback-copy.sh  — ONLY for going back to Supabase (README "Geri dönüş").
# Run while the app is in maintenance mode: copies the current data of the
# new database back into Supabase's public schema (tables, indexes,
# constraints, RLS policies are dropped and recreated from the dump; the
# schema itself and Supabase's own objects are left alone), then verifies
# every table identical. Needs ALLOW_ROLLBACK=yes.
source "$(dirname "$0")/lib.sh"
d="$(cd "$(dirname "$0")" && pwd)"
[ "${ALLOW_ROLLBACK:-}" = "yes" ] || die "set ALLOW_ROLLBACK=yes (this overwrites Supabase's public schema)"
[ -s "$OPS_DIR/rollback/supabase-direct-url" ] || die "saved Supabase URL missing ($OPS_DIR/rollback/supabase-direct-url)"
code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${PORT:-3000}/tr || true)"
[ "$code" = "503" ] || [ "${FORCE_WITHOUT_MAINTENANCE:-}" = "yes" ] || die "app is not in maintenance mode (GET /tr → $code)"
out="$(bash "$d/dump.sh" new rollback)"; printf '%s\n' "$out"
dump="$(printf '%s\n' "$out" | sed -n 's/^DUMP=//p')"
list="$(mktemp)"
pg_restore -l "$dump" | grep -vE ' SCHEMA - public | COMMENT - SCHEMA public ' > "$list"
log "pg_restore --clean → Supabase public"
pg_restore -d "$(url_for supabase)" --clean --if-exists --no-owner --no-privileges --exit-on-error --single-transaction -L "$list" "$dump"
rm -f "$list"
bash "$d/verify.sh" new supabase
log "ROLLBACK COPY OK — now set DATABASE_URL / DIRECT_URL back to Supabase and redeploy without MAINTENANCE_MODE"
