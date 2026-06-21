CREATE TABLE IF NOT EXISTS waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text,
  phone      text,
  city       text,
  source     text DEFAULT 'homepage', -- e.g. 'homepage', 'therapist_landing'
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT waitlist_email_unique UNIQUE (email),
  CONSTRAINT waitlist_phone_unique UNIQUE (phone)
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Public can insert (sign up), nobody can read except service role
CREATE POLICY "Public can join waitlist" ON waitlist
  FOR INSERT TO anon, authenticated WITH CHECK (true);
