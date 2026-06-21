-- Therapist service area: which barangays a therapist will serve
create table if not exists therapist_barangays (
  therapist_id      uuid not null references therapists(id) on delete cascade,
  barangay_psgc     text not null references barangays(psgc_code) on delete cascade,
  primary key (therapist_id, barangay_psgc)
);

create index if not exists idx_tb_barangay on therapist_barangays(barangay_psgc);

alter table therapist_barangays enable row level security;
create policy "Therapist barangays publicly readable" on therapist_barangays for select using (true);
create policy "Therapist barangays writable by service role" on therapist_barangays for all using (true);

-- Also store barangay_psgc on bookings so we can filter therapists at assignment time
alter table bookings add column if not exists barangay_psgc text references barangays(psgc_code);
