-- Fix RLS policies to allow public read access for countries and sync_logs
-- This fixes the "access control checks" CORS errors

-- Countries: Allow public read access (needed for dashboard)
DROP POLICY IF EXISTS "Public can view countries" ON countries;
CREATE POLICY "Public can view countries"
  ON countries FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view countries" ON countries;
CREATE POLICY "Authenticated users can view countries"
  ON countries FOR SELECT
  TO authenticated
  USING (true);

-- Services: Allow public read access
DROP POLICY IF EXISTS "Public can view services" ON services;
CREATE POLICY "Public can view services"
  ON services FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view services" ON services;
CREATE POLICY "Authenticated users can view services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

-- Pricing rules: Allow public read access for active rules only
DROP POLICY IF EXISTS "Public can view active pricing" ON pricing_rules;
CREATE POLICY "Public can view active pricing"
  ON pricing_rules FOR SELECT
  TO public
  USING (active = true);

DROP POLICY IF EXISTS "Authenticated users can view pricing" ON pricing_rules;
CREATE POLICY "Authenticated users can view pricing"
  ON pricing_rules FOR SELECT
  TO authenticated
  USING (true);

-- Sync logs: Allow authenticated users to view (needed for admin dashboard)
DROP POLICY IF EXISTS "Authenticated can view sync logs" ON sync_logs;
CREATE POLICY "Authenticated can view sync logs"
  ON sync_logs FOR SELECT
  TO authenticated
  USING (true);

-- Service icons: Allow public read access
DROP POLICY IF EXISTS "Public can view service icons" ON service_icons;
CREATE POLICY "Public can view service icons"
  ON service_icons FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view service icons" ON service_icons;
CREATE POLICY "Authenticated users can view service icons"
  ON service_icons FOR SELECT
  TO authenticated
  USING (true);
