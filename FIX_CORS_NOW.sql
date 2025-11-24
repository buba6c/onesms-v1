-- ============================================================================
-- CORRECTION URGENTE - À EXÉCUTER MAINTENANT
-- ============================================================================
-- Copier-coller ce script dans Supabase SQL Editor et cliquer RUN
-- https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql
-- ============================================================================

-- 1. FIX CORS ERROR SUR SYNC_LOGS
-- ============================================================================
DROP POLICY IF EXISTS "Public can view sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Admins can view sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Admins can view all sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Service role can manage sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Service role can insert sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Anyone can read sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Service role can create sync logs" ON sync_logs;
DROP POLICY IF EXISTS "Admins can manage sync logs" ON sync_logs;

-- Permettre à TOUT LE MONDE de lire les sync logs (nécessaire pour l'UI)
CREATE POLICY "Anyone can read sync logs"
  ON sync_logs FOR SELECT
  USING (true);

-- Permettre au service role d'insérer des logs
CREATE POLICY "Service role can create sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Permettre aux admins de tout faire
CREATE POLICY "Admins can manage sync logs"
  ON sync_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. VÉRIFIER QUE LA TABLE SYNC_LOGS EXISTE ET A RLS
-- ============================================================================
-- Si erreur "relation does not exist", créer la table:
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  stats JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- 3. VÉRIFIER LES AUTRES TABLES
-- ============================================================================

-- Services: permettre lecture publique
DROP POLICY IF EXISTS "Anyone can view services" ON services;
DROP POLICY IF EXISTS "Public can view services" ON services;
CREATE POLICY "Anyone can view services"
  ON services FOR SELECT
  USING (true);

-- Countries: permettre lecture publique  
DROP POLICY IF EXISTS "Anyone can view active countries" ON countries;
DROP POLICY IF EXISTS "Public can view countries" ON countries;
DROP POLICY IF EXISTS "Anyone can view countries" ON countries;
CREATE POLICY "Public can view countries"
  ON countries FOR SELECT
  USING (true);

-- Pricing rules: permettre lecture publique
DROP POLICY IF EXISTS "Anyone can view pricing" ON pricing_rules;
DROP POLICY IF EXISTS "Public can view pricing" ON pricing_rules;
CREATE POLICY "Anyone can view pricing"
  ON pricing_rules FOR SELECT
  USING (true);

-- ============================================================================
-- TERMINÉ! Maintenant:
-- 1. Recharger la page de l'app
-- 2. Cliquer "Sync avec 5sim" dans Admin → Services
-- 3. Vérifier la console pour voir les logs
-- ============================================================================

-- Vérifier que les policies sont bien créées
SELECT 
  schemaname,
  tablename, 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('sync_logs', 'services', 'countries', 'pricing_rules')
ORDER BY tablename, policyname;
