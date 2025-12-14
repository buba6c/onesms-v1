-- ============================================================================
-- TABLE POUR LOGGER LES EMAILS ENVOYÉS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  type TEXT NOT NULL, -- 'recharge_success', 'promo', 'welcome', etc.
  subject TEXT,
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  resend_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

-- RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Seul service_role peut écrire
CREATE POLICY "Service role can insert email_logs" ON email_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- Admins peuvent lire
CREATE POLICY "Admins can read email_logs" ON email_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- TABLE POUR LES CAMPAGNES PROMO (optionnel)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  promo_code TEXT,
  discount TEXT,
  target_filter JSONB DEFAULT '{}', -- {"min_balance": 0, "inactive_days": 30, etc.}
  status TEXT DEFAULT 'draft', -- 'draft', 'sending', 'sent', 'cancelled'
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns" ON email_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

SELECT 'Tables email_logs et email_campaigns créées' AS status;
