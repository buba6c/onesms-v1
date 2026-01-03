-- Vérifier que les fonctions RPC atomiques sont déployées
-- Exécutez dans Supabase SQL Editor

-- 1. Lister toutes les fonctions atomiques
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as parameters,
    prokind as kind
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('atomic_refund', 'atomic_complete_activation', 'atomic_freeze_balance')
ORDER BY proname;

-- Si aucune ligne n'est retournée, les fonctions ne sont PAS déployées !

-- 2. Vérifier le contenu de atomic_refund
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'atomic_refund'
  AND pronamespace = 'public'::regnamespace;

-- 3. Vérifier le contenu de atomic_complete_activation
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'atomic_complete_activation'
  AND pronamespace = 'public'::regnamespace;
