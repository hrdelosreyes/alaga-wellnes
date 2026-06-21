-- ============================================================
-- SEED: Therapist availability for the next 30 days
-- Run this in Supabase > SQL Editor after schema.sql
-- Safe to re-run (ON CONFLICT DO NOTHING)
-- ============================================================

-- Maria S. — available every day
insert into therapist_availability (therapist_id, date, start_time, end_time, is_blocked)
select
  t.id,
  (current_date + s.i)::date,
  '09:00'::time,
  '21:00'::time,
  false
from therapists t, generate_series(0, 30) as s(i)
where t.phone = '+639171234001'
on conflict (therapist_id, date) do nothing;

-- Ana R. — available Mon–Sat (not Sunday)
insert into therapist_availability (therapist_id, date, start_time, end_time, is_blocked)
select
  t.id,
  (current_date + s.i)::date,
  '09:00'::time,
  '21:00'::time,
  false
from therapists t, generate_series(0, 30) as s(i)
where t.phone = '+639171234002'
  and extract(dow from (current_date + s.i)) != 0  -- 0 = Sunday
on conflict (therapist_id, date) do nothing;

-- Carla M. — available Tue–Sun (not Monday, her rest day)
insert into therapist_availability (therapist_id, date, start_time, end_time, is_blocked)
select
  t.id,
  (current_date + s.i)::date,
  '09:00'::time,
  '21:00'::time,
  false
from therapists t, generate_series(0, 30) as s(i)
where t.phone = '+639171234003'
  and extract(dow from (current_date + s.i)) != 1  -- 1 = Monday
on conflict (therapist_id, date) do nothing;

-- Jose B. — available Mon/Wed/Fri/Sat/Sun only
insert into therapist_availability (therapist_id, date, start_time, end_time, is_blocked)
select
  t.id,
  (current_date + s.i)::date,
  '09:00'::time,
  '21:00'::time,
  false
from therapists t, generate_series(0, 30) as s(i)
where t.phone = '+639171234004'
  and extract(dow from (current_date + s.i)) in (0, 1, 3, 5, 6)
on conflict (therapist_id, date) do nothing;

-- Liza T. — available every day except Wednesday
insert into therapist_availability (therapist_id, date, start_time, end_time, is_blocked)
select
  t.id,
  (current_date + s.i)::date,
  '09:00'::time,
  '21:00'::time,
  false
from therapists t, generate_series(0, 30) as s(i)
where t.phone = '+639171234005'
  and extract(dow from (current_date + s.i)) != 3  -- 3 = Wednesday
on conflict (therapist_id, date) do nothing;
