#!/usr/bin/env bash
# ============================================================
#  Copy the Alaga Wellness database from Supabase to Neon
# ============================================================
# Usage:
#   SUPABASE_DB_URL='postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres' \
#   NEON_DATABASE_URL='postgresql://neondb_owner:<pw>@ep-xxx.<region>.aws.neon.tech/neondb?sslmode=require' \
#   ./scripts/migrate-db-from-supabase.sh
#
#   SUPABASE_DB_URL   Supabase "Session pooler" (port 5432) or direct connection
#                     string — NOT the transaction pooler (6543).
#   NEON_DATABASE_URL Neon *direct* (non "-pooler") connection string of an
#                     EMPTY database.
#
# Requires psql + pg_dump whose major version is >= the Supabase Postgres
# version (Supabase is on 15 or 17: `brew install postgresql@17`).
#
# What it does:
#   1. Installs the Supabase compatibility layer on Neon (db/neon/00_*.sql)
#   2. Creates the extensions the Supabase DB uses (where Neon supports them)
#   3. Copies auth.users (emails, bcrypt password hashes, metadata) so
#      everyone keeps their existing password
#   4. Copies the whole `public` schema — tables, data, indexes, functions,
#      triggers and RLS policies — with pg_dump
#   5. Re-applies grants + the auth.users trigger (db/neon/90_*.sql)
#   6. Compares row counts table-by-table
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL}"
: "${NEON_DATABASE_URL:?Set NEON_DATABASE_URL}"

cd "$(dirname "$0")/.."
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

src()  { psql "$SUPABASE_DB_URL"   -X -q -v ON_ERROR_STOP=1 "$@"; }
dest() { psql "$NEON_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

echo "→ Checking the Neon database is empty"
existing=$(dest -Atc "select count(*) from pg_tables where schemaname = 'public'")
if [ "$existing" != "0" ] && [ "${FORCE:-}" != "1" ]; then
  echo "  Neon already has $existing tables in public. Use an empty database (or FORCE=1)." >&2
  exit 1
fi

echo "→ 1/6 Installing Supabase compatibility layer on Neon"
dest -f db/neon/00_supabase_compat.sql

echo "→ 2/6 Creating extensions"
skip="'plpgsql','uuid-ossp','pgcrypto','pg_graphql','pg_stat_statements','pgsodium','supabase_vault','pgjwt','pg_net','pgaudit','pg_cron','supautils','wrappers','pgtap','plpgsql_check','index_advisor','hypopg','pg_hashids'"
for ext in $(src -Atc "select extname from pg_extension where extname not in ($skip)"); do
  if dest -c "create extension if not exists \"$ext\" with schema extensions" 2>/dev/null; then
    echo "  + $ext"
  else
    echo "  ! $ext is not available on Neon — check any columns/functions that use it" >&2
  fi
done

echo "→ 3/6 Copying auth.users"
src -c "\copy (select id, email, encrypted_password, email_confirmed_at, phone,
                       coalesce(raw_user_meta_data, '{}'::jsonb), coalesce(raw_app_meta_data, '{}'::jsonb),
                       coalesce(created_at, now()), updated_at, last_sign_in_at
                from auth.users) to '$WORK/users.csv' with (format csv)"
dest -c "\copy auth.users (id, email, encrypted_password, email_confirmed_at, phone,
                           raw_user_meta_data, raw_app_meta_data, created_at, updated_at, last_sign_in_at)
         from '$WORK/users.csv' with (format csv)"
echo "  $(wc -l < "$WORK/users.csv" | tr -d ' ') users"

echo "→ 4/6 Copying the public schema (tables, data, functions, triggers, RLS policies)"
pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner --no-privileges --no-publications --no-subscriptions \
  --format=plain --file="$WORK/public.sql"
# Drop statements that only make sense inside Supabase.
grep -v -E '^(CREATE SCHEMA public;|COMMENT ON SCHEMA public|ALTER PUBLICATION|SET transaction_timeout)' \
  "$WORK/public.sql" > "$WORK/public.clean.sql"
dest -1 -f "$WORK/public.clean.sql" > /dev/null

echo "→ 5/6 Re-applying grants and auth.users triggers"
dest -f db/neon/90_post_restore.sql

echo "→ 6/6 Verifying row counts"
mismatch=0
for t in $(src -Atc "select tablename from pg_tables where schemaname = 'public' order by 1"); do
  a=$(src  -Atc "select count(*) from public.\"$t\"")
  b=$(dest -Atc "select count(*) from public.\"$t\"")
  flag="ok"; [ "$a" = "$b" ] || { flag="MISMATCH"; mismatch=1; }
  printf "  %-28s supabase=%-8s neon=%-8s %s\n" "$t" "$a" "$b" "$flag"
done
a=$(src -Atc "select count(*) from auth.users"); b=$(dest -Atc "select count(*) from auth.users")
printf "  %-28s supabase=%-8s neon=%-8s %s\n" "auth.users" "$a" "$b" "$([ "$a" = "$b" ] && echo ok || echo MISMATCH)"
[ "$a" = "$b" ] || mismatch=1

if [ "$mismatch" = "1" ]; then
  echo "✗ Row counts differ — investigate before switching traffic." >&2
  exit 1
fi
echo "✓ Database copied. Next: node scripts/migrate-storage-from-supabase.mjs"
