-- ============================================================
-- ALAGA WELLNESS — Database Schema
-- Paste this into Supabase > SQL Editor > Run
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- THERAPISTS (must come before customers)
-- ============================================================
create table therapists (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  phone           text not null unique,
  photo_url       text,
  gender          text not null check (gender in ('male', 'female')),
  zone            text not null default 'BGC',
  rating_avg      numeric(3,2) default 0,
  total_bookings  integer default 0,
  is_active       boolean default true,
  nbi_cleared     boolean default false,
  tesda_certified boolean default false,
  specialties     text[] default '{}',
  bio             text,
  created_at      timestamptz default now()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table customers (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  phone                 text not null unique,
  email                 text not null unique,
  favorite_therapist_id uuid references therapists(id) on delete set null,
  created_at            timestamptz default now()
);

-- ============================================================
-- THERAPIST AVAILABILITY
-- ============================================================
create table therapist_availability (
  id            uuid primary key default uuid_generate_v4(),
  therapist_id  uuid not null references therapists(id) on delete cascade,
  date          date not null,
  start_time    time not null default '09:00',
  end_time      time not null default '21:00',
  is_blocked    boolean default false,
  created_at    timestamptz default now(),
  unique (therapist_id, date)
);

-- ============================================================
-- BOOKINGS
-- ============================================================
create table bookings (
  id                        uuid primary key default uuid_generate_v4(),
  customer_id               uuid references customers(id) on delete set null,
  service_id                text not null,
  therapist_id              uuid references therapists(id) on delete set null,
  booking_date              date not null,
  time_slot                 time not null,
  address                   text not null,
  lat                       numeric(10,7),
  lng                       numeric(10,7),
  unit_notes                text,
  therapist_gender_pref     text not null default 'any'
                              check (therapist_gender_pref in ('any','male','female')),
  customer_notes            text,
  has_table                 boolean default false,
  transport_fee             integer default 100,
  subtotal                  integer not null,
  discount                  integer default 0,
  total                     integer not null,
  status                    text not null default 'pending_payment'
                              check (status in ('pending_payment','confirmed','assigned','en_route','checked_in','completed','cancelled')),
  therapist_selection_mode  text not null default 'best_available'
                              check (therapist_selection_mode in ('best_available','customer_pick','favorite')),
  slot_held_until           timestamptz,
  payment_status            text not null default 'pending'
                              check (payment_status in ('pending','paid','refunded')),
  hitpay_payment_id         text,
  hitpay_payment_request_id text,
  checked_in_at             timestamptz,
  checked_out_at            timestamptz,
  admin_notes               text,
  created_at                timestamptz default now()
);

-- ============================================================
-- RATINGS
-- ============================================================
create table ratings (
  id            uuid primary key default uuid_generate_v4(),
  booking_id    uuid not null unique references bookings(id) on delete cascade,
  customer_id   uuid references customers(id) on delete set null,
  therapist_id  uuid references therapists(id) on delete set null,
  stars         integer not null check (stars between 1 and 5),
  tags          text[] default '{}',
  review_text   text,
  tip_amount    integer default 0,
  created_at    timestamptz default now()
);

-- ============================================================
-- PROMO CODES
-- ============================================================
create table promo_codes (
  id              uuid primary key default uuid_generate_v4(),
  code            text not null unique,
  discount_type   text not null check (discount_type in ('fixed', 'percent')),
  discount_value  integer not null,
  max_uses        integer,
  times_used      integer default 0,
  expires_at      timestamptz,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- ============================================================
-- PAYOUT RECORDS
-- ============================================================
create table payout_records (
  id            uuid primary key default uuid_generate_v4(),
  therapist_id  uuid not null references therapists(id) on delete cascade,
  booking_id    uuid references bookings(id) on delete set null,
  amount        integer not null,
  status        text not null default 'pending' check (status in ('pending','sent')),
  sent_at       timestamptz,
  created_at    timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_bookings_date           on bookings(booking_date);
create index idx_bookings_status         on bookings(status);
create index idx_bookings_therapist      on bookings(therapist_id);
create index idx_bookings_customer       on bookings(customer_id);
create index idx_availability_date       on therapist_availability(date);
create index idx_availability_therapist  on therapist_availability(therapist_id);

-- ============================================================
-- FUNCTION: Recalculate therapist rating on new review
-- ============================================================
create or replace function update_therapist_rating()
returns trigger as $$
begin
  update therapists
  set
    rating_avg     = (select round(avg(stars)::numeric, 2) from ratings where therapist_id = new.therapist_id),
    total_bookings = (select count(*) from bookings where therapist_id = new.therapist_id and status = 'completed')
  where id = new.therapist_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_update_rating
after insert on ratings
for each row execute function update_therapist_rating();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table customers              enable row level security;
alter table therapists             enable row level security;
alter table therapist_availability enable row level security;
alter table bookings               enable row level security;
alter table ratings                enable row level security;
alter table promo_codes            enable row level security;
alter table payout_records         enable row level security;

-- Therapists: public read (customers need to browse)
create policy "Therapists are publicly readable"
  on therapists for select using (true);

-- Therapist availability: public read
create policy "Availability is publicly readable"
  on therapist_availability for select using (true);

-- Promo codes: public read for active ones
create policy "Active promos are publicly readable"
  on promo_codes for select using (is_active = true);

-- All other tables: service role only (server-side API routes use service key which bypasses RLS)

-- ============================================================
-- SEED: Sample therapists for development
-- ============================================================
insert into therapists (name, phone, gender, zone, rating_avg, total_bookings, is_active, nbi_cleared, tesda_certified, specialties, bio)
values
  ('Maria S.', '+639171234001', 'female', 'BGC',    4.9, 128, true, true, true,
   ARRAY['Relaxation','Deep Tissue','Hilot'],
   'Calm and thorough. Specializes in stress relief and tension release.'),
  ('Ana R.',   '+639171234002', 'female', 'BGC',    4.8,  96, true, true, true,
   ARRAY['Deep Tissue','Sports Recovery'],
   'Strong, focused technique. Clients love her for back and shoulder work.'),
  ('Carla M.', '+639171234003', 'female', 'Makati', 4.9, 210, true, true, true,
   ARRAY['Relaxation','Hilot','Postpartum'],
   'Gentle and attentive. Highly sought after for postpartum and senior care.'),
  ('Jose B.',  '+639171234004', 'male',   'BGC',    4.7,  74, true, true, false,
   ARRAY['Deep Tissue','Sports Recovery'],
   'Firm pressure, excellent for athletic recovery and chronic pain relief.'),
  ('Liza T.',  '+639171234005', 'female', 'Makati', 4.8, 153, true, true, true,
   ARRAY['Relaxation','Foot Spa','Senior Care'],
   'Patient and reassuring. Families often book her for elderly parents.');
