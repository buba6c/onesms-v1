-- Solution: Corriger les RLS policies qui causent l'erreur 500
-- Le problème: La policy "Admins can view all users" crée une récursion infinie

-- ÉTAPE 1: Désactiver temporairement RLS sur users pour diagnostiquer
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ÉTAPE 2: Supprimer toutes les policies existantes
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- ÉTAPE 3: Réactiver RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 4: Créer des policies simples sans récursion

-- Permettre aux utilisateurs de voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Permettre aux utilisateurs de mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Permettre l'insertion automatique via le trigger
CREATE POLICY "Enable insert for authenticated users"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- IMPORTANT: Ne pas créer de policy admin récursive pour l'instant
-- On l'ajoutera plus tard avec une meilleure logique

-- ÉTAPE 5: Vérifier que l'utilisateur existe
SELECT * FROM users WHERE email = 'admin@onesms.com';

-- ÉTAPE 6: Si l'utilisateur n'existe pas, le créer
INSERT INTO users (id, email, name, role, balance)
SELECT 
  id,
  email,
  'Admin Test',
  'admin',
  10000
FROM auth.users
WHERE email = 'admin@onesms.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    balance = 10000,
    updated_at = NOW();

-- ÉTAPE 7: Vérifier le résultat
SELECT u.id, u.email, u.name, u.role, u.balance 
FROM users u 
WHERE u.email = 'admin@onesms.com';
