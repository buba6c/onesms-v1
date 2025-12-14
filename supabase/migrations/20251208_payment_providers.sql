-- ============================================================================
-- TABLE POUR GÉRER LES FOURNISSEURS DE PAIEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT UNIQUE NOT NULL, -- 'paydunya', 'moneyfusion', 'paytech'
  provider_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0, -- Ordre d'affichage
  config JSONB DEFAULT '{}', -- Clés API et configuration
  supported_methods JSONB DEFAULT '[]', -- ['orange-money', 'wave', 'card']
  fees_config JSONB DEFAULT '{}', -- Configuration des frais
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_payment_providers_active ON payment_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_providers_priority ON payment_providers(priority);

-- Insérer les fournisseurs par défaut
INSERT INTO payment_providers (provider_code, provider_name, is_active, is_default, priority, supported_methods, description, logo_url) VALUES
('paydunya', 'PayDunya', false, false, 1, 
  '["orange-money-senegal", "wave-senegal", "free-money-senegal", "expresso-sn", "wizall-senegal", "card", "mtn-benin", "moov-benin"]'::jsonb,
  'Plateforme de paiement mobile money africaine avec 19 opérateurs supportés',
  'https://paydunya.com/assets/img/logo.png'),
  
('moneyfusion', 'MoneyFusion', true, true, 2,
  '["orange-money", "wave", "card"]'::jsonb,
  'Solution de paiement mobile money pour l''Afrique de l''Ouest',
  null),
  
('paytech', 'Paytech', true, false, 3,
  '["orange-money", "wave", "free-money", "card"]'::jsonb,
  'Passerelle de paiement sénégalaise',
  null)
ON CONFLICT (provider_code) DO NOTHING;

-- RLS
ALTER TABLE payment_providers ENABLE ROW LEVEL SECURITY;

-- Tous peuvent voir les providers actifs
CREATE POLICY "Anyone can view active providers" ON payment_providers
  FOR SELECT USING (is_active = true);

-- Seuls les admins peuvent tout voir et modifier
CREATE POLICY "Admins can view all providers" ON payment_providers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update providers" ON payment_providers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert providers" ON payment_providers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role full access" ON payment_providers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_payment_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_providers_updated_at
  BEFORE UPDATE ON payment_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_providers_updated_at();

-- Table pour logger les changements de configuration
CREATE TABLE IF NOT EXISTS payment_provider_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES payment_providers(id),
  admin_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- 'activated', 'deactivated', 'updated_config', 'set_default'
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_logs_provider ON payment_provider_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_logs_admin ON payment_provider_logs(admin_id);

ALTER TABLE payment_provider_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view logs" ON payment_provider_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role can insert logs" ON payment_provider_logs
  FOR INSERT TO service_role WITH CHECK (true);
