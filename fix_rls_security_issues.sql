-- ============================================================================
-- CORRECTION DES PROBLÈMES DE SÉCURITÉ RLS
-- Date: 10 décembre 2025
-- 
-- Ce script corrige:
-- 1. Tables avec policies mais RLS désactivé
-- 2. Views avec SECURITY DEFINER (conversion en SECURITY INVOKER)
-- 3. Tables publiques sans RLS
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ACTIVER RLS SUR LES TABLES QUI ONT DES POLICIES
-- ============================================================================

-- Table activations (a déjà des policies mais RLS désactivé)
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.activations IS 'RLS enabled - Users can only see their own activations';

-- ============================================================================
-- 2. ACTIVER RLS SUR LES AUTRES TABLES PUBLIQUES
-- ============================================================================

-- Table rental_logs
ALTER TABLE public.rental_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour rental_logs
DROP POLICY IF EXISTS "Users can read own rental logs" ON public.rental_logs;
DROP POLICY IF EXISTS "Service role full access rental logs" ON public.rental_logs;

CREATE POLICY "Users can read own rental logs"
ON public.rental_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role full access rental logs"
ON public.rental_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Table balance_operations
ALTER TABLE public.balance_operations ENABLE ROW LEVEL SECURITY;

-- Policies pour balance_operations
DROP POLICY IF EXISTS "Users can read own balance operations" ON public.balance_operations;
DROP POLICY IF EXISTS "Service role full access balance operations" ON public.balance_operations;

CREATE POLICY "Users can read own balance operations"
ON public.balance_operations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role full access balance operations"
ON public.balance_operations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Table pricing_rules_archive
ALTER TABLE public.pricing_rules_archive ENABLE ROW LEVEL SECURITY;

-- Policies pour pricing_rules_archive (lecture seule pour tous)
DROP POLICY IF EXISTS "Public read pricing rules" ON public.pricing_rules_archive;
DROP POLICY IF EXISTS "Service role full access pricing" ON public.pricing_rules_archive;

CREATE POLICY "Public read pricing rules"
ON public.pricing_rules_archive
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role full access pricing"
ON public.pricing_rules_archive
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Table email_campaigns
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Policies pour email_campaigns (admins seulement)
DROP POLICY IF EXISTS "Admins can manage email campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Service role full access campaigns" ON public.email_campaigns;

CREATE POLICY "Admins can manage email campaigns"
ON public.email_campaigns
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "Service role full access campaigns"
ON public.email_campaigns
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Table email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour email_logs (admins seulement)
DROP POLICY IF EXISTS "Admins can read email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Service role full access email logs" ON public.email_logs;

CREATE POLICY "Admins can read email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "Service role full access email logs"
ON public.email_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. RECRÉER LES VIEWS AVEC SECURITY INVOKER AU LIEU DE SECURITY DEFINER
-- ============================================================================

-- View: activation_stats
DROP VIEW IF EXISTS public.activation_stats CASCADE;
CREATE OR REPLACE VIEW public.activation_stats
WITH (security_invoker = true)
AS
SELECT 
    COUNT(*) as total_activations,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'active') as active,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d
FROM public.activations;

-- View: v_frozen_discrepancies
DROP VIEW IF EXISTS public.v_frozen_discrepancies CASCADE;
CREATE OR REPLACE VIEW public.v_frozen_discrepancies
WITH (security_invoker = true)
AS
SELECT 
    u.id as user_id,
    u.email,
    u.frozen_balance as user_frozen,
    COALESCE(SUM(a.frozen_amount), 0) as activations_frozen,
    COALESCE(SUM(r.frozen_amount), 0) as rentals_frozen,
    u.frozen_balance - (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0)) as discrepancy
FROM public.users u
LEFT JOIN public.activations a ON a.user_id = u.id AND a.status IN ('pending', 'active')
LEFT JOIN public.rental_logs r ON r.user_id = u.id AND r.status = 'active'
GROUP BY u.id, u.email, u.frozen_balance
HAVING ABS(u.frozen_balance - (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0))) > 0.01;

-- View: v_service_health
DROP VIEW IF EXISTS public.v_service_health CASCADE;
CREATE OR REPLACE VIEW public.v_service_health
WITH (security_invoker = true)
AS
SELECT 
    s.id,
    s.name,
    s.country_code,
    s.provider,
    COUNT(a.id) as total_activations,
    COUNT(*) FILTER (WHERE a.status = 'completed') as completed,
    COUNT(*) FILTER (WHERE a.status = 'failed') as failed,
    ROUND(
        COUNT(*) FILTER (WHERE a.status = 'completed')::numeric / 
        NULLIF(COUNT(a.id), 0) * 100, 
        2
    ) as success_rate
FROM public.services s
LEFT JOIN public.activations a ON a.service_id = s.id 
    AND a.created_at > NOW() - INTERVAL '24 hours'
GROUP BY s.id, s.name, s.country_code, s.provider;

-- View: v_frozen_balance_health
DROP VIEW IF EXISTS public.v_frozen_balance_health CASCADE;
CREATE OR REPLACE VIEW public.v_frozen_balance_health
WITH (security_invoker = true)
AS
SELECT 
    u.id,
    u.email,
    u.frozen_balance,
    COALESCE(SUM(a.frozen_amount), 0) as total_frozen_activations,
    COALESCE(SUM(r.frozen_amount), 0) as total_frozen_rentals,
    u.frozen_balance - (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0)) as difference
FROM public.users u
LEFT JOIN public.activations a ON a.user_id = u.id AND a.status IN ('pending', 'active')
LEFT JOIN public.rental_logs r ON r.user_id = u.id AND r.status = 'active'
GROUP BY u.id;

-- View: v_service_response_time
DROP VIEW IF EXISTS public.v_service_response_time CASCADE;
CREATE OR REPLACE VIEW public.v_service_response_time
WITH (security_invoker = true)
AS
SELECT 
    s.id,
    s.name,
    s.provider,
    AVG(EXTRACT(EPOCH FROM (a.updated_at - a.created_at))) as avg_response_seconds,
    MIN(EXTRACT(EPOCH FROM (a.updated_at - a.created_at))) as min_response_seconds,
    MAX(EXTRACT(EPOCH FROM (a.updated_at - a.created_at))) as max_response_seconds
FROM public.services s
JOIN public.activations a ON a.service_id = s.id
WHERE a.status = 'completed'
    AND a.created_at > NOW() - INTERVAL '24 hours'
GROUP BY s.id, s.name, s.provider;

-- View: v_dashboard_stats
DROP VIEW IF EXISTS public.v_dashboard_stats CASCADE;
CREATE OR REPLACE VIEW public.v_dashboard_stats
WITH (security_invoker = true)
AS
SELECT 
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.activations WHERE created_at > NOW() - INTERVAL '24 hours') as activations_24h,
    (SELECT COUNT(*) FROM public.rental_logs WHERE status = 'active') as active_rentals,
    (SELECT SUM(balance) FROM public.users) as total_balance,
    (SELECT SUM(frozen_balance) FROM public.users) as total_frozen;

-- View: v_frozen_balance_health_reconciliation
DROP VIEW IF EXISTS public.v_frozen_balance_health_reconciliation CASCADE;
CREATE OR REPLACE VIEW public.v_frozen_balance_health_reconciliation
WITH (security_invoker = true)
AS
SELECT 
    u.id,
    u.email,
    u.frozen_balance as user_frozen_balance,
    COALESCE(act_frozen.total, 0) as activations_frozen,
    COALESCE(rent_frozen.total, 0) as rentals_frozen,
    COALESCE(act_frozen.total, 0) + COALESCE(rent_frozen.total, 0) as calculated_frozen,
    u.frozen_balance - (COALESCE(act_frozen.total, 0) + COALESCE(rent_frozen.total, 0)) as discrepancy
FROM public.users u
LEFT JOIN (
    SELECT user_id, SUM(frozen_amount) as total
    FROM public.activations
    WHERE status IN ('pending', 'active')
    GROUP BY user_id
) act_frozen ON act_frozen.user_id = u.id
LEFT JOIN (
    SELECT user_id, SUM(frozen_amount) as total
    FROM public.rental_logs
    WHERE status = 'active'
    GROUP BY user_id
) rent_frozen ON rent_frozen.user_id = u.id
WHERE ABS(u.frozen_balance - (COALESCE(act_frozen.total, 0) + COALESCE(rent_frozen.total, 0))) > 0.01;

-- View: v_provider_stats_24h
DROP VIEW IF EXISTS public.v_provider_stats_24h CASCADE;
CREATE OR REPLACE VIEW public.v_provider_stats_24h
WITH (security_invoker = true)
AS
SELECT 
    s.provider,
    COUNT(a.id) as total_activations,
    COUNT(*) FILTER (WHERE a.status = 'completed') as completed,
    COUNT(*) FILTER (WHERE a.status = 'failed') as failed,
    COUNT(*) FILTER (WHERE a.status = 'pending') as pending,
    ROUND(
        COUNT(*) FILTER (WHERE a.status = 'completed')::numeric / 
        NULLIF(COUNT(a.id), 0) * 100, 
        2
    ) as success_rate
FROM public.services s
LEFT JOIN public.activations a ON a.service_id = s.id 
    AND a.created_at > NOW() - INTERVAL '24 hours'
GROUP BY s.provider;

-- View: v_country_health
DROP VIEW IF EXISTS public.v_country_health CASCADE;
CREATE OR REPLACE VIEW public.v_country_health
WITH (security_invoker = true)
AS
SELECT 
    c.code,
    c.name,
    COUNT(DISTINCT s.id) as total_services,
    COUNT(a.id) as total_activations_24h,
    ROUND(
        COUNT(*) FILTER (WHERE a.status = 'completed')::numeric / 
        NULLIF(COUNT(a.id), 0) * 100, 
        2
    ) as success_rate_24h
FROM public.countries c
LEFT JOIN public.services s ON s.country_code = c.code AND s.is_available = true
LEFT JOIN public.activations a ON a.service_id = s.id 
    AND a.created_at > NOW() - INTERVAL '24 hours'
GROUP BY c.code, c.name;

-- View: available_services
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

-- ============================================================================
-- 4. VÉRIFICATIONS ET COMMENTAIRES
-- ============================================================================

-- Ajouter des commentaires pour documentation
COMMENT ON POLICY "Users can read own rental logs" ON public.rental_logs IS 
    'Users can only view their own rental logs';

COMMENT ON POLICY "Users can read own balance operations" ON public.balance_operations IS 
    'Users can only view their own balance operations';

COMMENT ON POLICY "Public read pricing rules" ON public.pricing_rules_archive IS 
    'All authenticated users can read pricing rules';

COMMENT ON POLICY "Admins can manage email campaigns" ON public.email_campaigns IS 
    'Only admin users can manage email campaigns';

COMMENT ON POLICY "Admins can read email logs" ON public.email_logs IS 
    'Only admin users can read email logs';

-- ============================================================================
-- 5. VÉRIFICATION FINALE
-- ============================================================================

-- Vérifier que toutes les tables ont RLS activé
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
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

-- Vérifier les policies créées
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

COMMIT;

-- ============================================================================
-- RÉSUMÉ DES CHANGEMENTS
-- ============================================================================
-- 
-- ✅ RLS activé sur:
--    - activations (avait des policies, RLS maintenant activé)
--    - rental_logs (+ policies ajoutées)
--    - balance_operations (+ policies ajoutées)
--    - pricing_rules_archive (+ policies ajoutées)
--    - email_campaigns (+ policies ajoutées)
--    - email_logs (+ policies ajoutées)
--
-- ✅ Views converties de SECURITY DEFINER → SECURITY INVOKER:
--    - activation_stats
--    - v_frozen_discrepancies
--    - v_service_health
--    - v_frozen_balance_health
--    - v_service_response_time
--    - v_dashboard_stats
--    - v_frozen_balance_health_reconciliation
--    - v_provider_stats_24h
--    - v_country_health
--    - available_services
--
-- ✅ Toutes les tables publiques ont maintenant:
--    - RLS activé
--    - Policies appropriées selon le cas d'usage
--    - Service role a toujours accès complet
--    - Users ont accès limité à leurs propres données
--
-- ============================================================================
