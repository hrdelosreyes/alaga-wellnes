-- Customer accounts (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS customers (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  phone      text,
  email      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Customers can only read/update their own row
CREATE POLICY "customers_self" ON customers
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Link bookings to customer accounts
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);

CREATE INDEX IF NOT EXISTS bookings_customer_id_idx ON bookings(customer_id);
