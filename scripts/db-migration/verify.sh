#!/usr/bin/env bash
# verify.sh <A> <B>  — every table in schema public: row count + an
# order-independent checksum of the rows (md5 of each row's text, sorted).
# Exit 1 on any difference. A/B: supabase | new | new:<db> | <ENV_NAME>.
source "$(dirname "$0")/lib.sh"
a="$(resolve_target "${1:?A}")"; b="$(resolve_target "${2:?B}")"
q_tables="select string_agg(format(\$q\$select %L as t, count(*) as n, coalesce(md5(string_agg(h, '' order by h collate \"C\")), '-') as s from (select md5(x::text) h from public.%I x) z\$q\$, tablename, tablename), ' union all ' order by tablename) from pg_tables where schemaname = 'public'"
sql_a="$(psql "$a" -XAtc "$q_tables")"
sql_b="$(psql "$b" -XAtc "$q_tables")"
ra="$(mktemp)"; rb="$(mktemp)"
# Floats: Supabase defaults to extra_float_digits=0 (15 significant digits),
# Postgres 17 to 1 (shortest exact). Same setting on both, so equal values
# render to the same text.
fd="set extra_float_digits = 1"
psql "$a" -XAtq -F' ' -c "$fd" -c "$sql_a order by 1" > "$ra"
psql "$b" -XAtq -F' ' -c "$fd" -c "$sql_b order by 1" > "$rb"
# Each server orders table names by its own collation (`_prisma_migrations`
# sorts first under ICU en-US, among the p's under libc): compare in C order.
LC_ALL=C sort -o "$ra" "$ra"; LC_ALL=C sort -o "$rb" "$rb"
na=$(wc -l < "$ra"); nb=$(wc -l < "$rb")
rows_a=$(awk '{s+=$2} END {print s+0}' "$ra"); rows_b=$(awk '{s+=$2} END {print s+0}' "$rb")
report="$OPS_DIR/reports/verify-${1//[:\/]/-}-vs-${2//[:\/]/-}-$(ts).txt"
paste -d' ' "$ra" "$rb" | awk '{ok = ($1==$4 && $2==$5 && $3==$6) ? "ok" : "DIFF"; printf "%-40s %8s %8s %s\n", $1, $2, $5, ok}' > "$report"
log "tables A=$na B=$nb, rows A=$rows_a B=$rows_b, report $report"
if diff -q "$ra" "$rb" >/dev/null; then
  log "VERIFY OK: all $na tables identical (counts + row checksums)"
  rm -f "$ra" "$rb"
else
  log "VERIFY FAILED:"; diff "$ra" "$rb" | head -40
  rm -f "$ra" "$rb"; exit 1
fi
