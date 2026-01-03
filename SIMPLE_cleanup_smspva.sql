-- NETTOYAGE RAPIDE SMSPVA - VERSION SIMPLIFIÉE
-- Exécutez ces commandes UNE PAR UNE dans Supabase SQL Editor

-- 1. SUPPRIMER SMSPVA de provider_performance
DELETE FROM public.provider_performance WHERE provider = 'smspva';

-- 2. Mettre à jour la priorité
UPDATE public.system_settings
SET value = '["grizzly", "sms-activate", "5sim", "onlinesim"]'
WHERE key = 'provider_priority';

-- 3. Désactiver clé SMSPVA
UPDATE public.system_settings
SET value = ''
WHERE key = 'smspva_api_key';

-- 4. Vérifier que SMSPVA est bien supprimé
SELECT * FROM public.provider_performance WHERE provider = 'smspva';
-- (Doit retourner 0 lignes)

-- 5. Vérifier la nouvelle priorité
SELECT value FROM public.system_settings WHERE key = 'provider_priority';
-- (Doit retourner: ["grizzly", "sms-activate", "5sim", "onlinesim"])

-- 6. Voir le classement actuel
SELECT provider, score, attempts 
FROM public.provider_performance 
ORDER BY score DESC 
LIMIT 10;
