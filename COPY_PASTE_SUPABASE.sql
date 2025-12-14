-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 FIX: ADMIN RENTALS ACCESS
-- ═══════════════════════════════════════════════════════════════════════════
-- Ce SQL permet aux admins (role='admin') de voir TOUS les rentals
-- ═══════════════════════════════════════════════════════════════════════════

-- 1️⃣ Supprimer les anciennes politiques SELECT
DROP POLICY IF EXISTS "rentals_select_own" ON rentals;
DROP POLICY IF EXISTS "rentals_select" ON rentals;
DROP POLICY IF EXISTS "rentals_select_policy" ON rentals;
DROP POLICY IF EXISTS "rentals_admin_select_all" ON rentals;
DROP POLICY IF EXISTS "Users can view their own rentals" ON rentals;
DROP POLICY IF EXISTS "Users can view their own rentals {authenticated}" ON rentals;

-- 2️⃣ Créer la nouvelle politique avec support admin
CREATE POLICY "rentals_select_with_admin" ON rentals
    FOR SELECT TO authenticated
    USING (
        -- L'utilisateur peut voir son propre rental
        auth.uid() = user_id
        -- OU l'utilisateur a role='admin'
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 3️⃣ Vérification
SELECT 
    policyname, 
    roles::text[] as roles, 
    cmd,
    CASE 
        WHEN qual LIKE '%role = ''admin''%' THEN '✓ Admin support'
        ELSE '✗ No admin support'
    END as admin_check
FROM pg_policies 
WHERE tablename = 'rentals' 
AND cmd = 'SELECT'
ORDER BY policyname;
