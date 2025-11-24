-- ===================================================================
-- TABLE RENTALS - Gestion des locations de numéros (hosting)
-- ===================================================================
-- Cette table stocke les numéros loués via 5sim (category='hosting')
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  service_code VARCHAR(100) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  country_code VARCHAR(50) NOT NULL,
  operator VARCHAR(100),
  duration_type VARCHAR(20) NOT NULL,
  duration_hours INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  sms_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON public.rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_order_id ON public.rentals(order_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON public.rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_expires_at ON public.rentals(expires_at);

-- RLS (Row Level Security)
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- Policy : Les utilisateurs peuvent voir uniquement leurs propres locations
CREATE POLICY "Users can view their own rentals"
  ON public.rentals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent insérer leurs propres locations
CREATE POLICY "Users can insert their own rentals"
  ON public.rentals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent mettre à jour leurs propres locations
CREATE POLICY "Users can update their own rentals"
  ON public.rentals
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_rentals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER set_rentals_updated_at
  BEFORE UPDATE ON public.rentals
  FOR EACH ROW
  EXECUTE FUNCTION update_rentals_updated_at();

-- ===================================================================
-- FONCTION POUR EXPIRER AUTOMATIQUEMENT LES LOCATIONS
-- ===================================================================
-- Cette fonction marque comme 'expired' les locations dont expires_at est dépassé
-- À exécuter périodiquement (ex: toutes les 5 minutes via cron)
-- ===================================================================

CREATE OR REPLACE FUNCTION expire_rentals()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.rentals
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- COMMENTAIRES
-- ===================================================================

COMMENT ON TABLE public.rentals IS 'Locations de numéros virtuels via 5sim (hosting)';
COMMENT ON COLUMN public.rentals.order_id IS 'ID de la commande 5sim';
COMMENT ON COLUMN public.rentals.duration_type IS 'Type de durée: 3hours, 1day, 10days, 1month';
COMMENT ON COLUMN public.rentals.duration_hours IS 'Durée en heures pour calcul countdown';
COMMENT ON COLUMN public.rentals.sms_count IS 'Nombre total de SMS reçus (mis à jour via API)';
COMMENT ON COLUMN public.rentals.status IS 'active=en cours, expired=expiré, cancelled=annulé';

-- ===================================================================
-- EXEMPLE D'UTILISATION
-- ===================================================================
-- Pour expirer manuellement les locations dépassées :
-- SELECT expire_rentals();
--
-- Pour voir toutes les locations actives d'un utilisateur :
-- SELECT * FROM public.rentals WHERE user_id = 'xxx' AND status = 'active';
-- ===================================================================
