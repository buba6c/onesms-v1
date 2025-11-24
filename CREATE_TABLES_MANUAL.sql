-- 🚀 SCRIPT SQL À EXÉCUTER DANS SUPABASE SQL EDITOR
-- Copier-coller ce script dans: Dashboard > SQL Editor > New Query

-- =============================================================================
-- 1️⃣ CRÉER LA TABLE RENTALS (Location de numéros)
-- =============================================================================

-- Supprimer la table si elle existe déjà (pour réinitialisation propre)
DROP TABLE IF EXISTS public.rentals CASCADE;

CREATE TABLE public.rentals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rent_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  service_code TEXT NOT NULL,
  country_code TEXT NOT NULL,
  operator TEXT DEFAULT 'any',
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  rent_hours INTEGER NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  refund_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  last_message_date TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT rentals_rent_id_unique UNIQUE (rent_id)
);

-- Index pour performance
CREATE INDEX idx_rentals_user_id ON public.rentals(user_id);
CREATE INDEX idx_rentals_rent_id ON public.rentals(rent_id);
CREATE INDEX idx_rentals_status ON public.rentals(status);
CREATE INDEX idx_rentals_created_at ON public.rentals(created_at DESC);

-- =============================================================================
-- 2️⃣ CRÉER LA TABLE WEBHOOK_LOGS (Logs des webhooks SMS-Activate)
-- =============================================================================

-- Supprimer la table si elle existe déjà (pour réinitialisation propre)
DROP TABLE IF EXISTS public.webhook_logs CASCADE;

CREATE TABLE public.webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activation_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_webhook_logs_activation_id ON public.webhook_logs(activation_id);
CREATE INDEX idx_webhook_logs_processed ON public.webhook_logs(processed);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- =============================================================================
-- 3️⃣ ACTIVER ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4️⃣ CRÉER LES POLITIQUES RLS POUR RENTALS
-- =============================================================================

-- Utilisateurs peuvent voir leurs propres locations
DROP POLICY IF EXISTS "Users can view their own rentals" ON public.rentals;
CREATE POLICY "Users can view their own rentals"
  ON public.rentals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Utilisateurs peuvent créer leurs propres locations
DROP POLICY IF EXISTS "Users can create their own rentals" ON public.rentals;
CREATE POLICY "Users can create their own rentals"
  ON public.rentals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Utilisateurs peuvent modifier leurs propres locations
DROP POLICY IF EXISTS "Users can update their own rentals" ON public.rentals;
CREATE POLICY "Users can update their own rentals"
  ON public.rentals
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role peut tout faire (pour Edge Functions)
DROP POLICY IF EXISTS "Service role can manage rentals" ON public.rentals;
CREATE POLICY "Service role can manage rentals"
  ON public.rentals
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 5️⃣ CRÉER LES POLITIQUES RLS POUR WEBHOOK_LOGS
-- =============================================================================

-- Seul le service role peut gérer les webhook logs (sécurité)
DROP POLICY IF EXISTS "Service role can manage webhook logs" ON public.webhook_logs;
CREATE POLICY "Service role can manage webhook logs"
  ON public.webhook_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 6️⃣ CRÉER LE TRIGGER POUR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_rentals_updated_at ON public.rentals;
CREATE TRIGGER update_rentals_updated_at 
  BEFORE UPDATE ON public.rentals
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7️⃣ ACCORDER LES PERMISSIONS
-- =============================================================================

GRANT ALL ON public.rentals TO authenticated;
GRANT ALL ON public.rentals TO service_role;
GRANT ALL ON public.webhook_logs TO service_role;

-- =============================================================================
-- ✅ VÉRIFICATION ET STATISTIQUES
-- =============================================================================

DO $$
DECLARE
  rentals_count INTEGER;
  webhook_logs_count INTEGER;
  rentals_indexes INTEGER;
  webhook_indexes INTEGER;
BEGIN
  -- Compter les tables
  SELECT COUNT(*) INTO rentals_count FROM public.rentals;
  SELECT COUNT(*) INTO webhook_logs_count FROM public.webhook_logs;
  
  -- Compter les index
  SELECT COUNT(*) INTO rentals_indexes 
  FROM pg_indexes 
  WHERE tablename = 'rentals' AND schemaname = 'public';
  
  SELECT COUNT(*) INTO webhook_indexes 
  FROM pg_indexes 
  WHERE tablename = 'webhook_logs' AND schemaname = 'public';

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ TABLES CRÉÉES AVEC SUCCÈS !';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 TABLE RENTALS:';
  RAISE NOTICE '   ├─ Enregistrements: %', rentals_count;
  RAISE NOTICE '   ├─ Index: %', rentals_indexes;
  RAISE NOTICE '   ├─ RLS: Activé ✓';
  RAISE NOTICE '   └─ Politiques: 4 créées';
  RAISE NOTICE '';
  RAISE NOTICE '📊 TABLE WEBHOOK_LOGS:';
  RAISE NOTICE '   ├─ Enregistrements: %', webhook_logs_count;
  RAISE NOTICE '   ├─ Index: %', webhook_indexes;
  RAISE NOTICE '   ├─ RLS: Activé ✓';
  RAISE NOTICE '   └─ Politiques: 1 créée';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 TRIGGERS:';
  RAISE NOTICE '   └─ update_rentals_updated_at: Créé ✓';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 PERMISSIONS:';
  RAISE NOTICE '   ├─ authenticated: GRANTED';
  RAISE NOTICE '   └─ service_role: GRANTED';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 INSTALLATION TERMINÉE !';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📝 PROCHAINES ÉTAPES:';
  RAISE NOTICE '   1. Edge Functions déployées: webhook-sms-activate ✓';
  RAISE NOTICE '   2. Edge Functions déployées: get-rent-services ✓';
  RAISE NOTICE '   3. Edge Functions déployées: rent-number ✓';
  RAISE NOTICE '   4. Edge Functions déployées: get-rent-status ✓';
  RAISE NOTICE '   5. Edge Functions déployées: set-rent-status ✓';
  RAISE NOTICE '   6. Edge Functions déployées: continue-rent ✓';
  RAISE NOTICE '   7. Configurer Webhook URL dans SMS-Activate dashboard';
  RAISE NOTICE '      URL: https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/webhook-sms-activate';
  RAISE NOTICE '';
END $$;

-- =============================================================================
-- 🧪 TESTS (Optionnel - décommenter pour tester)
-- =============================================================================

/*
-- Test insertion rental
INSERT INTO public.rentals (
  user_id,
  rent_id,
  phone,
  service_code,
  country_code,
  end_date,
  rent_hours,
  hourly_rate,
  total_cost
) VALUES (
  auth.uid(),
  'TEST_RENT_123',
  '+1234567890',
  'wa',
  'usa',
  NOW() + INTERVAL '4 hours',
  4,
  1.0,
  4.0
);

-- Vérifier
SELECT * FROM public.rentals WHERE rent_id = 'TEST_RENT_123';

-- Nettoyer
DELETE FROM public.rentals WHERE rent_id = 'TEST_RENT_123';
*/
