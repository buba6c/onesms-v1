-- =====================================================
-- FIX: Politiques RLS pour permettre aux admins de voir 
-- toutes les transactions
-- À exécuter dans Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Voir les politiques actuelles sur transactions
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'transactions';

-- 2. Supprimer les anciennes politiques restrictives
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON transactions;
DROP POLICY IF EXISTS "Enable read access for users" ON transactions;
DROP POLICY IF EXISTS "Enable insert for users" ON transactions;

-- 3. Créer les nouvelles politiques

-- Les utilisateurs peuvent voir LEURS transactions
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Les ADMINS peuvent voir TOUTES les transactions
CREATE POLICY "Admins can view all transactions"
ON transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Les utilisateurs peuvent créer leurs propres transactions
CREATE POLICY "Users can insert own transactions"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Les admins peuvent tout faire sur les transactions
CREATE POLICY "Admins can manage all transactions"
ON transactions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Service role peut tout faire (pour les Edge Functions)
CREATE POLICY "Service role full access"
ON transactions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Vérifier les nouvelles politiques
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'transactions';

-- 5. Test: Compter les transactions
SELECT COUNT(*) as total_transactions FROM transactions;
SELECT type, COUNT(*) as count FROM transactions GROUP BY type;
