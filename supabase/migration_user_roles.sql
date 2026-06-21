-- User roles for admin and staff access control
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    text NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Only the user themselves or service role can read their own role
CREATE POLICY "Users can read own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can insert/update roles (no self-promotion)
CREATE POLICY "Service role manages roles"
  ON user_roles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
