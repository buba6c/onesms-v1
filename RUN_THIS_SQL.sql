-- ============================================================================
-- SCRIPT SQL À EXÉCUTER DANS SUPABASE DASHBOARD
-- ============================================================================
-- Aller sur : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql
-- Copier-coller ce script et exécuter
-- ============================================================================

-- 1. FIX RLS POLICIES FOR USERS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;

-- Simple policy: authenticated users can see their own data
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Allow authenticated users to insert (for signup)
CREATE POLICY "Enable insert for authenticated users"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can do everything (simple check without recursion)
CREATE POLICY "Service role can manage all users"
  ON users FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR 
    (auth.uid() = id AND role = 'admin')
  );

-- 2. ADD SUCCESS_RATE AND SERVICE_ICONS TABLES
-- ============================================================================

-- Add success_rate column to countries
ALTER TABLE countries ADD COLUMN IF NOT EXISTS success_rate DECIMAL(5, 2) DEFAULT 99.00;

-- Create service_icons table for storing service logos
CREATE TABLE IF NOT EXISTS service_icons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_code TEXT UNIQUE NOT NULL REFERENCES services(code) ON DELETE CASCADE,
  icon_url TEXT,
  icon_emoji TEXT DEFAULT '📱',
  icon_type TEXT DEFAULT 'emoji' CHECK (icon_type IN ('emoji', 'url', 'upload')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_service_icons_code ON service_icons(service_code);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_service_icons_updated_at ON service_icons;
CREATE TRIGGER update_service_icons_updated_at
  BEFORE UPDATE ON service_icons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE service_icons ENABLE ROW LEVEL SECURITY;

-- Anyone can view service icons
DROP POLICY IF EXISTS "Anyone can view service icons" ON service_icons;
CREATE POLICY "Anyone can view service icons"
  ON service_icons FOR SELECT
  USING (true);

-- Admins can manage service icons
DROP POLICY IF EXISTS "Admins can manage service icons" ON service_icons;
CREATE POLICY "Admins can manage service icons"
  ON service_icons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default emoji icons for popular services
INSERT INTO service_icons (service_code, icon_emoji, icon_type) VALUES
  ('instagram', '📷', 'emoji'),
  ('whatsapp', '💬', 'emoji'),
  ('google', '🔍', 'emoji'),
  ('facebook', '👥', 'emoji'),
  ('telegram', '✈️', 'emoji'),
  ('tiktok', '🎵', 'emoji'),
  ('twitter', '🐦', 'emoji'),
  ('apple', '🍎', 'emoji'),
  ('microsoft', '🪟', 'emoji'),
  ('discord', '🎮', 'emoji'),
  ('snapchat', '👻', 'emoji'),
  ('linkedin', '💼', 'emoji'),
  ('netflix', '🎬', 'emoji'),
  ('spotify', '🎵', 'emoji'),
  ('uber', '🚗', 'emoji'),
  ('amazon', '📦', 'emoji'),
  ('paypal', '💳', 'emoji'),
  ('viber', '☎️', 'emoji'),
  ('wechat', '💬', 'emoji'),
  ('line', '💚', 'emoji')
ON CONFLICT (service_code) DO NOTHING;

-- 3. FIX RLS POLICIES FOR COUNTRIES AND SYNC_LOGS
-- ============================================================================

-- Fix countries policies (allow anonymous read for public access)
DROP POLICY IF EXISTS "Anyone can view active countries" ON countries;
DROP POLICY IF EXISTS "Admins can manage countries" ON countries;
DROP POLICY IF EXISTS "Public can view countries" ON countries;

-- Allow everyone to view active countries (no auth required)
CREATE POLICY "Public can view countries"
  ON countries FOR SELECT
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage countries"
  ON countries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fix sync_logs policies
DROP POLICY IF EXISTS "Admins can view sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Service role can manage sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Admins can view all sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Public can view sync logs" ON sync_logs;

-- Allow everyone to view latest sync status
CREATE POLICY "Public can view sync logs"
  ON sync_logs FOR SELECT
  USING (true);

-- Service role can insert
CREATE POLICY "Service role can insert sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- 4. ADD FLAG_URL COLUMN TO COUNTRIES
-- ============================================================================

-- Add column to store real flag URLs from flagcdn.com
ALTER TABLE countries 
ADD COLUMN IF NOT EXISTS flag_url TEXT;

COMMENT ON COLUMN countries.flag_url IS 'URL to the country flag image from flagcdn.com';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_countries_flag_url ON countries(flag_url) WHERE flag_url IS NOT NULL;

-- ============================================================================
-- DONE! Now click "Sync avec 5sim" in Admin → Services
-- The app will now display:
-- - Real service logos from Clearbit Logo API
-- - Real country flags from Flagcdn
-- - Fallback to emojis if images fail to load
-- ============================================================================
