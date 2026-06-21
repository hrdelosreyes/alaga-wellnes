-- Alaga Bonus (Quarterly Bonus Pool)
-- 5% of every completed booking's subtotal goes into the pool
-- Distributed quarterly to therapists who completed >= 15 bookings that quarter

CREATE TABLE IF NOT EXISTS alaga_bonus_pool (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id           uuid NOT NULL UNIQUE REFERENCES bookings(id),
  therapist_id         uuid NOT NULL REFERENCES therapists(id),
  amount               int  NOT NULL,  -- 5% of booking subtotal
  quarter              text NOT NULL,  -- e.g. '2026-Q2'
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alaga_bonus_pool_quarter_idx      ON alaga_bonus_pool(quarter);
CREATE INDEX IF NOT EXISTS alaga_bonus_pool_therapist_id_idx ON alaga_bonus_pool(therapist_id);

-- Tracks quarterly payouts per therapist
CREATE TABLE IF NOT EXISTS alaga_bonus_payouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id    uuid NOT NULL REFERENCES therapists(id),
  quarter         text NOT NULL,        -- e.g. '2026-Q2'
  booking_count   int  NOT NULL,        -- bookings that quarter (must be >= 15 to qualify)
  pool_share      int  NOT NULL,        -- their proportional share in pesos
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at         timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (therapist_id, quarter)
);

CREATE INDEX IF NOT EXISTS alaga_bonus_payouts_quarter_idx ON alaga_bonus_payouts(quarter);
CREATE INDEX IF NOT EXISTS alaga_bonus_payouts_status_idx  ON alaga_bonus_payouts(status);
