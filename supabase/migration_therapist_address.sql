-- Optional therapist address (admin-editable record). Run in Supabase SQL Editor.
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS address TEXT;
