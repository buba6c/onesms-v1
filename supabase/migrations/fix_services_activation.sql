-- ═══════════════════════════════════════════════════════════════
-- CORRECTION DES SERVICES - Badoo, Tinder et autres
-- ═══════════════════════════════════════════════════════════════

-- 1. Activer Tinder (OI) - 709104 numéros disponibles!
UPDATE services
SET is_active = true,
    name = 'Tinder',
    category = 'dating'
WHERE code = 'oi';

-- 2. Activer Badoo si disponible
UPDATE services
SET is_active = true
WHERE code = 'qv' AND total_available > 0;

-- 3. Activer TOUS les services avec numéros disponibles
UPDATE services
SET is_active = true
WHERE total_available > 0 AND is_active = false;

-- 4. Vérifier les résultats
SELECT 
    code,
    name,
    category,
    total_available,
    is_active,
    CASE 
        WHEN is_active AND total_available > 0 THEN '✅ OK'
        WHEN NOT is_active AND total_available > 0 THEN '⚠️  Inactif malgré disponibilité'
        WHEN total_available = 0 THEN '❌ Aucun numéro'
        ELSE '❓ État inconnu'
    END as status
FROM services
WHERE code IN ('qv', 'oi', 'wa', 'tg', 'ig', 'fb')
ORDER BY total_available DESC;

-- 5. Stats globales
SELECT 
    COUNT(*) as total_services,
    SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_services,
    SUM(CASE WHEN total_available > 0 THEN 1 ELSE 0 END) as available_services,
    SUM(CASE WHEN is_active AND total_available > 0 THEN 1 ELSE 0 END) as ready_services
FROM services;
