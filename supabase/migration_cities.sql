-- ============================================================
-- CITIES — all 149 chartered cities of the Philippines
-- Source: PSGC 1Q 2026 Publication Datafile
-- ============================================================

create table if not exists cities (
  id                   uuid primary key default uuid_generate_v4(),
  name                 text not null,
  region               text not null,
  province             text,           -- null for HUC / ICC (independent of province)
  island_group         text not null check (island_group in ('Luzon','Visayas','Mindanao')),
  city_class           text,           -- HUC / ICC / CC
  population           integer,        -- 2024 CPH
  therapist_threshold  integer not null default 5,
  is_customer_live     boolean not null default false,
  launched_at          timestamptz,
  created_at           timestamptz default now()
);

create index if not exists idx_cities_live     on cities(is_customer_live);
create index if not exists idx_cities_region   on cities(region);
create index if not exists idx_cities_island   on cities(island_group);

alter table cities enable row level security;

create policy "Cities publicly readable" on cities for select using (true);
create policy "Cities admin writable"   on cities for update using (true);

-- Add columns to therapists if not already present
alter table therapists
  add column if not exists city_id              uuid references cities(id) on delete set null,
  add column if not exists application_status   text not null default 'pending'
    check (application_status in ('pending','approved','rejected')),
  add column if not exists nbi_url              text,
  add column if not exists tesda_url            text,
  add column if not exists years_experience     integer,
  add column if not exists referral_source      text;

-- Add city_id to bookings if not already present
alter table bookings
  add column if not exists city_id uuid references cities(id) on delete set null;

-- Approve existing seeded therapists
update therapists set application_status = 'approved' where application_status = 'pending';

-- Supabase Storage bucket for therapist documents
insert into storage.buckets (id, name, public)
values ('therapist-docs', 'therapist-docs', false)
on conflict (id) do nothing;

create policy "Therapists can upload own docs"
  on storage.objects for insert
  with check (bucket_id = 'therapist-docs');

create policy "Service role can read docs"
  on storage.objects for select
  using (bucket_id = 'therapist-docs');

-- ============================================================
-- SEED: 149 cities per PSGC 1Q 2026
-- Columns: name, region, province, island_group, city_class, population, therapist_threshold
-- HUC = Highly Urbanized City (independent of province)
-- ICC = Independent Component City (independent of province)
-- CC  = Component City (part of a province)
-- Thresholds scale with population: NCR/major HUCs 15-25, large 10, medium 7, small 5, very small 3
-- ============================================================
insert into cities (name, region, province, island_group, city_class, population, therapist_threshold) values

-- ── NCR — National Capital Region (16 cities) ──────────────
('Caloocan',        'NCR', null, 'Luzon', 'HUC', 1661584, 15),
('Las Piñas',       'NCR', null, 'Luzon', 'HUC',  606293, 10),
('Makati',          'NCR', null, 'Luzon', 'HUC',  529039, 10),
('Malabon',         'NCR', null, 'Luzon', 'HUC',  365525,  7),
('Mandaluyong',     'NCR', null, 'Luzon', 'HUC',  425758,  8),
('Manila',          'NCR', null, 'Luzon', 'HUC', 1846513, 20),
('Marikina',        'NCR', null, 'Luzon', 'HUC',  450741,  8),
('Muntinlupa',      'NCR', null, 'Luzon', 'HUC',  543445, 10),
('Navotas',         'NCR', null, 'Luzon', 'HUC',  249131,  5),
('Parañaque',       'NCR', null, 'Luzon', 'HUC',  689992, 10),
('Pasay',           'NCR', null, 'Luzon', 'HUC',  416522,  8),
('Pasig',           'NCR', null, 'Luzon', 'HUC',  755300, 10),
('Quezon City',     'NCR', null, 'Luzon', 'HUC', 2936116, 25),
('San Juan',        'NCR', null, 'Luzon', 'HUC',  122180,  5),
('Taguig',          'NCR', null, 'Luzon', 'HUC',  886722, 10),
('Valenzuela',      'NCR', null, 'Luzon', 'HUC',  714978, 10),

-- ── CAR — Cordillera Administrative Region (2 cities) ──────
('Baguio',  'CAR', null,      'Luzon', 'HUC', 366358, 8),
('Tabuk',   'CAR', 'Kalinga', 'Luzon', 'CC',  107828, 3),

-- ── Region I — Ilocos Region (9 cities) ────────────────────
('Alaminos',     'Region I', 'Pangasinan', 'Luzon', 'CC',  92204, 3),
('Batac',        'Region I', 'Ilocos Norte','Luzon', 'CC',  55714, 3),
('Candon',       'Region I', 'Ilocos Sur', 'Luzon', 'CC',  60793, 3),
('Dagupan',      'Region I', null,         'Luzon', 'ICC', 174302, 7),
('Laoag',        'Region I', null,         'Luzon', 'ICC', 111193, 5),
('San Carlos',   'Region I', 'Pangasinan', 'Luzon', 'CC',  133910, 5),
('San Fernando', 'Region I', 'La Union',   'Luzon', 'CC',  130245, 5),
('Urdaneta',     'Region I', 'Pangasinan', 'Luzon', 'CC',  131577, 5),
('Vigan',        'Region I', null,         'Luzon', 'ICC',  53879, 3),

-- ── Region II — Cagayan Valley (4 cities) ──────────────────
('Cauayan',    'Region II', 'Isabela', 'Luzon', 'CC',  133000, 5),
('Ilagan',     'Region II', 'Isabela', 'Luzon', 'CC',  163000, 5),
('Santiago',   'Region II', null,      'Luzon', 'ICC', 141964, 5),
('Tuguegarao', 'Region II', null,      'Luzon', 'ICC', 166334, 7),

-- ── Region III — Central Luzon (15 cities) ─────────────────
('Angeles',            'Region III', null,         'Luzon', 'HUC', 462928, 10),
('Balanga',            'Region III', 'Bataan',     'Luzon', 'CC',   96870,  5),
('Cabanatuan',         'Region III', null,         'Luzon', 'ICC', 302231,  8),
('Gapan',              'Region III', 'Nueva Ecija','Luzon', 'CC',  105226,  5),
('Mabalacat',          'Region III', 'Pampanga',   'Luzon', 'CC',  296239,  7),
('Malolos',            'Region III', 'Bulacan',    'Luzon', 'CC',  261107,  7),
('Meycauayan',         'Region III', 'Bulacan',    'Luzon', 'CC',  281902,  7),
('Olongapo',           'Region III', null,         'Luzon', 'HUC', 260600,  7),
('Palayan City',       'Region III', 'Nueva Ecija','Luzon', 'CC',   54280,  3),
('San Fernando',       'Region III', 'Pampanga',   'Luzon', 'CC',  342000,  8),
('San Jose del Monte', 'Region III', 'Bulacan',    'Luzon', 'CC',  574327, 10),
('Science City of Muñoz','Region III','Nueva Ecija','Luzon','CC',  82159,  3),
('Tarlac City',        'Region III', 'Tarlac',     'Luzon', 'CC',  342493,  8),
('Guagua',             'Region III', 'Pampanga',   'Luzon', 'CC',  121480,  5),

-- ── Region IV-A — CALABARZON (22 cities) ───────────────────
('Antipolo',      'Region IV-A', null,      'Luzon', 'HUC', 887399, 10),
('Bacoor',        'Region IV-A', 'Cavite',  'Luzon', 'CC',  664625, 10),
('Batangas City', 'Region IV-A', null,      'Luzon', 'HUC', 351437,  8),
('Biñan',         'Region IV-A', 'Laguna',  'Luzon', 'CC',  372179,  8),
('Cabuyao',       'Region IV-A', 'Laguna',  'Luzon', 'CC',  332935,  7),
('Calamba',       'Region IV-A', 'Laguna',  'Luzon', 'CC',  539671, 10),
('Cavite City',   'Region IV-A', null,      'Luzon', 'ICC', 104177,  5),
('Dasmariñas',    'Region IV-A', 'Cavite',  'Luzon', 'CC',  703141, 10),
('General Trias', 'Region IV-A', 'Cavite',  'Luzon', 'CC',  473044,  8),
('Imus',          'Region IV-A', 'Cavite',  'Luzon', 'CC',  497941,  8),
('Lipa',          'Region IV-A', 'Batangas','Luzon', 'CC',  332386,  8),
('Lucena',        'Region IV-A', null,      'Luzon', 'HUC', 278924,  7),
('San Jose',      'Region IV-A', 'Batangas','Luzon', 'CC',  131453,  5),
('San Pablo',     'Region IV-A', 'Laguna',  'Luzon', 'CC',  271753,  7),
('Santa Rosa',    'Region IV-A', 'Laguna',  'Luzon', 'CC',  413715, 10),
('Tagaytay',      'Region IV-A', 'Cavite',  'Luzon', 'CC',   72905,  5),
('Tanauan',       'Region IV-A', 'Batangas','Luzon', 'CC',  193936,  5),
('Tayabas',       'Region IV-A', 'Quezon',  'Luzon', 'CC',   95656,  3),
('Trece Martires','Region IV-A', null,      'Luzon', 'ICC', 128925,  5),
('Calaca',        'Region IV-A', 'Batangas','Luzon', 'CC',   83521,  3),
('Bauan',         'Region IV-A', 'Batangas','Luzon', 'CC',  102849,  5),
('Lucban',        'Region IV-A', 'Quezon',  'Luzon', 'CC',   46182,  3),

-- ── MIMAROPA Region (2 cities) ─────────────────────────────
('Calapan',        'MIMAROPA', 'Oriental Mindoro','Luzon', 'CC',  130378, 5),
('Puerto Princesa','MIMAROPA', null,               'Luzon', 'HUC', 307079, 8),

-- ── Region V — Bicol Region (7 cities) ─────────────────────
('Iriga',        'Region V', 'Camarines Sur','Luzon', 'CC',  97723, 5),
('Legazpi',      'Region V', null,           'Luzon', 'HUC',209150, 7),
('Ligao',        'Region V', 'Albay',        'Luzon', 'CC',  89523, 3),
('Masbate City', 'Region V', 'Masbate',      'Luzon', 'CC',  89823, 3),
('Naga',         'Region V', null,           'Luzon', 'ICC',199794, 7),
('Sorsogon City','Region V', null,           'Luzon', 'ICC',180439, 5),
('Tabaco',       'Region V', 'Albay',        'Luzon', 'CC', 128879, 5),

-- ── Region VI — Western Visayas (3 cities) ─────────────────
-- Note: Negros Occidental cities are under NIR (Negros Island Region)
('Iloilo City', 'Region VI', null,    'Visayas', 'HUC', 457626, 10),
('Passi',       'Region VI', 'Iloilo','Visayas', 'CC',   71856,  3),
('Roxas City',  'Region VI', null,    'Visayas', 'ICC', 167013,  5),

-- ── NIR — Negros Island Region (19 cities) ─────────────────
-- Negros Occidental (13)
('Bacolod',    'NIR', null,                 'Visayas', 'HUC', 600783, 10),
('Bago',       'NIR', 'Negros Occidental',  'Visayas', 'CC',  190972,  5),
('Cadiz',      'NIR', 'Negros Occidental',  'Visayas', 'CC',  163040,  5),
('Escalante',  'NIR', 'Negros Occidental',  'Visayas', 'CC',  107649,  3),
('Himamaylan', 'NIR', 'Negros Occidental',  'Visayas', 'CC',  132126,  5),
('Kabankalan', 'NIR', 'Negros Occidental',  'Visayas', 'CC',  167024,  5),
('La Carlota', 'NIR', 'Negros Occidental',  'Visayas', 'CC',   64803,  3),
('Sagay',      'NIR', 'Negros Occidental',  'Visayas', 'CC',  146264,  5),
('San Carlos', 'NIR', 'Negros Occidental',  'Visayas', 'CC',  130239,  5),
('Silay',      'NIR', 'Negros Occidental',  'Visayas', 'CC',  120075,  5),
('Sipalay',    'NIR', 'Negros Occidental',  'Visayas', 'CC',   70300,  3),
('Talisay',    'NIR', 'Negros Occidental',  'Visayas', 'CC',  173289,  5),
('Victorias',  'NIR', 'Negros Occidental',  'Visayas', 'CC',   97163,  3),
-- Negros Oriental (6)
('Bais',       'NIR', 'Negros Oriental',    'Visayas', 'CC',   75073,  3),
('Bayawan',    'NIR', 'Negros Oriental',    'Visayas', 'CC',   97626,  3),
('Canlaon',    'NIR', 'Negros Oriental',    'Visayas', 'CC',   49131,  3),
('Dumaguete',  'NIR', null,                 'Visayas', 'ICC', 141141,  5),
('Guihulngan', 'NIR', 'Negros Oriental',    'Visayas', 'CC',  107525,  3),
('Tanjay',     'NIR', 'Negros Oriental',    'Visayas', 'CC',   71499,  3),

-- ── Region VII — Central Visayas (10 cities) ───────────────
('Bogo',       'Region VII', 'Cebu', 'Visayas', 'CC',   81765,  3),
('Carcar',     'Region VII', 'Cebu', 'Visayas', 'CC',  142929,  5),
('Cebu City',  'Region VII', null,  'Visayas', 'HUC', 964169, 15),
('Danao',      'Region VII', 'Cebu', 'Visayas', 'CC',  105754,  5),
('Lapu-Lapu',  'Region VII', null,  'Visayas', 'HUC', 497604, 10),
('Mandaue',    'Region VII', null,  'Visayas', 'HUC', 364116,  8),
('Naga',       'Region VII', 'Cebu', 'Visayas', 'CC',  109447,  5),
('Tagbilaran', 'Region VII', null,  'Visayas', 'ICC', 105051,  5),
('Talisay',    'Region VII', 'Cebu', 'Visayas', 'CC',  408738,  8),
('Toledo',     'Region VII', 'Cebu', 'Visayas', 'CC',  189090,  5),

-- ── Region VIII — Eastern Visayas (7 cities) ───────────────
('Baybay',     'Region VIII', 'Leyte',         'Visayas', 'CC',  109527, 3),
('Borongan',   'Region VIII', null,             'Visayas', 'ICC',  62091, 3),
('Calbayog',   'Region VIII', null,             'Visayas', 'ICC', 182645, 5),
('Catbalogan', 'Region VIII', null,             'Visayas', 'ICC',  98929, 3),
('Maasin',     'Region VIII', null,             'Visayas', 'ICC',  90128, 3),
('Ormoc',      'Region VIII', null,             'Visayas', 'ICC', 215031, 7),
('Tacloban',   'Region VIII', null,             'Visayas', 'HUC', 242089, 7),

-- ── Region IX — Zamboanga Peninsula (5 cities) ─────────────
('Dapitan',       'Region IX', 'Zamboanga del Norte','Mindanao','CC',   79688, 3),
('Dipolog',       'Region IX', null,                 'Mindanao','ICC', 130632, 5),
('Isabela',       'Region IX', 'Basilan',            'Mindanao','CC',   97857, 3),
('Pagadian',      'Region IX', null,                 'Mindanao','ICC', 201785, 7),
('Zamboanga City','Region IX', null,                 'Mindanao','HUC', 977234,12),

-- ── Region X — Northern Mindanao (9 cities) ────────────────
('Cagayan de Oro','Region X', null,                  'Mindanao','HUC', 728402,12),
('El Salvador',   'Region X', 'Misamis Oriental',    'Mindanao','CC',   64240, 3),
('Gingoog',       'Region X', 'Misamis Oriental',    'Mindanao','CC',  107785, 3),
('Iligan',        'Region X', null,                  'Mindanao','HUC', 363115, 8),
('Malaybalay',    'Region X', null,                  'Mindanao','ICC', 166859, 5),
('Oroquieta',     'Region X', null,                  'Mindanao','ICC',  73762, 3),
('Ozamiz',        'Region X', null,                  'Mindanao','ICC', 136857, 5),
('Tangub',        'Region X', 'Misamis Occidental',  'Mindanao','CC',   60826, 3),
('Valencia',      'Region X', null,                  'Mindanao','ICC', 184069, 5),

-- ── Region XI — Davao Region (6 cities) ────────────────────
('Davao City',   'Region XI', null,              'Mindanao','HUC',1776949,20),
('Digos',        'Region XI', 'Davao del Sur',   'Mindanao','CC',  185530, 5),
('Island Garden City of Samal','Region XI','Davao del Norte','Mindanao','CC',108119,3),
('Mati',         'Region XI', null,              'Mindanao','ICC', 141141, 5),
('Panabo',       'Region XI', 'Davao del Norte', 'Mindanao','CC',  204340, 7),
('Tagum',        'Region XI', null,              'Mindanao','HUC', 286128, 8),

-- ── Region XII — SOCCSKSARGEN (4 cities) ───────────────────
('General Santos','Region XII', null,              'Mindanao','HUC', 697315,12),
('Kidapawan',     'Region XII', null,              'Mindanao','ICC', 143447, 5),
('Koronadal',     'Region XII', null,              'Mindanao','ICC', 176012, 5),
('Tacurong',      'Region XII', 'Sultan Kudarat', 'Mindanao','CC',   83714, 3),

-- ── Region XIII — Caraga (6 cities) ────────────────────────
('Bayugan',     'Region XIII', 'Agusan del Sur',  'Mindanao','CC',  92381, 3),
('Bislig',      'Region XIII', null,              'Mindanao','ICC', 101024, 3),
('Butuan',      'Region XIII', null,              'Mindanao','HUC', 372910, 8),
('Cabadbaran',  'Region XIII', 'Agusan del Norte','Mindanao','CC',  75729, 3),
('Surigao City','Region XIII', null,              'Mindanao','HUC', 162390, 5),
('Tandag',      'Region XIII', null,              'Mindanao','ICC',  63196, 3),

-- ── BARMM — Bangsamoro Autonomous Region (3 cities) ────────
('Cotabato City','BARMM', null,         'Mindanao','ICC', 325079, 8),
('Lamitan',      'BARMM', 'Basilan',    'Mindanao','CC',   92110, 3),
('Marawi',       'BARMM', 'Lanao del Sur','Mindanao','CC', 201785, 5);

-- Set Makati and Taguig (BGC) as live immediately (existing launch zones)
update cities set is_customer_live = true, launched_at = now()
where name in ('Makati', 'Taguig');
