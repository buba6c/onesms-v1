-- Corriger les RLS policies pour permettre l'accès au profil utilisateur

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Policy pour permettre aux utilisateurs de voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Policy pour permettre aux utilisateurs de mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy pour permettre l'insertion lors de l'inscription
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy pour les admins (voir tous les utilisateurs)
CREATE POLICY "Admins can view all users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Vérifier que l'utilisateur admin existe bien dans la table users
SELECT * FROM users WHERE email = 'admin@onesms.com';
