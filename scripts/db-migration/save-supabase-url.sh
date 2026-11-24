#!/usr/bin/env bash
# Keeps the Supabase connection string inside the container volume so the
# verify / rollback scripts still reach Supabase after DIRECT_URL points to
# the new database. Run once BEFORE the switch. Never prints the value.
source "$(dirname "$0")/lib.sh"
f="$OPS_DIR/rollback/supabase-direct-url"
if [ -s "$f" ]; then log "already saved ($(wc -c < "$f") bytes)"; exit 0; fi
case "${DIRECT_URL:-}" in
  *supabase.com*) printf '%s' "$DIRECT_URL" > "$f"; chmod 600 "$f"; log "saved Supabase URL ($(wc -c < "$f") bytes)" ;;
  *) die "DIRECT_URL is not a Supabase URL; nothing saved" ;;
esac
