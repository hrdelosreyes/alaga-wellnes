-- ============================================================
-- PAYOUT DETAILS
-- Captures WHERE each therapist gets paid, and HOW each payout
-- was actually sent (method + destination snapshot + reference no).
-- Manual disbursement for launch; upgradeable to an API later.
-- ============================================================

-- 1. Where to send a therapist's earnings (they fill this in their portal)
ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS payout_method         text
    CHECK (payout_method IN ('gcash', 'maya', 'bank')),
  ADD COLUMN IF NOT EXISTS payout_account_name   text,   -- name on the account (must match for compliance)
  ADD COLUMN IF NOT EXISTS payout_account_number text,   -- GCash/Maya mobile no. OR bank account no.
  ADD COLUMN IF NOT EXISTS payout_bank_name      text;   -- bank name (only when method = 'bank')

-- 2. How each payout was sent (audit trail on the existing records)
ALTER TABLE payout_records
  ADD COLUMN IF NOT EXISTS method        text,   -- snapshot of payout_method at time of sending
  ADD COLUMN IF NOT EXISTS destination   text,   -- snapshot e.g. "GCash · 0917xxxxxxx · Juan Cruz"
  ADD COLUMN IF NOT EXISTS reference_no  text,   -- transaction / reference number from GCash/bank
  ADD COLUMN IF NOT EXISTS period_start  date,   -- weekly batch period covered (optional)
  ADD COLUMN IF NOT EXISTS period_end    date,
  ADD COLUMN IF NOT EXISTS notes         text;

NOTIFY pgrst, 'reload schema';
