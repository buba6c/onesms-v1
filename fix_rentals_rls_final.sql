-- ═══════════════════════════════════════════════════════════════
-- FIX DÉFINITIF: Supprimer toutes les politiques et recréer proprement
-- ═══════════════════════════════════════════════════════════════

-- 1. Désactiver temporairement RLS
ALTER TABLE rentals DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer TOUTES les politiques existantes
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'rentals'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON rentals', pol.policyname);
    END LOOP;
END $$;

-- 3. Réactiver RLS
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- 4. Ne PAS forcer RLS pour service_role
ALTER TABLE rentals NO FORCE ROW LEVEL SECURITY;

-- 5. Créer les politiques propres
-- Utilisateurs authentifiés peuvent voir leurs locations
CREATE POLICY "rentals_select_own" ON rentals
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Utilisateurs authentifiés peuvent créer leurs locations
CREATE POLICY "rentals_insert_own" ON rentals
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Utilisateurs authentifiés peuvent modifier leurs locations
CREATE POLICY "rentals_update_own" ON rentals
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Service role a accès total (pour les Edge Functions)
CREATE POLICY "rentals_service_role_all" ON rentals
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. Vérifier
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'rentals';
