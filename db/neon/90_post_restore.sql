-- ============================================================
--  Run AFTER restoring the Supabase public schema + data.
-- ============================================================
-- pg_dump is run with --no-privileges (Supabase-internal roles don't exist
-- on Neon), so re-apply Supabase's default grants on public. Row-level
-- security policies came across with the schema and still apply.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Triggers on auth.users live outside the public schema, so pg_dump of
-- `public` doesn't include them. Recreate the customer-profile trigger.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'handle_new_customer') then
    drop trigger if exists on_auth_user_created_customer on auth.users;
    create trigger on_auth_user_created_customer
      after insert on auth.users
      for each row execute function public.handle_new_customer();
  end if;
end $$;
