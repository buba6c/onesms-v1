-- ============================================================================
-- Migration: Fix Transactions Policies for Wave Payments
-- ============================================================================
-- Date: 2024-12-12
-- Description: Permet aux utilisateurs de créer leurs propres transactions
--              pour les paiements Wave (et autres providers)
-- ============================================================================

-- 1. Supprimer la policy qui bloque tout
DROP POLICY IF EXISTS "Block user transaction mutations" ON public.transactions;

-- 2. Créer une policy pour permettre INSERT de ses propres transactions
CREATE POLICY "Users can create own transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Créer une policy pour permettre UPDATE de ses propres transactions (pour upload proof)
CREATE POLICY "Users can update own pending transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'pending'
);

-- 4. Bloquer DELETE pour les utilisateurs normaux
CREATE POLICY "Users cannot delete transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (false);

-- 5. S'assurer que les autres policies existent toujours
DO $$ BEGIN
  -- Policy de lecture pour les utilisateurs (leurs propres transactions)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'Users view own transactions'
  ) THEN
    CREATE POLICY "Users view own transactions"
    ON public.transactions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  -- Policy pour service_role (accès complet)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'Service role transactions full access'
  ) THEN
    CREATE POLICY "Service role transactions full access"
    ON public.transactions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON POLICY "Users can create own transactions" ON public.transactions 
IS 'Permet aux utilisateurs de créer leurs propres transactions (Wave, etc.)';

COMMENT ON POLICY "Users can update own pending transactions" ON public.transactions 
IS 'Permet aux utilisateurs de mettre à jour leurs transactions en attente (upload proof)';

COMMENT ON POLICY "Users cannot delete transactions" ON public.transactions 
IS 'Empêche les utilisateurs de supprimer des transactions';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Lister toutes les policies sur transactions
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
WHERE tablename = 'transactions'
ORDER BY policyname;
