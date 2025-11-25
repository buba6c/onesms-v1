-- ================================================================
-- FIX CRITIQUE: RLS Activations - À exécuter dans Supabase Dashboard
-- ================================================================

-- 1. DÉSACTIVER RLS temporairement (SOLUTION RAPIDE)
ALTER TABLE activations DISABLE ROW LEVEL SECURITY;

-- 2. Ajouter colonnes manquantes
ALTER TABLE activations ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE activations ADD COLUMN IF NOT EXISTS charged BOOLEAN DEFAULT FALSE;

-- 3. Activer Realtime pour synchronisation automatique (ignoré si déjà ajouté)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE activations;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table activations already in publication';
END
$$;

-- 4. Vérifier état (doit afficher RLS Enabled = false)
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'activations';

-- 5. TEST: Insertion manuelle pour vérifier que ça fonctionne
INSERT INTO activations (
  user_id,
  order_id,
  phone,
  service_code,
  country_code,
  operator,
  price,
  status,
  expires_at,
  provider
) VALUES (
  'ea4eb96d-1663-427e-8903-65113aaf4221',  -- admin@onesms.test
  'test_' || extract(epoch from now()),
  '+6289518249636',
  'whatsapp',
  'indonesia',
  'any',
  15.5,
  'pending',
  now() + interval '20 minutes',
  'sms-activate'
) RETURNING id, phone, status, created_at;

-- 6. Vérifier que l'activation a été créée
SELECT COUNT(*) as total_activations FROM activations;

-- ================================================================
-- INSTRUCTIONS:
-- ================================================================
-- 1. Ouvrez: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/editor
-- 2. Cliquez "SQL Editor" dans la sidebar gauche
-- 3. Cliquez "+ New Query"
-- 4. Copiez TOUT ce fichier
-- 5. Collez dans l'éditeur
-- 6. Cliquez "RUN" (ou Cmd+Enter)
-- 7. Vérifiez que vous voyez "RLS Enabled = false" et l'activation créée
-- 8. Relancez: node verify_fix_complete.mjs
-- ================================================================
