-- ═══════════════════════════════════════════════════════════════
-- FIX FINAL: DONNER ACCÈS ADMIN À TOUS LES RENTALS
-- DATE: 2025-12-02
-- ═══════════════════════════════════════════════════════════════
-- PROBLÈME IDENTIFIÉ:
--   - La table users a une colonne 'role' (pas 'is_admin')
--   - buba6c@gmail.com a role='user' (pas 'admin')
--   - admin@onesms.com a role='admin'
--   - La politique RLS limite chaque user à voir ses propres rentals
-- 
-- SOLUTION:
--   1. Mettre buba6c@gmail.com en role='admin'
--   2. Modifier la politique RLS pour autoriser role='admin'
-- ═══════════════════════════════════════════════════════════════

-- OPTION A: Donner le role admin à buba6c@gmail.com
UPDATE users 
SET role = 'admin' 
WHERE email = 'buba6c@gmail.com';

-- OPTION B: Modifier la politique RLS
-- Supprimer l'ancienne politique SELECT
DROP POLICY IF EXISTS "rentals_select_own" ON rentals;
DROP POLICY IF EXISTS "rentals_select" ON rentals;
DROP POLICY IF EXISTS "rentals_select_policy" ON rentals;
DROP POLICY IF EXISTS "Users can view their own rentals" ON rentals;
DROP POLICY IF EXISTS "Users can view their own rentals {authenticated}" ON rentals;

-- Créer la nouvelle politique avec support role='admin'
CREATE POLICY "rentals_select_with_admin" ON rentals
    FOR SELECT TO authenticated
    USING (
        -- Soit c'est son propre rental
        auth.uid() = user_id
        -- Soit l'utilisateur a role='admin'
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Vérification
SELECT 
    u.email,
    u.role,
    COUNT(r.id) as rentals_visibles
FROM users u
LEFT JOIN rentals r ON (
    r.user_id = u.id 
    OR u.role = 'admin'
)
WHERE u.email IN ('buba6c@gmail.com', 'admin@onesms.com')
GROUP BY u.id, u.email, u.role;

-- Afficher les politiques
SELECT policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'rentals'
ORDER BY cmd, policyname;
