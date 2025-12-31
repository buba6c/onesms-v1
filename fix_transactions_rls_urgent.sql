-- ============================================================================
-- CORRECTION URGENTE: RLS Transactions - Permettre les achats de numéros
-- ============================================================================
-- Date: 2024-12-17
-- Problème: Les edge functions ne peuvent pas créer de transactions
-- Solution: Ajouter une policy pour service_role INSERT
-- ============================================================================

-- 1. Vérifier l'état actuel du RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'transactions';

-- 2. Supprimer toutes les anciennes policies qui pourraient bloquer
DROP POLICY IF EXISTS "Block user transaction mutations" ON public.transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own pending transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users cannot delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Service role transactions full access" ON public.transactions;
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;

-- 3. Créer les policies correctes

-- SELECT: Utilisateurs voient leurs propres transactions
CREATE POLICY "transactions_select_own"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Service role peut créer n'importe quelle transaction (pour edge functions)
CREATE POLICY "transactions_insert_service"
ON public.transactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- INSERT: Utilisateurs authentifiés peuvent créer leurs propres transactions
CREATE POLICY "transactions_insert_own"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Utilisateurs peuvent mettre à jour leurs transactions pending
CREATE POLICY "transactions_update_own_pending"
ON public.transactions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id
);

-- UPDATE: Service role peut tout mettre à jour
CREATE POLICY "transactions_update_service"
ON public.transactions
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- DELETE: Service role uniquement
CREATE POLICY "transactions_delete_service"
ON public.transactions
FOR DELETE
TO service_role
USING (true);

-- SELECT: Admins voient tout
CREATE POLICY "transactions_select_admin"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- 4. Vérifier les policies créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'transactions'
ORDER BY policyname;

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON POLICY "transactions_select_own" ON public.transactions 
IS 'Utilisateurs voient leurs propres transactions';

COMMENT ON POLICY "transactions_insert_service" ON public.transactions 
IS 'Service role peut créer des transactions (edge functions)';

COMMENT ON POLICY "transactions_insert_own" ON public.transactions 
IS 'Utilisateurs peuvent créer leurs propres transactions';

COMMENT ON POLICY "transactions_update_own_pending" ON public.transactions 
IS 'Utilisateurs peuvent mettre à jour leurs transactions pending';

COMMENT ON POLICY "transactions_update_service" ON public.transactions 
IS 'Service role peut tout mettre à jour';

COMMENT ON POLICY "transactions_delete_service" ON public.transactions 
IS 'Seul service role peut supprimer';

COMMENT ON POLICY "transactions_select_admin" ON public.transactions 
IS 'Admins voient toutes les transactions';
