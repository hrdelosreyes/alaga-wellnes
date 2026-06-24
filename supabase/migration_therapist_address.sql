-- Therapist home address: street (address) + home barangay (psgc + name).
-- City is the therapist's existing city_id. Run in Supabase SQL Editor.
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS address               TEXT;  -- street
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS address_barangay_psgc TEXT;
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS address_barangay      TEXT;  -- barangay name (display)

NOTIFY pgrst, 'reload schema';
