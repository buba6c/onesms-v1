-- ═══════════════════════════════════════════════════════════════
-- FIX: Corriger les politiques RLS sur la table rentals
-- DATE: 2025-12-02
-- ═══════════════════════════════════════════════════════════════

-- ÉTAPE 1: Vérifier les politiques actuelles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'rentals';

-- ÉTAPE 2: Vérifier si FORCE RLS est activé
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'rentals';

-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 3: Désactiver FORCE RLS pour que service_role puisse écrire
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE rentals FORCE ROW LEVEL SECURITY;  -- D'abord activer pour être sûr
ALTER TABLE rentals NO FORCE ROW LEVEL SECURITY;  -- Puis désactiver FORCE

-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 4: Ajouter/Corriger les politiques RLS pour rentals
-- ═══════════════════════════════════════════════════════════════

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Users can view own rentals" ON rentals;
DROP POLICY IF EXISTS "Users can insert own rentals" ON rentals;
DROP POLICY IF EXISTS "Service role can do all" ON rentals;
DROP POLICY IF EXISTS "Service role full access" ON rentals;
DROP POLICY IF EXISTS "Allow service_role full access" ON rentals;
DROP POLICY IF EXISTS "rentals_select_policy" ON rentals;
DROP POLICY IF EXISTS "rentals_insert_policy" ON rentals;
DROP POLICY IF EXISTS "rentals_update_policy" ON rentals;

-- Créer les nouvelles politiques
-- 1. Les utilisateurs peuvent voir leurs propres locations
CREATE POLICY "Users can view own rentals" ON rentals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Les utilisateurs peuvent insérer leurs propres locations
CREATE POLICY "Users can insert own rentals" ON rentals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Les utilisateurs peuvent mettre à jour leurs propres locations
CREATE POLICY "Users can update own rentals" ON rentals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Service role a accès total (IMPORTANT pour les Edge Functions)
CREATE POLICY "Service role full access" ON rentals
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 5: Vérification finale
-- ═══════════════════════════════════════════════════════════════
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'rentals';
