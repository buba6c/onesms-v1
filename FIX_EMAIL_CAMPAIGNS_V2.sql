-- ============================================================================
-- FIX V2 POUR EMAIL_CAMPAIGNS - À EXÉCUTER DANS LE DASHBOARD SUPABASE
-- Ajoute la colonne manquante 'failed_count' qui cause l'erreur PGRST204
-- ============================================================================

-- 1. Ajouter la colonne failed_count si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_campaigns' 
    AND column_name = 'failed_count'
  ) THEN
    ALTER TABLE email_campaigns ADD COLUMN failed_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 2. Vérifier et corriger les autres colonnes potentiellement manquantes
DO $$ 
BEGIN
  -- created_by (UUID)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_campaigns' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE email_campaigns ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;

  -- sent_at (TIMESTAMPTZ)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_campaigns' 
    AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE email_campaigns ADD COLUMN sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Rafraîchir le cache des schémas (implicite via Notify, maintenu ici pour info)
NOTIFY pgrst, 'reload schema';

-- 4. Vérification finale
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'email_campaigns'
AND column_name = 'failed_count';
