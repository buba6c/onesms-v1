-- ===================================================================
-- FIX SÉCURITÉ RLS - Tables publiques
-- Date: 2025-12-15
-- ===================================================================

-- 1. ACTIVER RLS sur la table activations (CRITIQUE)
-- La table a déjà 9 politiques mais RLS n'est pas activé !
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;

-- 2. Activer RLS sur les autres tables publiques
ALTER TABLE public.rental_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- POLITIQUES RLS pour rental_logs
-- ===================================================================

-- Service role full access
CREATE POLICY "Service role can manage rental_logs"
ON public.rental_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can read all
CREATE POLICY "Admins can read rental_logs"
ON public.rental_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ===================================================================
-- POLITIQUES RLS pour balance_operations
-- ===================================================================

-- Service role full access
CREATE POLICY "Service role can manage balance_operations"
ON public.balance_operations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can read all
CREATE POLICY "Admins can read balance_operations"
ON public.balance_operations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ===================================================================
-- POLITIQUES RLS pour pricing_rules_archive
-- ===================================================================

-- Service role full access
CREATE POLICY "Service role can manage pricing_rules_archive"
ON public.pricing_rules_archive
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can read all
CREATE POLICY "Admins can read pricing_rules_archive"
ON public.pricing_rules_archive
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ===================================================================
-- POLITIQUES RLS pour email_campaigns
-- ===================================================================

-- Service role full access
CREATE POLICY "Service role can manage email_campaigns"
ON public.email_campaigns
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can read all
CREATE POLICY "Admins can read email_campaigns"
ON public.email_campaigns
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ===================================================================
-- POLITIQUES RLS pour email_logs
-- ===================================================================

-- Service role full access
CREATE POLICY "Service role can manage email_logs"
ON public.email_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can read all
CREATE POLICY "Admins can read email_logs"
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

-- Users can read their own email logs
CREATE POLICY "Users can read own email_logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ===================================================================
-- VÉRIFICATION
-- ===================================================================

-- Vérifier que RLS est activé sur toutes les tables
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

-- Compter les politiques par table
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
