-- ============================================================================
-- ALTERNATIVE SIMPLE - Admin voit tous les utilisateurs
-- ============================================================================
-- Sans sous-requêtes pour éviter la récursion
-- ============================================================================

-- Nettoyer toutes les policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow signup" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Désactiver temporairement RLS pour nettoyer
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Réactiver RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy SIMPLE: Tout le monde peut lire (l'auth est gérée côté app)
CREATE POLICY "Anyone can read users"
  ON users FOR SELECT
  USING (true);

-- Users peuvent mettre à jour leur propre profil + admins peuvent tout modifier
CREATE POLICY "Users and admins can update"
  ON users FOR UPDATE
  USING (
    auth.uid() = id 
    OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins peuvent supprimer des utilisateurs
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Permettre l'inscription
CREATE POLICY "Enable user registration"
  ON users FOR INSERT
  WITH CHECK (true);

-- Service role peut tout faire
CREATE POLICY "Service role full access"
  ON users FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Vérification
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Test: Compter tous les utilisateurs
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'user' OR role IS NULL THEN 1 END) as regular_users,
  COUNT(CASE WHEN role = 'banned' THEN 1 END) as banned
FROM users;
