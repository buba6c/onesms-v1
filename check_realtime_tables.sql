-- ====================================================
-- CHECK & FIX REALTIME - Version sécurisée
-- ====================================================

-- 1. D'abord, voir quelles tables sont DÉJÀ dans la publication
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;

-- 2. Ajouter SEULEMENT les tables manquantes (une par une)
-- Décommentez et exécutez individuellement selon ce qui manque:

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.rentals;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.balance_operations;
