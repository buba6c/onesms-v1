-- INITIALISER GRIZZLY DANS PROVIDER_PERFORMANCE
-- Exécutez dans Supabase SQL Editor

-- 1. D'abord voir les colonnes disponibles (pour debug)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'provider_performance'
ORDER BY ordinal_position;

-- 2. Voir les données actuelles pour comprendre la structure
SELECT * FROM public.provider_performance LIMIT 1;

-- 3. Initialiser Grizzly avec un bon score (copie depuis une ligne existante)
-- Cette requête va copier la structure d'une ligne SMS-Activate et l'adapter pour Grizzly
INSERT INTO public.provider_performance (
    provider,
    service_code,
    score,
    attempts,
    successes,
    created_at,
    updated_at,
    last_success_at
)
SELECT 
    'grizzly' as provider,
    service_code,
    90.0 as score,  -- Score initial élevé pour que Grizzly soit prioritaire
    5 as attempts,
    4 as successes,
    NOW() as created_at,
    NOW() as updated_at,
    NOW() as last_success_at
FROM public.provider_performance
WHERE provider = 'sms-activate' 
  AND score > 0
LIMIT 1
ON CONFLICT (provider, service_code) DO NOTHING;

-- Si la requête ci-dessus échoue à cause de colonnes manquantes,
-- utilisez cette version minimaliste :
-- INSERT INTO public.provider_performance (provider, service_code, score, attempts, successes)
-- VALUES ('grizzly', 'DEFAULT', 90.0, 5, 4);

-- 4. Vérifier que Grizzly est bien ajouté
SELECT provider, service_code, score, attempts
FROM public.provider_performance
WHERE provider = 'grizzly';

-- 5. Voir le nouveau classement
SELECT provider, score, attempts 
FROM public.provider_performance 
ORDER BY score DESC 
LIMIT 10;
