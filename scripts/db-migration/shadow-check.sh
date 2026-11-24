#!/usr/bin/env bash
# shadow-check.sh  — rehearsal: starts a second copy of the app (port 3001)
# on the NEW database and checks the main flows against it: pages, public
# QR / menu / embed, stored files, Google token decryption, the live feed
# (posts one test review into the rehearsal copy) and response times.
# Side effects off for that copy: no e-mail (RESEND_API_KEY empty), no Sentry.
source "$(dirname "$0")/lib.sh"
here="$(cd "$(dirname "$0")" && pwd)"
port="${SHADOW_PORT:-3001}"; base="http://127.0.0.1:$port"
new_url="$(url_for new)"
logf="$OPS_DIR/reports/shadow-$(ts).log"
cd "${APP_DIR:-/app}"
env PORT="$port" HOSTNAME=127.0.0.1 DATABASE_URL="${new_url}?connection_limit=5" DIRECT_URL="$new_url" \
  RESEND_API_KEY= SENTRY_DSN= NEXT_PUBLIC_SENTRY_DSN= \
  node node_modules/next/dist/bin/next start -p "$port" -H 127.0.0.1 >"$logf" 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true' EXIT
up=0
for _ in $(seq 1 120); do
  if curl -fsS "$base/api/health" >/dev/null 2>&1; then up=1; break; fi
  kill -0 "$pid" 2>/dev/null || break
  sleep 1
done
if [ "$up" != 1 ]; then log "SHADOW APP DID NOT START:"; tail -20 "$logf"; exit 1; fi
log "shadow app on :$port, health: $(curl -fsS "$base/api/health?db=1" || echo unreachable)"
fail=0
check() {
  local path="$1" want="${2:-200}" code
  code="$(curl -s -o /dev/null -w '%{http_code}' -H 'accept: text/html' "$base$path" || true)"
  if [ "$code" = "$want" ]; then log "ok   $code $path"; else log "FAIL $code (want $want) $path"; fail=1; fi
}
slug="$(psql "$new_url" -XAtc "select slug from restaurants where is_active order by created_at limit 1" || true)"
menu_slug="$(psql "$new_url" -XAtc "select slug from restaurants where is_active and menu_enabled and menu_published order by created_at limit 1" || true)"
check /tr; check /en; check /tr/pricing; check "/r/$slug"; check "/embed/$slug"
if [ -n "$menu_slug" ]; then check "/menu/$menu_slug"; else log "skip /menu (no published menu)"; fi
check /tr/auth/login; check /admin
while read -r path sum; do
  [ -n "$path" ] || continue
  got="$( (curl -fsS "$base/files/$path" || true) | sha256sum | awk '{print $1}')"
  if [ "$got" = "$sum" ]; then log "ok   file $path"; else log "FAIL file $path"; fail=1; fi
done < <(psql "$new_url" -XAt -F' ' -c "select path, sha256 from stored_files order by path")
node "$here/check-tokens.mjs" --db new || fail=1
node "$here/live-feed-check.mjs" --base "$base" --db new || fail=1
node "$here/measure.mjs" --base "$base" --db new --label shadow --runs "${RUNS:-3}" || fail=1
if grep -qiE 'error|unhandled' "$logf"; then log "shadow log has errors:"; grep -iE 'error|unhandled' "$logf" | head -15; fi
[ "$fail" = 0 ] && log "SHADOW CHECK OK" || { log "SHADOW CHECK FAILED"; exit 1; }
