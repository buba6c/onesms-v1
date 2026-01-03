-- Vérifier les credentials TextVerified dans system_settings
SELECT 
    key,
    CASE 
        WHEN value IS NULL OR value = '' THEN '❌ VIDE'
        WHEN LENGTH(value) < 10 THEN '⚠️ TROP COURT (' || LENGTH(value) || ' chars)'
        ELSE '✅ CONFIGURÉ (' || LENGTH(value) || ' chars)'
    END as status,
    category,
    type,
    updated_at
FROM public.system_settings
WHERE key IN ('textverified_api_key', 'textverified_api_username')
ORDER BY key;

-- Si rien n'apparaît, les clés n'existent pas du tout dans la table
