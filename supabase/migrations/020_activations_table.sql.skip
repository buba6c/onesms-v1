-- ============================================================================
-- Table Activations - Gestion des achats de numéros 5sim
-- ============================================================================

-- Table activations
CREATE TABLE IF NOT EXISTS activations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL UNIQUE, -- ID de la commande 5sim
  phone TEXT NOT NULL,
  service_code TEXT NOT NULL,
  country_code TEXT NOT NULL,
  operator TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, received, timeout, cancelled, completed
  sms_code TEXT,
  sms_text TEXT,
  sms_received_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_activations_user_id ON activations(user_id);
CREATE INDEX IF NOT EXISTS idx_activations_order_id ON activations(order_id);
CREATE INDEX IF NOT EXISTS idx_activations_status ON activations(status);
CREATE INDEX IF NOT EXISTS idx_activations_created_at ON activations(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_activations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activations_updated_at
  BEFORE UPDATE ON activations
  FOR EACH ROW
  EXECUTE FUNCTION update_activations_updated_at();

-- RLS Policies
ALTER TABLE activations ENABLE ROW LEVEL SECURITY;

-- Users can read their own activations
CREATE POLICY "Users can read own activations"
  ON activations FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can manage activations"
  ON activations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Admins can read all activations
CREATE POLICY "Admins can read all activations"
  ON activations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Vue pour statistiques activations
-- ============================================================================
CREATE OR REPLACE VIEW activation_stats AS
SELECT 
  user_id,
  COUNT(*) as total_activations,
  COUNT(*) FILTER (WHERE status = 'received') as successful_activations,
  COUNT(*) FILTER (WHERE status = 'timeout') as timeout_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
  SUM(price) FILTER (WHERE status = 'received') as total_spent,
  MAX(created_at) as last_activation_at
FROM activations
GROUP BY user_id;

COMMENT ON TABLE activations IS 'Gestion des activations de numéros 5sim avec facturation à la réception du SMS';
COMMENT ON COLUMN activations.status IS 'pending: En attente SMS | received: SMS reçu et facturé | timeout: Expiré et remboursé | cancelled: Annulé manuellement | completed: Terminé avec succès';
