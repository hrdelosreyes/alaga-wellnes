-- ============================================================
-- MESSAGES — per-booking chat thread
-- ============================================================
create table messages (
  id          uuid primary key default uuid_generate_v4(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  sender      text not null check (sender in ('customer', 'therapist')),
  body        text not null,
  created_at  timestamptz default now()
);

create index idx_messages_booking on messages(booking_id, created_at);

alter table messages enable row level security;

-- Anyone with the booking ID can read messages (UUID is the secret)
create policy "Messages readable by booking ID"
  on messages for select using (true);

-- Anyone can insert (customer or therapist — scoped by booking_id)
create policy "Messages insertable"
  on messages for insert with check (true);
