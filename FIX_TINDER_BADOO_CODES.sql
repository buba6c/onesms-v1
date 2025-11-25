-- Correction des codes SMS-Activate pour Tinder et Badoo
-- PROBLÈME: Les services ont des noms longs ('tinder', 'badoo') au lieu des codes API ('oi', 'qv')

-- 1. Corriger Tinder: 'tinder' → 'oi'
UPDATE services
SET code = 'oi'
WHERE name = 'Tinder' AND active = true;

-- 2. Désactiver le mauvais Badoo (code: 'badoo')
UPDATE services
SET active = false
WHERE name = 'Badoo' AND code = 'badoo';

-- 3. Activer le bon Badoo (code: 'qv')
UPDATE services
SET active = true
WHERE name = 'Badoo' AND code = 'qv';

-- 4. Vérifier le résultat
SELECT name, code, active, category, popularity_score, total_available
FROM services
WHERE name IN ('Tinder', 'Badoo')
ORDER BY name, active DESC;
