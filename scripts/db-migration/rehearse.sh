#!/usr/bin/env bash
# rehearse.sh  — full rehearsal while production still runs on Supabase:
# dump → restore into a test database (restore check) → restore into the new
# main database → verify → migration history → shadow app checks.
# Supabase keeps receiving writes meanwhile, so `verify supabase new` may
# show write-hot tables (sessions…) differing; the cutover verify runs with
# writes stopped and must be identical.
source "$(dirname "$0")/lib.sh"
d="$(cd "$(dirname "$0")" && pwd)"
bash "$d/save-supabase-url.sh"
out="$(bash "$d/dump.sh" supabase rehearsal)"; printf '%s\n' "$out"
dump="$(printf '%s\n' "$out" | sed -n 's/^DUMP=//p')"
bash "$d/restore.sh" "$dump" buaze_restore_test
ALLOW_REPLACE_MAIN=yes bash "$d/restore.sh" "$dump" buaze
bash "$d/verify.sh" new:buaze_restore_test new
bash "$d/verify.sh" supabase new || log "(rehearsal: differences above are live writes since the dump)"
bash "$d/check-migrations.sh" new
bash "$d/shadow-check.sh"
