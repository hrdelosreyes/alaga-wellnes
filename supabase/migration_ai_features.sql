-- ============================================================
-- AI FEATURES — review summaries + moderation flags
-- Paste this into Supabase > SQL Editor > Run
-- ============================================================

-- "What customers say" blurb, auto-generated from ratings
alter table therapists
  add column if not exists review_summary            text,
  add column if not exists review_summary_updated_at timestamptz;

-- Flags raised by AI moderation of chat messages and reviews
create table if not exists moderation_flags (
  id            uuid primary key default uuid_generate_v4(),
  source        text not null check (source in ('message', 'review')),
  booking_id    uuid references bookings(id) on delete cascade,
  rating_id     uuid references ratings(id) on delete cascade,
  therapist_id  uuid references therapists(id) on delete set null,
  sender        text check (sender in ('customer', 'therapist')),
  category      text not null check (category in (
    'off_platform_payment',   -- attempts to pay/book outside Alaga
    'sexual_or_harassment',   -- inappropriate or harassing content
    'safety_concern',         -- someone may be unsafe
    'scam_or_spam'            -- phishing, spam, suspicious links
  )),
  severity      text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  reason        text not null,   -- one-line AI explanation
  excerpt       text not null,   -- the flagged text
  status        text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  reviewed_at   timestamptz,
  created_at    timestamptz default now()
);

create index if not exists idx_modflags_status  on moderation_flags(status, created_at desc);
create index if not exists idx_modflags_booking on moderation_flags(booking_id);

-- Service role only (admin API routes use the service key which bypasses RLS)
alter table moderation_flags enable row level security;
