-- Allow authenticated therapists to read and update their own bookings.
-- The therapists table links phone → id, and auth.users uses the same phone.

-- Read own bookings
create policy "Therapist can read own bookings"
  on bookings for select
  using (
    therapist_id = (
      select id from therapists
      where phone = (select phone from auth.users where id = auth.uid())
    )
  );

-- Update own bookings (check-in / check-out only)
create policy "Therapist can update own bookings"
  on bookings for update
  using (
    therapist_id = (
      select id from therapists
      where phone = (select phone from auth.users where id = auth.uid())
    )
  );
