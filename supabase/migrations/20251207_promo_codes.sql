-- ============================================================================
-- SYSTÈME DE CODES PROMO
-- ============================================================================

-- Table des codes promo
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Type de réduction
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' ou 'fixed'
  discount_value NUMERIC NOT NULL, -- % ou montant fixe en activations
  
  -- Limites
  min_purchase NUMERIC DEFAULT 0, -- Montant minimum d'achat (en activations)
  max_discount NUMERIC, -- Réduction maximum (pour les %)
  
  -- Validité
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  
  -- Utilisation
  max_uses INT, -- NULL = illimité
  max_uses_per_user INT DEFAULT 1, -- Nombre d'utilisations par user
  current_uses INT DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Métadonnées
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des utilisations de codes promo
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  discount_applied NUMERIC NOT NULL, -- Réduction appliquée en activations
  original_amount NUMERIC NOT NULL, -- Montant original
  final_amount NUMERIC NOT NULL, -- Montant après réduction
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un user ne peut utiliser un code qu'un nombre limité de fois
  UNIQUE(promo_code_id, user_id, transaction_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_code ON promo_code_uses(promo_code_id);

-- RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Policies pour promo_codes (ignore if exists)
DO $$ BEGIN
  CREATE POLICY "Anyone can read active promo codes" ON promo_codes
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage promo codes" ON promo_codes
    FOR ALL USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies pour promo_code_uses (ignore if exists)
DO $$ BEGIN
  CREATE POLICY "Users can see their own promo uses" ON promo_code_uses
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert promo uses" ON promo_code_uses
    FOR INSERT TO service_role WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read all promo uses" ON promo_code_uses
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FONCTION POUR VALIDER UN CODE PROMO
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code TEXT,
  p_user_id UUID,
  p_purchase_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_user_uses INT;
  v_discount NUMERIC;
BEGIN
  -- Chercher le code promo
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code promo invalide');
  END IF;
  
  -- Vérifier les dates
  IF v_promo.start_date IS NOT NULL AND NOW() < v_promo.start_date THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code promo pas encore actif');
  END IF;
  
  IF v_promo.end_date IS NOT NULL AND NOW() > v_promo.end_date THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code promo expiré');
  END IF;
  
  -- Vérifier le montant minimum
  IF p_purchase_amount < v_promo.min_purchase THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'error', 'Montant minimum: ' || v_promo.min_purchase || 'Ⓐ'
    );
  END IF;
  
  -- Vérifier les utilisations globales
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code promo épuisé');
  END IF;
  
  -- Vérifier les utilisations par utilisateur
  SELECT COUNT(*) INTO v_user_uses
  FROM promo_code_uses
  WHERE promo_code_id = v_promo.id AND user_id = p_user_id;
  
  IF v_promo.max_uses_per_user IS NOT NULL AND v_user_uses >= v_promo.max_uses_per_user THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Vous avez déjà utilisé ce code');
  END IF;
  
  -- Calculer la réduction
  IF v_promo.discount_type = 'percentage' THEN
    v_discount := p_purchase_amount * (v_promo.discount_value / 100);
    -- Appliquer le max_discount si défini
    IF v_promo.max_discount IS NOT NULL AND v_discount > v_promo.max_discount THEN
      v_discount := v_promo.max_discount;
    END IF;
  ELSE
    -- Fixed discount
    v_discount := LEAST(v_promo.discount_value, p_purchase_amount);
  END IF;
  
  -- Arrondir
  v_discount := ROUND(v_discount, 2);
  
  RETURN jsonb_build_object(
    'valid', true,
    'promo_code_id', v_promo.id,
    'code', v_promo.code,
    'description', v_promo.description,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'discount_amount', v_discount,
    'final_amount', p_purchase_amount + v_discount, -- Bonus: on AJOUTE au lieu de soustraire du prix
    'message', CASE 
      WHEN v_promo.discount_type = 'percentage' 
      THEN '+' || v_promo.discount_value || '% bonus'
      ELSE '+' || v_promo.discount_value || 'Ⓐ bonus'
    END
  );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION validate_promo_code(TEXT, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_promo_code(TEXT, UUID, NUMERIC) TO service_role;

-- ============================================================================
-- FONCTION POUR INCRÉMENTER LES UTILISATIONS D'UN CODE
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_promo_uses(code_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE promo_codes 
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = code_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_promo_uses(UUID) TO service_role;

-- ============================================================================
-- QUELQUES CODES PROMO DE DÉMONSTRATION
-- ============================================================================

INSERT INTO promo_codes (code, description, discount_type, discount_value, min_purchase, max_uses, is_active)
VALUES 
  ('WELCOME10', 'Bienvenue - 10% bonus', 'percentage', 10, 5, NULL, true),
  ('BONUS5', '+5 activations bonus', 'fixed', 5, 10, 100, true)
ON CONFLICT (code) DO NOTHING;

SELECT 'Système de codes promo créé avec succès' AS status;
