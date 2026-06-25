-- Logs each therapist accept/decline so acceptance rate can be computed
-- (a decline nulls bookings.therapist_id, so it can't be derived afterward).
-- All reads/writes go through server endpoints (service role), so RLS is on
-- with no client policy.

create table if not exists therapist_responses (
  id           uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references therapists(id) on delete cascade,
  booking_id   uuid references bookings(id) on delete set null,
  response     text not null check (response in ('accepted', 'declined')),
  created_at   timestamptz default now()
);

create index if not exists therapist_responses_therapist_idx on therapist_responses(therapist_id);

alter table therapist_responses enable row level security;
