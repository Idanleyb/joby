#!/usr/bin/env bash
# Database tests for the Joby schema.
#
#   npm run test:db
#
# Default: spins up a throw-away PostgreSQL cluster (needs PostgreSQL 15+ binaries
# installed locally, no Docker), loads a Supabase stand-in, applies every
# migration + seed, and runs supabase/tests/*.test.sql.
#
# Against the local Supabase stack instead (after `npx supabase start`):
#   TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run test:db
# In that mode the database is reset first with `npx supabase db reset`.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL_OPTS=(-v ON_ERROR_STOP=1 -q -X)

run_tests() {
  local url="$1"
  for f in "$ROOT"/supabase/tests/*.test.sql; do
    echo "▶ $(basename "$f")"
    psql "${PSQL_OPTS[@]}" -o /dev/null -d "$url" -f "$f"
  done
  echo "✔ all database tests passed"
}

if [[ -n "${TEST_DATABASE_URL:-}" ]]; then
  (cd "$ROOT" && npx supabase db reset)
  run_tests "$TEST_DATABASE_URL"
  exit 0
fi

PG_BIN="${PG_BIN:-$(pg_config --bindir 2>/dev/null || true)}"
if [[ ! -x "$PG_BIN/initdb" ]]; then
  for d in /usr/lib/postgresql/*/bin /opt/homebrew/opt/postgresql@*/bin /usr/local/opt/postgresql@*/bin; do
    [[ -x "$d/initdb" ]] && PG_BIN="$d"
  done
fi
[[ -x "$PG_BIN/initdb" ]] || { echo "PostgreSQL binaries not found. Set PG_BIN or use TEST_DATABASE_URL."; exit 1; }

TMP="$(mktemp -d)"
PORT="${TEST_PG_PORT:-54329}"
cleanup() { "$PG_BIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT

"$PG_BIN/initdb" -D "$TMP/data" -U postgres --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/pg.log" -w start >/dev/null
URL="postgresql://postgres@/postgres?host=$TMP&port=$PORT"

psql "${PSQL_OPTS[@]}" -d "$URL" -f "$ROOT/supabase/tests/support/supabase_stub.sql"
for m in "$ROOT"/supabase/migrations/*.sql; do
  psql "${PSQL_OPTS[@]}" -d "$URL" -f "$m"
done
psql "${PSQL_OPTS[@]}" -d "$URL" -f "$ROOT/supabase/seed.sql"
echo "✔ migrations and seed applied"
run_tests "$URL"
