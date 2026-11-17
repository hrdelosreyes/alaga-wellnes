-- ============================================================
--  Alaga Wellness — Supabase compatibility layer for Neon
-- ============================================================
-- Run once on a fresh Neon database BEFORE restoring the Supabase schema.
-- Recreates the pieces of Supabase the app's schema and RLS policies depend
-- on, so they work unchanged:
--   • roles anon / authenticated / service_role (used by RLS policies)
--   • the `extensions` schema (Supabase puts uuid-ossp/pgcrypto there)
--   • auth.users (same column names as Supabase, keeps bcrypt hashes)
--   • auth.uid() / auth.role() / auth.email() / auth.jwt()
--   • auth.email_tokens (one-time links for reset / invite / confirm)
-- Safe to re-run.

-- ── Roles ───────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon')          then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')  then create role service_role nologin noinherit; end if;
end $$;

-- The app connects as the database owner and switches to anon/authenticated
-- per request (set_config('role', …)), so the owner must be a member.
do $$
begin
  execute format('grant anon, authenticated, service_role to %I', current_user);
exception when insufficient_privilege then
  raise exception 'Cannot grant anon/authenticated/service_role to %. If these roles were created by someone else (e.g. Neon Data API), run this script as the role that created them, or drop and re-run.', current_user;
end $$;

-- ── Extensions ──────────────────────────────────────────────
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto    with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

do $$
begin
  execute format('alter database %I set search_path = "$user", public, extensions', current_database());
end $$;
set search_path = "$user", public, extensions;

-- ── auth schema ─────────────────────────────────────────────
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id                    uuid primary key default gen_random_uuid(),
  email                 text,
  encrypted_password    text,
  email_confirmed_at    timestamptz,
  phone                 text,
  raw_user_meta_data    jsonb not null default '{}'::jsonb,
  raw_app_meta_data     jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz default now(),
  last_sign_in_at       timestamptz,
  -- Sessions issued before this instant are rejected (set on password change).
  sessions_valid_after  timestamptz
);
create unique index if not exists users_email_lower_key on auth.users (lower(email)) where email is not null;

-- Some policies look up the caller's phone/email (e.g. rls_therapist.sql).
-- Browser queries can only address the public schema, so this isn't exposed.
grant select (id, email, phone) on auth.users to authenticated;

create table if not exists auth.email_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token_hash  text not null unique,
  purpose     text not null check (purpose in ('recovery', 'invite', 'signup')),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists email_tokens_user_idx on auth.email_tokens (user_id);

-- ── JWT-claim helpers (same contract as Supabase/PostgREST) ──
create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), auth.jwt() ->> 'sub'), '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', 'anon')
$$;

create or replace function auth.email() returns text
language sql stable as $$
  select auth.jwt() ->> 'email'
$$;

grant execute on function auth.jwt(), auth.uid(), auth.role(), auth.email() to anon, authenticated, service_role;

-- ── Default privileges (Supabase grants these on public by default) ──
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
