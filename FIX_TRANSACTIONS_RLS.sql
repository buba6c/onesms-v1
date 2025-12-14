-- =====================================================
-- FIX: Politiques RLS pour la table transactions
-- À exécuter dans Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Vérifier si la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'transactions'
) AS transactions_exists;

-- 2. Voir les politiques actuelles
SELECT * FROM pg_policies WHERE tablename = 'transactions';

-- 3. Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can manage all transactions" ON transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON transactions;

-- 4. Activer RLS si pas déjà fait
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 5. Créer les nouvelles politiques

-- Politique: Les utilisateurs peuvent voir leurs propres transactions
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent créer leurs propres transactions
CREATE POLICY "Users can insert own transactions"
ON transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique: Les admins peuvent tout voir
CREATE POLICY "Admins can view all transactions"
ON transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Politique: Les admins peuvent tout modifier
CREATE POLICY "Admins can manage all transactions"
ON transactions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- 6. IMPORTANT: Permettre les insertions via service_role (Edge Functions)
-- Les Edge Functions utilisent le service_role qui bypass RLS automatiquement
-- Mais on ajoute une politique pour les tests

-- Vérifier que le service_role bypass bien RLS
-- (normalement c'est automatique avec SUPABASE_SERVICE_ROLE_KEY)

-- 7. Vérifier les nouvelles politiques
SELECT 
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'transactions';

-- 8. Test: Vérifier la structure de la table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
