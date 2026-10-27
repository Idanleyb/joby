#!/usr/bin/env bash
# Builds ONE SQL file that installs the whole database on an EMPTY Supabase project
# from the SQL Editor (no CLI needed): all migrations + seed, in one transaction,
# and records the migrations in supabase_migrations.schema_migrations so a later
# `supabase db push` only applies newer ones.
#
#   bash scripts/make-bootstrap-sql.sh > bootstrap.sql
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "-- Joby database bootstrap — generated $(date -u +%Y-%m-%dT%H:%MZ)"
echo "-- Run ONCE on an empty Supabase project: SQL Editor → paste → Run."
echo "begin;"
echo
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "-- >>> $(basename "$f")"
  cat "$f"
  echo
done
echo "-- >>> seed.sql"
cat "$ROOT/supabase/seed.sql"
echo
echo "-- >>> migration history (same as \`supabase db push\` would record)"
echo "create schema if not exists supabase_migrations;"
echo "create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);"
for f in "$ROOT"/supabase/migrations/*.sql; do
  b="$(basename "$f" .sql)"
  echo "insert into supabase_migrations.schema_migrations (version, name) values ('${b%%_*}', '${b#*_}') on conflict (version) do nothing;"
done
echo
echo "commit;"
echo
echo "-- Check: should list 10 categories and the timer job."
echo "select (select count(*) from public.categories) as categories,"
echo "       (select count(*) from cron.job where jobname = 'joby-run-timers') as timer_jobs;"
