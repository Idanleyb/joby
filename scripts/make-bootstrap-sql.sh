#!/usr/bin/env bash
# Builds ONE SQL file to paste into the Supabase SQL Editor (no CLI needed).
#
#   bash scripts/make-bootstrap-sql.sh > bootstrap.sql
#       Empty project: all migrations + seed, in one transaction.
#   bash scripts/make-bootstrap-sql.sh --after 20261027000800 > update.sql
#       Existing project: only migrations newer than that version (no seed).
#
# Either way the migrations are recorded in supabase_migrations.schema_migrations,
# exactly like `supabase db push`, so the CLI and the SQL Editor can be mixed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AFTER=""
[[ "${1:-}" == "--after" ]] && AFTER="${2:?version required}"

files=()
for f in "$ROOT"/supabase/migrations/*.sql; do
  v="$(basename "$f")"; v="${v%%_*}"
  [[ -z "$AFTER" || "$v" > "$AFTER" ]] && files+=("$f")
done
[[ ${#files[@]} -gt 0 ]] || { echo "-- nothing newer than $AFTER" ; exit 0; }

echo "-- Joby database $( [[ -n "$AFTER" ]] && echo "update (after $AFTER)" || echo bootstrap ) — generated $(date -u +%Y-%m-%dT%H:%MZ)"
echo "-- Run ONCE: Supabase → SQL Editor → paste → Run."
echo "begin;"
echo
for f in "${files[@]}"; do
  echo "-- >>> $(basename "$f")"
  cat "$f"
  echo
done
if [[ -z "$AFTER" ]]; then
  echo "-- >>> seed.sql"
  cat "$ROOT/supabase/seed.sql"
  echo
fi
echo "-- >>> migration history (same as \`supabase db push\` would record)"
echo "create schema if not exists supabase_migrations;"
echo "create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);"
for f in "${files[@]}"; do
  b="$(basename "$f" .sql)"
  echo "insert into supabase_migrations.schema_migrations (version, name) values ('${b%%_*}', '${b#*_}') on conflict (version) do nothing;"
done
echo
echo "commit;"
echo
echo "select version, name from supabase_migrations.schema_migrations order by version;"
