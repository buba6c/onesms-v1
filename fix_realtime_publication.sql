-- ====================================================
-- FIX REALTIME SUPABASE - À exécuter dans Supabase SQL Editor
-- ====================================================
-- Ce script configure correctement Realtime pour toutes les tables nécessaires

-- 1. Vérifier les tables actuellement dans la publication
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 2. Ajouter les tables manquantes à la publication Realtime
-- NOTE: Si une table est déjà dans la publication, la commande échouera silencieusement

DO $$
BEGIN
    -- Ajouter users
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
        RAISE NOTICE 'Table users ajoutée à supabase_realtime';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table users déjà dans supabase_realtime';
    END;
    
    -- Ajouter activations
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.activations;
        RAISE NOTICE 'Table activations ajoutée à supabase_realtime';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table activations déjà dans supabase_realtime';
    END;
    
    -- Ajouter transactions
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
        RAISE NOTICE 'Table transactions ajoutée à supabase_realtime';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table transactions déjà dans supabase_realtime';
    END;
    
    -- Ajouter rentals
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rentals;
        RAISE NOTICE 'Table rentals ajoutée à supabase_realtime';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table rentals déjà dans supabase_realtime';
    END;
    
    -- Ajouter balance_operations
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.balance_operations;
        RAISE NOTICE 'Table balance_operations ajoutée à supabase_realtime';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table balance_operations déjà dans supabase_realtime';
    END;
END $$;

-- 3. Vérifier le résultat
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;

-- 4. Vérifier que RLS est activé mais permet les SELECT pour le user concerné
-- (Realtime utilise le RLS pour filtrer les messages)

-- Pour les activations
SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'public.activations'::regclass;

-- Pour les users
SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'public.users'::regclass;

-- 5. Test de mise à jour (décommenter pour tester)
-- UPDATE public.users SET balance = balance WHERE id = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

-- ====================================================
-- NOTE IMPORTANTE:
-- Si après avoir exécuté ce script, Realtime ne fonctionne toujours pas:
-- 1. Allez dans Database > Replication dans le Dashboard Supabase
-- 2. Vérifiez que "supabase_realtime" est actif
-- 3. Activez Realtime pour les tables concernées via l'interface
-- ====================================================
