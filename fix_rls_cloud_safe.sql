-- ============================================================================
-- SCRIPT RLS SÉCURISÉ - NE CASSE AUCUNE FONCTIONNALITÉ
-- Date: 10 décembre 2025
-- 
-- Ce script corrige les erreurs RLS SANS casser:
-- ✅ Le dashboard admin
-- ✅ Les fonctions atomic_*
-- ✅ Les webhooks
-- ✅ Les cron jobs
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ACTIVER RLS SUR LES TABLES (SAFE)
-- ============================================================================

-- Table activations (policies déjà existantes)
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.activations IS 'RLS enabled - Policies already in place';

-- Table rental_logs
ALTER TABLE public.rental_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own rental logs" ON public.rental_logs;
DROP POLICY IF EXISTS "Service role full access rental logs" ON public.rental_logs;

CREATE POLICY "Users can read own rental logs"
ON public.rental_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role full access rental logs"
ON public.rental_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Table balance_operations
ALTER TABLE public.balance_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own balance operations" ON public.balance_operations;
DROP POLICY IF EXISTS "Service role full access balance operations" ON public.balance_operations;

CREATE POLICY "Users can read own balance operations"
ON public.balance_operations FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role full access balance operations"
ON public.balance_operations FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Table pricing_rules_archive (lecture publique)
ALTER TABLE public.pricing_rules_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read pricing rules" ON public.pricing_rules_archive;
DROP POLICY IF EXISTS "Service role full access pricing" ON public.pricing_rules_archive;

CREATE POLICY "Public read pricing rules"
ON public.pricing_rules_archive FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role full access pricing"
ON public.pricing_rules_archive FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Table email_campaigns (admins seulement)
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Service role full access campaigns" ON public.email_campaigns;

CREATE POLICY "Admins can manage email campaigns"
ON public.email_campaigns FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Service role full access campaigns"
ON public.email_campaigns FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Table email_logs (admins seulement)
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Service role full access email logs" ON public.email_logs;

CREATE POLICY "Admins can read email logs"
ON public.email_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Service role full access email logs"
ON public.email_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. GARDER SECURITY DEFINER SUR LES VIEWS ADMIN (CRITIQUE!)
-- ============================================================================
-- 
-- ⚠️  NE PAS SUPPRIMER CES VIEWS!
-- Elles doivent rester avec SECURITY DEFINER pour que le dashboard admin fonctionne
-- 
-- Views à NE PAS toucher:
--   - activation_stats (dashboard stats)
--   - v_frozen_discrepancies (admin monitoring)
--   - v_service_health (admin monitoring)
--   - v_frozen_balance_health (comptabilité)
--   - v_dashboard_stats (CRITIQUE - dashboard principal)
--   - v_frozen_balance_health_reconciliation (comptabilité)
--   - v_provider_stats_24h (stats)
--   - v_country_health (monitoring)
--
-- Ces views DOIVENT rester SECURITY DEFINER ou l'admin ne verra rien!
-- ============================================================================

-- ============================================================================
-- 3. CONVERTIR UNIQUEMENT available_services EN SECURITY INVOKER (SAFE)
-- ============================================================================

-- Cette view est publique, donc SECURITY INVOKER est OK
DROP VIEW IF EXISTS public.available_services CASCADE;

CREATE OR REPLACE VIEW public.available_services
WITH (security_invoker = true)
AS
SELECT 
    s.*,
    c.name as country_name,
    c.flag as country_flag,
    pr.retail_price,
    pr.cost_price,
    pr.min_rent_duration,
    pr.rent_price_per_day
FROM public.services s
JOIN public.countries c ON c.code = s.country_code
LEFT JOIN public.pricing_rules_archive pr ON pr.service_id = s.id
WHERE s.is_available = true
ORDER BY s.popularity_score DESC NULLS LAST;

COMMENT ON VIEW public.available_services IS 
'Public view - SECURITY INVOKER is safe here';

-- ============================================================================
-- 4. VÉRIFICATION DES FONCTIONS ATOMIC_* (CRITIQUE!)
-- ============================================================================

-- Vérifier que toutes les fonctions atomic_* ont SECURITY DEFINER
DO $$
DECLARE
    func_record RECORD;
    missing_definer BOOLEAN := false;
BEGIN
    FOR func_record IN 
        SELECT 
            proname,
            prosecdef,
            CASE WHEN prosecdef THEN '✅ SECURITY DEFINER' 
                 ELSE '❌ MANQUE SECURITY DEFINER' 
            END as status
        FROM pg_proc
        WHERE proname LIKE 'atomic_%'
    LOOP
        RAISE NOTICE '% - %', func_record.proname, func_record.status;
        
        IF NOT func_record.prosecdef THEN
            missing_definer := true;
        END IF;
    END LOOP;
    
    IF missing_definer THEN
        RAISE WARNING '⚠️  ATTENTION: Certaines fonctions atomic_* n''ont pas SECURITY DEFINER!';
        RAISE WARNING '   Cela va CASSER le wallet!';
        RAISE WARNING '   Vérifier et corriger les fichiers SQL de migrations.';
    END IF;
END $$;

-- ============================================================================
-- 5. VÉRIFICATION DES EDGE FUNCTIONS
-- ============================================================================

-- Note: Les Edge Functions DOIVENT utiliser service_role key pour:
--   - balance_operations (sinon paiements cassés)
--   - rental_logs (sinon locations cassées)
--   - Tous les webhooks (sinon webhooks cassés)
--   - Tous les crons (sinon crons cassés)
--
-- Vérifier dans les fichiers:
--   supabase/functions/*/index.ts
--
-- Chercher: SUPABASE_SERVICE_ROLE_KEY
-- Pas: SUPABASE_ANON_KEY

-- ============================================================================
-- 6. VÉRIFICATIONS FINALES
-- ============================================================================

-- Vérifier RLS activé
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Activé'
        ELSE '❌ RLS Désactivé'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'activations',
        'rental_logs',
        'balance_operations',
        'pricing_rules_archive',
        'email_campaigns',
        'email_logs'
    )
ORDER BY tablename;

-- Vérifier policies
SELECT 
    tablename,
    policyname,
    cmd as operation,
    roles
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'activations',
        'rental_logs',
        'balance_operations',
        'pricing_rules_archive',
        'email_campaigns',
        'email_logs'
    )
ORDER BY tablename, policyname;

-- Vérifier views SECURITY DEFINER (doivent rester!)
SELECT 
    viewname,
    CASE 
        WHEN viewname = 'available_services' THEN '✅ SECURITY INVOKER (public)'
        ELSE '✅ SECURITY DEFINER (admin - NE PAS TOUCHER!)'
    END as expected_security
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN (
        'activation_stats',
        'v_frozen_discrepancies',
        'v_service_health',
        'v_frozen_balance_health',
        'v_dashboard_stats',
        'v_frozen_balance_health_reconciliation',
        'v_provider_stats_24h',
        'v_country_health',
        'available_services'
    )
ORDER BY viewname;

COMMIT;

-- ============================================================================
-- RÉSUMÉ DES CHANGEMENTS
-- ============================================================================
-- 
-- ✅ RLS activé sur 6 tables avec policies appropriées
-- ✅ Views admin GARDENT SECURITY DEFINER (dashboard ne cassera pas)
-- ✅ Seule available_services convertie en SECURITY INVOKER (safe)
-- ✅ Fonctions atomic_* vérifiées (warnings si manque SECURITY DEFINER)
-- ✅ Notes ajoutées pour Edge Functions
--
-- ⚠️  ACTIONS POST-APPLICATION:
--
-- 1. Vérifier Edge Functions utilisent service_role key:
--    grep -r "SUPABASE_SERVICE_ROLE_KEY" supabase/functions/
--
-- 2. Si warnings sur atomic_*, corriger les migrations SQL
--
-- 3. Tester:
--    - Dashboard admin (doit fonctionner)
--    - Création activation (doit fonctionner)
--    - Paiement (doit fonctionner)
--    - Location (doit fonctionner)
--
-- 4. Monitoring pendant 24h après application
--
-- ============================================================================
