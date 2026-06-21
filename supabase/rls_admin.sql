-- Temporary open policy for admin dashboard (no auth yet)
-- Replace with auth.uid() check once admin login is added

create policy "Admin can update bookings"
  on bookings for update
  using (true);
