-- Fix RLS pour permettre la lecture publique des settings referral

-- Supprimer si existe déjà
DROP POLICY IF EXISTS "Public read referral settings" ON system_settings;

-- Créer policy pour lecture publique des settings de catégorie referral
CREATE POLICY "Public read referral settings" ON system_settings
  FOR SELECT
  USING (category = 'referral');

-- Vérifier
SELECT pol.polname, pol.polcmd
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
WHERE c.relname = 'system_settings';
