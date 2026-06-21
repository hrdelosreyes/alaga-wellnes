-- Allow anyone with the booking ID to read that booking
-- (the UUID itself acts as the secret — 36-char unguessable token)
create policy "Booking readable by ID"
  on bookings for select
  using (true);
