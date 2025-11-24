-- ============================================================================
-- FIX: Admin ne peut pas voir tous les utilisateurs
-- ============================================================================
-- Problème: Admin voit uniquement son propre compte
-- Solution: Policy spécifique pour que les admins voient TOUS les users
-- ============================================================================

-- Supprimer les policies existantes
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- 1. Users peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- 2. Admins peuvent voir TOUS les utilisateurs
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 3. Users peuvent modifier leur propre profil
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Admins peuvent modifier TOUS les utilisateurs
CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 5. Admins peuvent supprimer des utilisateurs
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 6. Permettre l'inscription (INSERT pour auth)
CREATE POLICY "Allow signup"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Vérifier les policies créées
SELECT 
  schemaname,
  tablename, 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY policyname;

-- ============================================================================
-- TERMINÉ!
-- Maintenant:
-- 1. Rechargez Admin → Users Management
-- 2. Vous devriez voir TOUS les utilisateurs
-- ============================================================================
