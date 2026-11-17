# Moving Alaga Wellness from Supabase to Vercel + Neon

The app no longer depends on Supabase. Here's what replaced each part:

| Supabase piece | Replacement | Where |
| --- | --- | --- |
| Postgres + PostgREST (`.from()` queries) | **Neon** Postgres, queried through a small Supabase-compatible query builder | `src/lib/db/*`, `POST /api/db` |
| Row-level security | Same policies, enforced by Postgres. Each request switches to the `anon`/`authenticated` role and sets the JWT claims that `auth.uid()` reads, the same way PostgREST does | `src/lib/db/execute.ts`, `db/neon/00_supabase_compat.sql` |
| Supabase Auth (GoTrue) | App-owned auth: `auth.users` on Neon (same bcrypt hashes, so **existing passwords keep working**), httpOnly JWT session cookie, emails via Resend | `src/lib/auth/server.ts`, `/api/auth/*`, `/auth/callback` |
| Storage bucket `therapist-docs` | **Vercel Blob** private store; same object paths; signed URLs served by `/api/storage/object` | `src/lib/storage/server.ts`, `/api/storage/*` |
| Realtime (chat, therapist dashboard) | Polling: chat every 3 s, dashboard every 10 s | `chat-thread.tsx`, `therapist/dashboard/page.tsx` |

Call sites are almost unchanged. `createClient()` / `createServiceClient()` keep
the same API, and only the import path changed (`@/lib/supabase/*` → `@/lib/db/*`).

## Cutover runbook

Plan for about 30 minutes of downtime. Pause new bookings while you do this.

### 1. Create the Vercel resources
1. Import the GitHub repo into Vercel if it isn't there yet. `vercel.json` already sets the daily reminders cron.
2. **Storage → Create → Neon (Postgres)**, then connect it to the project. This adds `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`.
   Pick the region closest to the Philippines (e.g. `aws-ap-southeast-1`).
3. **Storage → Create → Blob**, choosing **Private** access, and connect it. This adds `BLOB_READ_WRITE_TOKEN`.
4. Add the remaining env vars from `.env.example`: `AUTH_SECRET` (`openssl rand -base64 48`),
   `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET`, `HITPAY_*`, `NEXT_PUBLIC_APP_URL`.
5. Delete the old `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

### 2. Copy the database
You need `psql`/`pg_dump` at a version ≥ the Supabase Postgres version (`brew install postgresql@17`).

```bash
SUPABASE_DB_URL='postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres' \
NEON_DATABASE_URL="$DATABASE_URL_UNPOOLED" \
./scripts/migrate-db-from-supabase.sh
```

The script installs the compatibility layer, then copies `auth.users` and the
entire `public` schema (tables, data, functions, triggers, RLS policies). It
finishes by comparing row counts table by table and exits non-zero on any mismatch.

### 3. Copy the uploaded documents
```bash
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
SUPABASE_DB_URL=... BLOB_READ_WRITE_TOKEN=... \
node scripts/migrate-storage-from-supabase.mjs        # add --dry-run first if you like
```
The script can be re-run: files already in Blob are skipped.

### 4. Deploy and check
Redeploy on Vercel, then:
- Admin login works with the existing password, and `/admin/applicants` shows NBI/TESDA/photo previews.
- Therapist login and the dashboard load.
- A test booking works, including the HitPay sandbox step.
- Booking chat sends and receives.
- Forgot-password emails arrive from Resend and their links work.

### 5. Decommission Supabase
Keep the Supabase project paused, not deleted, for a couple of weeks as a rollback point.

## Behaviour differences to know about
- **Auth emails now come from Resend** (`bookings@alagawellness.care`), not Supabase. Links go to
  `/auth/callback?token=…`. They are single-use, and expire after 1 h (reset), 24 h (signup) or 7 days (invite).
- **Sessions from before the cutover don't carry over.** Everyone signs in once more with their usual password.
- **Unused reset or invite links sent from Supabase stop working.** Re-send any pending therapist invites from the admin panel.
- **Changing a password signs out the user's other sessions.**
- **Chat updates arrive within about 3 s** (polling) rather than instantly.
- **Document uploads are limited** to 15 MB and to JPEG/PNG/WebP/HEIC/PDF (`src/lib/storage/server.ts`).
- **Grants on `public` mirror Supabase's defaults**: `anon`/`authenticated` get table privileges, and RLS
  decides access. Several tables still have permissive `using (true)` policies carried over
  from Supabase (e.g. `bookings` update, `therapist_rates`). Tightening them is worth doing,
  but it's a separate change.

## Schema changes from now on
Run SQL directly against Neon (Neon console SQL editor, or `psql "$DATABASE_URL_UNPOOLED"`).
The old files in `supabase/` still apply on Neon thanks to the compatibility layer, except the
`storage.*` statements in `migration_cities.sql`. The query layer caches table metadata for
5 minutes and refreshes on its own when it sees an unknown table or column.
