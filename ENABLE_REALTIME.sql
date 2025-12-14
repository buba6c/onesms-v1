-- =====================================================
-- ACTIVER SUPABASE REALTIME SUR LES TABLES
-- Exécuter ce script dans Supabase SQL Editor
-- =====================================================

-- Ajouter les tables à la publication (ignore si déjà présent)
DO $$
BEGIN
  -- activations
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE activations;
    RAISE NOTICE 'activations ajouté à realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'activations déjà dans realtime';
  END;
  
  -- users
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
    RAISE NOTICE 'users ajouté à realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'users déjà dans realtime';
  END;
  
  -- transactions
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    RAISE NOTICE 'transactions ajouté à realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'transactions déjà dans realtime';
  END;
  
  -- rentals
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE rentals;
    RAISE NOTICE 'rentals ajouté à realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'rentals déjà dans realtime';
  END;
END $$;

-- Vérifier les tables dans la publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
