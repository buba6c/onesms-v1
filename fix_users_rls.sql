-- ===============================================
-- FIX SÉCURISÉ: Protéger la table users
-- Problème: 1440 emails exposés sans authentification
-- Solution: Bloquer accès anonyme MAIS préserver fonctionnalités
-- ===============================================

-- 1. Supprimer les policies permissives existantes
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Allow public read" ON users;
DROP POLICY IF EXISTS "Public read access" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Allow insert for auth" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_select_authenticated" ON users;

-- 2. Vérifier que RLS est activé
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Créer les nouvelles policies sécurisées
-- ⚠️ IMPORTANT: On bloque les accès ANONYMES mais on permet 
--    aux utilisateurs AUTHENTIFIÉS de voir les autres users
--    (nécessaire pour parrainage, etc.)

-- SELECT: Tout utilisateur AUTHENTIFIÉ peut lire la table users
-- Cela bloque les accès sans token (anonymes) mais préserve:
-- - Page parrainage (lecture emails des filleuls)
-- - Admin (lecture de tous les users)
-- - Profil personnel
CREATE POLICY "users_select_authenticated" ON users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- UPDATE: Utilisateur peut modifier UNIQUEMENT son propre profil
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- UPDATE: Les admins peuvent modifier tous les utilisateurs
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- DELETE: Seuls les admins peuvent supprimer des utilisateurs
CREATE POLICY "users_delete_admin" ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- INSERT: Permettre la création de profil lors de l'inscription
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ===============================================
-- RÉSULTAT ATTENDU:
-- ✅ Accès anonyme (sans auth) -> BLOQUÉ
-- ✅ Utilisateur connecté voit son profil -> OK
-- ✅ Utilisateur connecté voit emails filleuls -> OK  
-- ✅ Admin voit tous les users -> OK
-- ✅ Edge Functions (service_role) -> OK (bypass RLS)
-- ===============================================

-- Vérification après application:
-- SELECT tablename, policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'users';
