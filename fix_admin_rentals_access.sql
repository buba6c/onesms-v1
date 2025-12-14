-- ═══════════════════════════════════════════════════════════════
-- FIX: Permettre aux ADMINS de voir TOUS les rentals
-- DATE: 2025-12-02
-- PROBLÈME: La page AdminRentals ne montre rien car l'admin 
--          (utilisateur authentifié) ne voit que ses propres rentals
-- ═══════════════════════════════════════════════════════════════

-- Méthode 1: Ajouter une politique pour les admins (is_admin = true)
-- Cette politique permet aux admins de SELECT tous les rentals

CREATE POLICY "rentals_admin_select_all" ON rentals
    FOR SELECT TO authenticated
    USING (
        -- Soit c'est son propre rental
        auth.uid() = user_id
        -- Soit l'utilisateur est admin
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Note: Si la politique "rentals_select_own" existe déjà, il faut d'abord la supprimer
-- et créer une seule politique qui gère les deux cas.

-- ═══════════════════════════════════════════════════════════════
-- VERSION ALTERNATIVE: Remplacer la politique existante
-- ═══════════════════════════════════════════════════════════════

-- Supprimer l'ancienne politique SELECT
DROP POLICY IF EXISTS "rentals_select_own" ON rentals;

-- Recréer avec support admin
CREATE POLICY "rentals_select" ON rentals
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Vérification
SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'rentals';
