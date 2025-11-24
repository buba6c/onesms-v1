-- Migration: Add SMS-Activate Support
-- Date: 2024
-- Description: Add provider support and create rentals table

-- 1. Add provider column to activations table
ALTER TABLE activations 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'sms-activate';

-- Update existing records to be marked as 5sim
UPDATE activations 
SET provider = '5sim' 
WHERE provider IS NULL OR provider = 'sms-activate';

-- Set default back to sms-activate for new records
ALTER TABLE activations 
ALTER COLUMN provider SET DEFAULT 'sms-activate';

-- 2. Add provider column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'sms-activate';

-- 3. Add provider column to countries table
ALTER TABLE countries 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'sms-activate';

-- 4. Add provider column to pricing_rules table
ALTER TABLE pricing_rules 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'sms-activate';

-- 5. Create rentals table (NEW - for SMS-Activate rental feature)
CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rental_id TEXT NOT NULL UNIQUE, -- SMS-Activate rental ID
  phone TEXT NOT NULL,
  service_code TEXT NOT NULL,
  country_code TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  rent_hours INTEGER NOT NULL, -- Rental duration in hours
  status TEXT DEFAULT 'active', -- active, expired, cancelled
  end_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Add indexes for rentals
CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_rental_id ON rentals(rental_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_end_date ON rentals(end_date);

-- 7. Add RLS policies for rentals
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own rentals
CREATE POLICY "Users can view own rentals" ON rentals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own rentals
CREATE POLICY "Users can create own rentals" ON rentals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own rentals
CREATE POLICY "Users can update own rentals" ON rentals
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 8. Update transactions table to support rental references
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS related_rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_related_rental_id ON transactions(related_rental_id);

-- 9. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger for rentals updated_at
DROP TRIGGER IF EXISTS update_rentals_updated_at ON rentals;
CREATE TRIGGER update_rentals_updated_at
  BEFORE UPDATE ON rentals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Add provider index to existing tables for faster queries
CREATE INDEX IF NOT EXISTS idx_activations_provider ON activations(provider);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider);
CREATE INDEX IF NOT EXISTS idx_countries_provider ON countries(provider);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_provider ON pricing_rules(provider);

-- 12. Update transaction types enum to include rental types
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'purchase', 'refund', 'withdrawal', 'rental', 'rental_extension', 'admin_adjustment'));

COMMENT ON TABLE rentals IS 'Stores rented phone numbers from SMS-Activate with SMS inbox access';
COMMENT ON COLUMN rentals.rental_id IS 'Unique rental ID from SMS-Activate API';
COMMENT ON COLUMN rentals.rent_hours IS 'Rental duration in hours (e.g., 4, 24, 168, 720)';
COMMENT ON COLUMN rentals.status IS 'Rental status: active, expired, cancelled';
COMMENT ON COLUMN activations.provider IS 'SMS provider: sms-activate or 5sim';
