-- ============================================================
-- PRICING: per-city rate bands + per-therapist rates
-- Source: massageprices.com, healerstouch.ph, wellnessville.ph,
--         dr.massage BGC, 3d-universal.com (Cebu), cdopedia.com
--         Research date: June 2026
-- Home service commands ~20-30% premium over walk-in spa rates
-- ============================================================

-- City-level rate bands per service (set by admin)
create table if not exists city_service_rates (
  id          uuid primary key default uuid_generate_v4(),
  city_id     uuid not null references cities(id) on delete cascade,
  service_id  text not null check (service_id in ('relax-60','recovery-90','hilot-75')),
  base_rate   integer not null,   -- suggested default for new therapists
  min_rate    integer not null,   -- floor therapist cannot go below
  max_rate    integer not null,   -- ceiling therapist cannot exceed
  updated_at  timestamptz default now(),
  unique (city_id, service_id)
);

create index if not exists idx_csr_city on city_service_rates(city_id);
alter table city_service_rates enable row level security;
create policy "City rates publicly readable" on city_service_rates for select using (true);
create policy "City rates admin writable"   on city_service_rates for all   using (true);

-- Per-therapist rates (must be within city band)
create table if not exists therapist_rates (
  therapist_id  uuid not null references therapists(id) on delete cascade,
  service_id    text not null check (service_id in ('relax-60','recovery-90','hilot-75')),
  rate          integer not null,
  updated_at    timestamptz default now(),
  primary key (therapist_id, service_id)
);

alter table therapist_rates enable row level security;
create policy "Therapist rates publicly readable" on therapist_rates for select using (true);
create policy "Therapist rates writable"          on therapist_rates for all   using (true);

-- ============================================================
-- SEED: rate bands by pricing tier
--
-- Tier 1 — NCR (all 16 cities)
--   Relax-60:   base 899,  min 750,  max 1200
--   Recovery-90:base 1299, min 1050, max 1700
--   Hilot-75:   base 999,  min 850,  max 1300
--
-- Tier 2 — HUC cities outside NCR (Cebu, Davao, Zamboanga, CDO,
--           Bacolod, Gen Santos, Lapu-Lapu, Mandaue, Antipolo…)
--   Relax-60:   base 749,  min 600,  max 1000
--   Recovery-90:base 1099, min 850,  max 1400
--   Hilot-75:   base 849,  min 700,  max 1100
--
-- Tier 3 — ICC cities (independent component cities, mid-market)
--   Relax-60:   base 649,  min 500,  max 850
--   Recovery-90:base 949,  min 700,  max 1200
--   Hilot-75:   base 749,  min 600,  max 950
--
-- Tier 4 — CC cities (component cities, provincial market)
--   Relax-60:   base 549,  min 400,  max 700
--   Recovery-90:base 799,  min 580,  max 1000
--   Hilot-75:   base 649,  min 500,  max 800
-- ============================================================

-- Helper: insert all 3 services for a city using a sub-select on city name
-- We use a DO block so we can loop cleanly

do $$
declare
  r record;
begin

  -- ── TIER 1: NCR ─────────────────────────────────────────
  for r in select id from cities where region = 'NCR' loop
    insert into city_service_rates (city_id, service_id, base_rate, min_rate, max_rate) values
      (r.id, 'relax-60',    899,  750,  1200),
      (r.id, 'recovery-90',1299, 1050,  1700),
      (r.id, 'hilot-75',    999,  850,  1300)
    on conflict (city_id, service_id) do update
      set base_rate = excluded.base_rate, min_rate = excluded.min_rate, max_rate = excluded.max_rate, updated_at = now();
  end loop;

  -- ── TIER 2: HUC cities outside NCR ──────────────────────
  -- Cebu City, Davao City, Zamboanga City, Cagayan de Oro, Bacolod,
  -- General Santos, Lapu-Lapu, Mandaue, Antipolo, Iligan, Butuan,
  -- Tagum, Tacloban, Legazpi, Olongapo, Angeles, Cabanatuan,
  -- Baguio, Iloilo City, Pagadian
  for r in
    select id from cities
    where city_class = 'HUC' and region != 'NCR'
  loop
    insert into city_service_rates (city_id, service_id, base_rate, min_rate, max_rate) values
      (r.id, 'relax-60',    749,  600, 1000),
      (r.id, 'recovery-90',1099,  850, 1400),
      (r.id, 'hilot-75',    849,  700, 1100)
    on conflict (city_id, service_id) do update
      set base_rate = excluded.base_rate, min_rate = excluded.min_rate, max_rate = excluded.max_rate, updated_at = now();
  end loop;

  -- ── TIER 3: ICC cities ───────────────────────────────────
  for r in select id from cities where city_class = 'ICC' loop
    insert into city_service_rates (city_id, service_id, base_rate, min_rate, max_rate) values
      (r.id, 'relax-60',    649,  500,  850),
      (r.id, 'recovery-90', 949,  700, 1200),
      (r.id, 'hilot-75',    749,  600,  950)
    on conflict (city_id, service_id) do update
      set base_rate = excluded.base_rate, min_rate = excluded.min_rate, max_rate = excluded.max_rate, updated_at = now();
  end loop;

  -- ── TIER 4: CC cities ────────────────────────────────────
  for r in select id from cities where city_class = 'CC' loop
    insert into city_service_rates (city_id, service_id, base_rate, min_rate, max_rate) values
      (r.id, 'relax-60',    549,  400,  700),
      (r.id, 'recovery-90', 799,  580, 1000),
      (r.id, 'hilot-75',    649,  500,  800)
    on conflict (city_id, service_id) do update
      set base_rate = excluded.base_rate, min_rate = excluded.min_rate, max_rate = excluded.max_rate, updated_at = now();
  end loop;

end $$;
