-- ============================================================================
-- Add success_rate to countries and create service_icons table
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

COMMIT;
