-- Referral program

-- Each approved therapist gets a unique referral code
-- referred_by_id links to the therapist who referred them
ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS referral_code  text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_id uuid REFERENCES therapists(id);

CREATE INDEX IF NOT EXISTS therapists_referral_code_idx  ON therapists(referral_code);
CREATE INDEX IF NOT EXISTS therapists_referred_by_id_idx ON therapists(referred_by_id);

-- Tracks each commission earned per completed booking
CREATE TABLE IF NOT EXISTS referral_commissions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id           uuid NOT NULL REFERENCES bookings(id),
  source_therapist_id  uuid NOT NULL REFERENCES therapists(id),  -- whose booking triggered this
  beneficiary_id       uuid NOT NULL REFERENCES therapists(id),  -- who earns the commission
  level                int  NOT NULL CHECK (level IN (1, 2)),    -- 1 = direct referrer, 2 = referrer's referrer
  amount               int  NOT NULL,                            -- in centavos / whole pesos (same unit as bookings)
  status               text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at              timestamptz,
  created_at           timestamptz DEFAULT now(),
  UNIQUE (booking_id, beneficiary_id)                            -- one commission per beneficiary per booking
);

CREATE INDEX IF NOT EXISTS referral_commissions_beneficiary_idx ON referral_commissions(beneficiary_id);
CREATE INDEX IF NOT EXISTS referral_commissions_status_idx      ON referral_commissions(status);
