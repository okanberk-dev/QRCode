#!/usr/bin/env bash
# restore.sh <dumpfile> <database>  — fresh restore on the Coolify server.
#   database: buaze_restore_test | buaze_backup_test | buaze (main; needs
#   ALLOW_REPLACE_MAIN=yes, it DROPS the current main database).
# All-or-nothing: --single-transaction --exit-on-error.
source "$(dirname "$0")/lib.sh"
dump="${1:?dumpfile}"; name="${2:?database}"
[ -f "$dump" ] || die "no dump at $dump"
case "$name" in
  buaze_restore_test|buaze_backup_test) ;;
  buaze) [ "${ALLOW_REPLACE_MAIN:-}" = "yes" ] || die "set ALLOW_REPLACE_MAIN=yes to replace the main database" ;;
  *) die "unknown database name $name" ;;
esac
if [ -f "$dump.sha256" ]; then
  [ "$(sha256sum "$dump" | awk '{print $1}')" = "$(cat "$dump.sha256")" ] || die "dump checksum mismatch"
  log "dump checksum ok"
fi
admin="$(url_with_db "$(url_for new)" postgres)"
target="$(url_with_db "$(url_for new)" "$name")"
log "recreate database $name"
# The Supabase roles the RLS policies name (no login, no rights): the
# policies restore unchanged; the app connects as the owner and bypasses them.
psql "$admin" -X -q -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END \$\$;
DROP DATABASE IF EXISTS "$name" WITH (FORCE);
CREATE DATABASE "$name" TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER icu ICU_LOCALE 'en-US' LOCALE '${DB_LOCALE:-en_US.UTF-8}';
SQL
# The dump creates schema public itself.
psql "$target" -X -q -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE'
log "pg_restore → $name"
pg_restore -d "$target" --no-owner --no-privileges --exit-on-error --single-transaction "$dump"
psql "$target" -X -q -v ON_ERROR_STOP=1 -c 'ANALYZE'
log "tables: $(psql "$target" -XAtc "select count(*) from pg_tables where schemaname='public'")"
log "restore ok"
