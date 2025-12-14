-- ============================================================================
-- FIX POUR EMAIL_CAMPAIGNS - À EXÉCUTER DANS LE DASHBOARD SUPABASE
-- ============================================================================

-- 1. Ajouter les colonnes manquantes
ALTER TABLE email_campaigns 
ADD COLUMN IF NOT EXISTS email_type TEXT DEFAULT 'promo';

-- Modifier target_filter si c'est JSONB, sinon créer en TEXT
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_campaigns' 
    AND column_name = 'target_filter'
  ) THEN
    ALTER TABLE email_campaigns ADD COLUMN target_filter TEXT DEFAULT 'all';
  END IF;
END $$;

-- 2. Créer politique pour service_role (permet le logging depuis edge function)
DROP POLICY IF EXISTS "Service role can manage campaigns" ON email_campaigns;

CREATE POLICY "Service role can manage campaigns" ON email_campaigns
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Vérifier que la table est prête
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'email_campaigns'
ORDER BY ordinal_position;
