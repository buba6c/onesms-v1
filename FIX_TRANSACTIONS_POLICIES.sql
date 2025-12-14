-- ============================================================================
-- À EXÉCUTER DANS LE SQL EDITOR DE SUPABASE
-- ============================================================================
-- URL: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new
-- ============================================================================

-- 1. Supprimer la policy qui bloque tout
DROP POLICY IF EXISTS "Block user transaction mutations" ON public.transactions;

-- 2. Créer policy pour INSERT (créer ses propres transactions)
CREATE POLICY "Users can create own transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Créer policy pour UPDATE (mettre à jour ses transactions pending)
CREATE POLICY "Users can update own pending transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 4. Bloquer DELETE pour les utilisateurs
CREATE POLICY "Users cannot delete transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (false);

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

SELECT 
  policyname,
  cmd,
  roles::text,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING défini'
    ELSE 'Pas de USING'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK défini'
    ELSE 'Pas de WITH CHECK'
  END as check_clause
FROM pg_policies 
WHERE tablename = 'transactions'
AND schemaname = 'public'
ORDER BY policyname;
