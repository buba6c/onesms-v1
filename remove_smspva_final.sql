-- SUPPRESSION COMPLÈTE DE SMSPVA DU SYSTÈME
-- Execute ce script dans Supabase SQL Editor

-- 1. Mettre à jour la priorité des providers (SANS SMSPVA)
UPDATE public.system_settings
SET value = '["grizzly", "sms-activate", "5sim", "onlinesim"]',
    updated_at = NOW()
WHERE key = 'provider_priority';

-- 2. Désactiver SMSPVA (optionnel - garde les stats historiques mais désactive)
-- Commentez cette ligne si vous voulez garder SMSPVA disponible mais non prioritaire
UPDATE public.system_settings
SET value = '',
    updated_at = NOW()
WHERE key = 'smspva_api_key';

-- 3. Vérifier la mise à jour
SELECT 
    key,
    value,
    updated_at
FROM public.system_settings
WHERE key IN ('provider_priority', 'smspva_api_key', 'sms_provider_mode');

-- 4. Stats SMSPVA actuelles (pour information)
SELECT 
    provider,
    COUNT(*) as total_activations,
    COUNT(CASE WHEN status = 'received' AND charged = true THEN 1 END) as successful,
    COUNT(CASE WHEN status IN ('cancelled', 'expired', 'timeout') THEN 1 END) as failed,
    ROUND(
        100.0 * COUNT(CASE WHEN status = 'received' AND charged = true THEN 1 END) / NULLIF(COUNT(*), 0),
        2
    ) as success_rate_percent
FROM public.activations
WHERE provider = 'smspva'
GROUP BY provider;

-- 5. Afficher les nouveaux providers actifs
SELECT DISTINCT provider, COUNT(*) as count
FROM public.activations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider
ORDER BY count DESC;
