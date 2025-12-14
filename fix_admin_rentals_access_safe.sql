-- ═══════════════════════════════════════════════════════════════
-- FIX ADMIN RENTALS ACCESS
-- DATE: 2025-12-02
-- ═══════════════════════════════════════════════════════════════
-- PROBLÈME: L'admin ne voit pas tous les rentals sur AdminRentals
-- CAUSE: La politique RLS "rentals_select_own" limite à auth.uid() = user_id
-- SOLUTION: Permettre aux admins de voir TOUS les rentals
-- ═══════════════════════════════════════════════════════════════

-- 1. Supprimer les politiques SELECT existantes
DROP POLICY IF EXISTS "rentals_select_own" ON rentals;
DROP POLICY IF EXISTS "rentals_select" ON rentals;
DROP POLICY IF EXISTS "rentals_admin_select_all" ON rentals;
DROP POLICY IF EXISTS "Users can view their own rentals" ON rentals;
DROP POLICY IF EXISTS "Users can view their own rentals {authenticated}" ON rentals;

-- 2. Créer la nouvelle politique SELECT avec support admin
CREATE POLICY "rentals_select_policy" ON rentals
    FOR SELECT TO authenticated
    USING (
        -- L'utilisateur peut voir son propre rental
        auth.uid() = user_id
        -- OU l'utilisateur est un admin
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- 3. Vérification
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'rentals' 
ORDER BY cmd;
