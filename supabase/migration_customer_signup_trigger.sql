-- Auto-create a customer profile when a customer signs up.
-- The register form passes name/phone + is_customer=true as auth metadata;
-- this trigger creates the public.customers row with the service-definer's
-- privileges, so it works even when email confirmation is on (no session yet).
-- Therapists/admins (no is_customer flag) are skipped.

create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.raw_user_meta_data->>'is_customer') = 'true' then
    begin
      insert into public.customers (id, name, phone, email)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', ''),
        coalesce(new.raw_user_meta_data->>'phone', new.id::text),
        new.email
      )
      on conflict (id) do nothing;
    exception when unique_violation then
      -- phone/email already taken; skip profile creation (auth user still made)
      null;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_customer on auth.users;
create trigger on_auth_user_created_customer
  after insert on auth.users
  for each row execute function public.handle_new_customer();
