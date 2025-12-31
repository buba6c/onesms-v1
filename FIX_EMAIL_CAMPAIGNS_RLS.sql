-- ============================================================================
-- FIX RLS POUR EMAIL_CAMPAIGNS - À EXÉCUTER DANS LE DASHBOARD SUPABASE
-- Résout l'erreur 42501 (violation de politique de sécurité)
-- ============================================================================

-- 1. Activer RLS (sécurité au niveau des lignes)
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer l'ancienne politique si elle existe (pour éviter les conflits)
DROP POLICY IF EXISTS "Admins can manage campaigns" ON email_campaigns;

-- 3. Créer la politique permettant aux ADMINS de tout faire (Insert, Select, Update, Delete)
CREATE POLICY "Admins can manage campaigns" ON email_campaigns
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Confirmer que la politique pour le service_role existe aussi (déjà fait, mais rappel)
DROP POLICY IF EXISTS "Service role can manage campaigns" ON email_campaigns;
CREATE POLICY "Service role can manage campaigns" ON email_campaigns
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Recharger le schéma
NOTIFY pgrst, 'reload schema';
