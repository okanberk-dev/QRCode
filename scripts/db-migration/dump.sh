#!/usr/bin/env bash
# dump.sh <source> [label]  — pg_dump custom format of the app schema.
#   source: supabase | new | new:<db> | <ENV_NAME>
# Only `public` is dumped: Supabase's own schemas (auth, storage, realtime,
# vault…) are not app data (CLAUDE.md §55 inventory). No owners, grants,
# publications or subscriptions (Supabase roles do not exist on plain
# Postgres; the RLS policies themselves are kept).
source "$(dirname "$0")/lib.sh"
src="$(resolve_target "${1:?source}")"
label="${2:-${1//[:\/]/-}}"
out="$OPS_DIR/dumps/${label}-$(ts).dump"
log "pg_dump $1 → $out"
pg_dump -Fc -Z 6 -n public --no-owner --no-privileges --no-publications --no-subscriptions \
  -d "$src" -f "$out"
sha256sum "$out" | awk '{print $1}' > "$out.sha256"
ln -sfn "$(basename "$out")" "$OPS_DIR/dumps/${label}-latest.dump"
log "size $(stat -c %s "$out") bytes, sha256 $(cat "$out.sha256")"
pg_restore -l "$out" | grep -v '^;' | sed -E 's/^[0-9]+; [0-9]+ [0-9]+ //' | awk '{print $1" "$2}' | sort | uniq -c | tr '\n' ';'
echo
echo "DUMP=$out"
