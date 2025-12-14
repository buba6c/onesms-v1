-- ═══════════════════════════════════════════════════════════════
-- NETTOYAGE: Supprimer les politiques en double
-- DATE: 2025-12-02
-- ═══════════════════════════════════════════════════════════════

-- Supprimer les doublons (garder seulement les versions {authenticated})
DROP POLICY IF EXISTS "Users can view their own rentals" ON rentals;
DROP POLICY IF EXISTS "Users can create their own rentals" ON rentals;
DROP POLICY IF EXISTS "Users can update their own rentals" ON rentals;
DROP POLICY IF EXISTS "Service role full access" ON rentals;

-- VÉRIFICATION FINALE
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'rentals';
