-- ============================================================================
-- SCRIPT D'EXÉCUTION - À exécuter dans Supabase SQL Editor
-- ============================================================================

-- 1. Créer la table activations
\i 020_activations_table.sql

-- 2. Vérifier que la table est créée
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'activations' 
ORDER BY ordinal_position;

-- 3. Vérifier les policies RLS
SELECT 
  tablename, 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'activations';

-- 4. Test insert (devrait échouer car pas service_role)
-- INSERT INTO activations (
--   user_id, order_id, phone, service_code, country_code, 
--   operator, price, status, expires_at
-- ) VALUES (
--   auth.uid(), '12345', '+33612345678', 'whatsapp', 'france',
--   'orange', 1.50, 'pending', NOW() + INTERVAL '20 minutes'
-- );

-- 5. Afficher le résumé
SELECT 
  'Activations table created successfully' as status,
  COUNT(*) as total_rows
FROM activations;
