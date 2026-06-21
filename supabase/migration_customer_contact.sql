-- Add customer contact fields to bookings so therapists can receive them via SMS
alter table bookings
  add column if not exists customer_name  text,
  add column if not exists customer_phone text;
