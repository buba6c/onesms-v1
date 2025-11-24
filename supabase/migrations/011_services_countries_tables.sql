-- ============================================================================
-- Services and Countries Tables for 5sim Synchronization
-- ============================================================================

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  category TEXT DEFAULT 'other',
  icon TEXT DEFAULT '📱',
  active BOOLEAN DEFAULT true,
  popularity_score INTEGER DEFAULT 0,
  total_available INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  flag_emoji TEXT DEFAULT '🌍',
  active BOOLEAN DEFAULT true,
  price_multiplier DECIMAL(4, 2) DEFAULT 1.00,
  available_numbers INTEGER DEFAULT 0,
  provider TEXT DEFAULT '5sim',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing rules table (junction table for service x country pricing)
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_code TEXT NOT NULL,
  country_code TEXT NOT NULL,
  provider TEXT DEFAULT '5sim',
  operator TEXT,
  activation_cost DECIMAL(10, 2) DEFAULT 0.00,
  activation_price DECIMAL(10, 2) DEFAULT 0.00,
  rent_cost DECIMAL(10, 2) DEFAULT 0.00,
  rent_price DECIMAL(10, 2) DEFAULT 0.00,
  available_count INTEGER DEFAULT 0,
  margin_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN activation_cost > 0 THEN ((activation_price - activation_cost) / activation_cost * 100)
      ELSE 0
    END
  ) STORED,
  active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(service_code, country_code, operator)
);

-- Sync logs table
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('services', 'countries', 'pricing', 'full')),
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
  services_synced INTEGER DEFAULT 0,
  countries_synced INTEGER DEFAULT 0,
  prices_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  triggered_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_code ON services(code);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_popularity ON services(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_active ON countries(active);
CREATE INDEX IF NOT EXISTS idx_pricing_service_country ON pricing_rules(service_code, country_code);
CREATE INDEX IF NOT EXISTS idx_pricing_active ON pricing_rules(active);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type_status ON sync_logs(sync_type, status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_countries_updated_at ON countries;
CREATE TRIGGER update_countries_updated_at
  BEFORE UPDATE ON countries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pricing_rules_updated_at ON pricing_rules;
CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can view active services
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
CREATE POLICY "Anyone can view active services"
  ON services FOR SELECT
  USING (active = true OR auth.uid() IS NOT NULL);

-- Admins can manage services
DROP POLICY IF EXISTS "Admins can manage services" ON services;
CREATE POLICY "Admins can manage services"
  ON services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Anyone can view active countries
DROP POLICY IF EXISTS "Anyone can view active countries" ON countries;
CREATE POLICY "Anyone can view active countries"
  ON countries FOR SELECT
  USING (active = true OR auth.uid() IS NOT NULL);

-- Admins can manage countries
DROP POLICY IF EXISTS "Admins can manage countries" ON countries;
CREATE POLICY "Admins can manage countries"
  ON countries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Anyone can view active pricing
DROP POLICY IF EXISTS "Anyone can view pricing" ON pricing_rules;
CREATE POLICY "Anyone can view pricing"
  ON pricing_rules FOR SELECT
  USING (active = true OR auth.uid() IS NOT NULL);

-- Admins can manage pricing
DROP POLICY IF EXISTS "Admins can manage pricing" ON pricing_rules;
CREATE POLICY "Admins can manage pricing"
  ON pricing_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can view sync logs
DROP POLICY IF EXISTS "Admins can view sync logs" ON sync_logs;
CREATE POLICY "Admins can view sync logs"
  ON sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert initial popular services (will be updated by sync)
INSERT INTO services (code, name, display_name, category, icon, popularity_score) VALUES
  ('instagram', 'Instagram', 'Instagram + Threads', 'social', '📷', 100),
  ('whatsapp', 'WhatsApp', 'WhatsApp', 'social', '💬', 95),
  ('google', 'Google', 'Google, YouTube, Gmail', 'social', '🔍', 90),
  ('facebook', 'Facebook', 'Facebook', 'social', '👥', 85),
  ('telegram', 'Telegram', 'Telegram', 'social', '✈️', 80),
  ('tiktok', 'TikTok', 'TikTok/Douyin', 'social', '🎵', 75),
  ('twitter', 'Twitter', 'Twitter / X', 'social', '🐦', 70),
  ('apple', 'Apple', 'Apple', 'tech', '🍎', 65),
  ('microsoft', 'Microsoft', 'Microsoft', 'tech', '🪟', 60),
  ('discord', 'Discord', 'Discord', 'social', '🎮', 55)
ON CONFLICT (code) DO NOTHING;

COMMIT;
