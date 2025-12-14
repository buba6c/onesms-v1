-- ============================================================================
-- CORRECTION DES PROBLÈMES RLS - SUPABASE CLOUD
-- Date: 2025-12-10T10:03:31.350Z
-- ============================================================================

BEGIN;


-- Activer RLS sur activations
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;

-- Activer RLS sur rental_logs

ALTER TABLE public.rental_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour rental_logs
DROP POLICY IF EXISTS "Users can read own rental logs" ON public.rental_logs;
DROP POLICY IF EXISTS "Service role full access rental logs" ON public.rental_logs;

CREATE POLICY "Users can read own rental logs"
ON public.rental_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role full access rental logs"
ON public.rental_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);


-- Activer RLS sur balance_operations

ALTER TABLE public.balance_operations ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can read own balance operations" ON public.balance_operations;
DROP POLICY IF EXISTS "Service role full access balance operations" ON public.balance_operations;

CREATE POLICY "Users can read own balance operations"
ON public.balance_operations FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role full access balance operations"
ON public.balance_operations FOR ALL TO service_role
USING (true) WITH CHECK (true);


-- Activer RLS sur pricing_rules_archive

ALTER TABLE public.pricing_rules_archive ENABLE ROW LEVEL SECURITY;

-- Policies (lecture pour tous)
DROP POLICY IF EXISTS "Public read pricing rules" ON public.pricing_rules_archive;
DROP POLICY IF EXISTS "Service role full access pricing" ON public.pricing_rules_archive;

CREATE POLICY "Public read pricing rules"
ON public.pricing_rules_archive FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role full access pricing"
ON public.pricing_rules_archive FOR ALL TO service_role
USING (true) WITH CHECK (true);


-- Activer RLS sur email_campaigns

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Policies (admins seulement)
DROP POLICY IF EXISTS "Admins can manage email campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Service role full access campaigns" ON public.email_campaigns;

CREATE POLICY "Admins can manage email campaigns"
ON public.email_campaigns FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Service role full access campaigns"
ON public.email_campaigns FOR ALL TO service_role
USING (true) WITH CHECK (true);


-- Activer RLS sur email_logs

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Policies (admins seulement)
DROP POLICY IF EXISTS "Admins can read email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Service role full access email logs" ON public.email_logs;

CREATE POLICY "Admins can read email logs"
ON public.email_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Service role full access email logs"
ON public.email_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);


-- Recréer les views avec SECURITY INVOKER
DROP VIEW IF EXISTS public.activation_stats CASCADE;
DROP VIEW IF EXISTS public.v_frozen_discrepancies CASCADE;
DROP VIEW IF EXISTS public.v_service_health CASCADE;
DROP VIEW IF EXISTS public.v_frozen_balance_health CASCADE;
DROP VIEW IF EXISTS public.v_service_response_time CASCADE;
DROP VIEW IF EXISTS public.v_dashboard_stats CASCADE;
DROP VIEW IF EXISTS public.v_frozen_balance_health_reconciliation CASCADE;
DROP VIEW IF EXISTS public.v_provider_stats_24h CASCADE;
DROP VIEW IF EXISTS public.v_country_health CASCADE;
DROP VIEW IF EXISTS public.available_services CASCADE;

COMMIT;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Vérifier RLS activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('activations', 'rental_logs', 'balance_operations', 'pricing_rules_archive', 'email_campaigns', 'email_logs')
ORDER BY tablename;
