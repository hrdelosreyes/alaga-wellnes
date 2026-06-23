-- Customer email + reminder tracking for transactional email notifications
-- Run in Supabase SQL Editor.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email   TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
