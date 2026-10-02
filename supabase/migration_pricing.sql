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
-- Rates reflect a 30% reduction from the original research-based bands
-- (applied June 2026); city minimums then lowered a further 20%,
-- rounded to the nearest P5 (applied October 2026); base rates then lowered 20%, rounded to the nearest P5.
--
-- Tier 1 — NCR (all 16 cities)
--   Relax-60:   base 505,  min 420,  max 840
--   Recovery-90:base 725,  min 590,  max 1190
--   Hilot-75:   base 560,  min 475,  max 910
--
-- Tier 2 — HUC cities outside NCR (Cebu, Davao, Zamboanga, CDO,
--           Bacolod, Gen Santos, Lapu-Lapu, Mandaue, Antipolo…)
--   Relax-60:   base 420,  min 335,  max 700
--   Recovery-90:base 615,  min 475,  max 980
--   Hilot-75:   base 475,  min 390,  max 770
--
-- Tier 3 — ICC cities (independent component cities, mid-market)
--   Relax-60:   base 365,  min 280,  max 595
--   Recovery-90:base 530,  min 390,  max 840
--   Hilot-75:   base 420,  min 335,  max 665
--
-- Tier 4 — CC cities (component cities, provincial market)
--   Relax-60:   base 305,  min 225,  max 490
--   Recovery-90:base 445,  min 325,  max 700
--   Hilot-75:   base 365,  min 280,  max 560
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
      (r.id, 'relax-60',    505,  420,   840),
      (r.id, 'recovery-90', 725,  590,  1190),
      (r.id, 'hilot-75',    560,  475,   910)
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
      (r.id, 'relax-60',    420,  335,  700),
      (r.id, 'recovery-90', 615,  475,  980),
      (r.id, 'hilot-75',    475,  390,  770)
    on conflict (city_id, service_id) do update
      set base_rate = excluded.base_rate, min_rate = excluded.min_rate, max_rate = excluded.max_rate, updated_at = now();
  end loop;

  -- ── TIER 3: ICC cities ───────────────────────────────────
  for r in select id from cities where city_class = 'ICC' loop
    insert into city_service_rates (city_id, service_id, base_rate, min_rate, max_rate) values
      (r.id, 'relax-60',    365,  280,  595),
      (r.id, 'recovery-90', 530,  390,  840),
      (r.id, 'hilot-75',    420,  335,  665)
    on conflict (city_id, service_id) do update
      set base_rate = excluded.base_rate, min_rate = excluded.min_rate, max_rate = excluded.max_rate, updated_at = now();
  end loop;

  -- ── TIER 4: CC cities ────────────────────────────────────
  for r in select id from cities where city_class = 'CC' loop
    insert into city_service_rates (city_id, service_id, base_rate, min_rate, max_rate) values
      (r.id, 'relax-60',    305,  225,  490),
      (r.id, 'recovery-90', 445,  325,  700),
      (r.id, 'hilot-75',    365,  280,  560)
    on conflict (city_id, service_id) do update
      set base_rate = excluded.base_rate, min_rate = excluded.min_rate, max_rate = excluded.max_rate, updated_at = now();
  end loop;

end $$;
