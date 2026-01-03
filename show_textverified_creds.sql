-- Afficher les credentials TextVerified (pour debug)
-- ATTENTION: Ne partagez jamais cette sortie publiquement !

SELECT 
    key,
    value,
    LENGTH(value) as len,
    updated_at
FROM public.system_settings
WHERE key IN ('textverified_api_key', 'textverified_api_username')
ORDER BY key;
