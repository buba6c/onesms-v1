-- NETTOYAGE COMPLET SMSPVA + MISE EN PLACE GRIZZLY
-- Exécutez ce script ligne par ligne dans Supabase SQL Editor

-- ================================================================
-- ÉTAPE 1 : SUPPRIMER SMSPVA DE PROVIDER_PERFORMANCE
-- ================================================================
-- Cela empêche le smart mode de choisir SMSPVA
DELETE FROM public.provider_performance
WHERE provider = 'smspva';

-- Vérifier la suppression
SELECT provider, score, attempts, successes
FROM public.provider_performance
ORDER BY score DESC;

-- ================================================================
-- ÉTAPE 2 : METTRE À JOUR LA PRIORITÉ (SANS SMSPVA)
-- ================================================================
UPDATE public.system_settings
SET value = '["grizzly", "sms-activate", "5sim", "onlinesim"]',
    updated_at = NOW()
WHERE key = 'provider_priority';

-- ================================================================
-- ÉTAPE 3 : DÉSACTIVER LA CLÉ API SMSPVA
-- ================================================================
UPDATE public.system_settings
SET value = '',
    updated_at = NOW()
WHERE key = 'smspva_api_key';

-- ================================================================
-- ÉTAPE 4 : INITIALISER GRIZZLY DANS PROVIDER_PERFORMANCE
-- ================================================================
-- Donner un score initial à Grizzly pour qu'il soit prioritaire
INSERT INTO public.provider_performance (
    provider,
    service_code,
    score,
    attempts,
    successes,
    failures,
    last_success_at,
    created_at,
    updated_at
)
VALUES (
    'grizzly',
    'DEFAULT',
    95.0,  -- Score initial optimiste
    10,    -- Quelques tentatives fictives
    9,     -- Plupart réussies
    1,     -- Une échouée
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (provider, service_code) DO UPDATE
SET score = 95.0,
    attempts = 10,
    successes = 9,
    failures = 1,
    last_success_at = NOW(),
    updated_at = NOW();

-- ================================================================
-- ÉTAPE 5 : VÉRIFICATION FINALE
-- ================================================================

-- 5.1 Vérifier la nouvelle priorité
SELECT key, value FROM public.system_settings 
WHERE key = 'provider_priority';

-- 5.2 Vérifier que SMSPVA est désactivé
SELECT key, value FROM public.system_settings 
WHERE key = 'smspva_api_key';

-- 5.3 Vérifier provider_performance (SMSPVA doit être absent)
SELECT provider, score, attempts, successes, failures
FROM public.provider_performance
ORDER BY score DESC;

-- 5.4 Vérifier le mode provider
SELECT key, value FROM public.system_settings 
WHERE key = 'sms_provider_mode';

-- ================================================================
-- RÉSULTAT ATTENDU
-- ================================================================
-- provider_priority: ["grizzly", "sms-activate", "5sim", "onlinesim"]
-- smspva_api_key: (vide)
-- provider_performance: Grizzly en tête avec score ~95%
-- SMSPVA: Complètement absent de provider_performance
