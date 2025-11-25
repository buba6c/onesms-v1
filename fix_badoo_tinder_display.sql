-- Corriger Badoo et Tinder pour qu'ils apparaissent en haut

-- 1. Badoo (code: badoo) - 584k numéros disponibles
UPDATE services
SET 
  name = 'Badoo',
  category = 'dating',
  popularity_score = 850,
  updated_at = NOW()
WHERE code = 'badoo';

-- 2. Tinder (code: tinder) - 2.5M numéros disponibles
UPDATE services
SET 
  name = 'Tinder',
  category = 'dating',
  popularity_score = 900,
  updated_at = NOW()
WHERE code = 'tinder';

-- 3. Désactiver les doublons (qv et oi) qui ont moins de numéros
UPDATE services
SET 
  active = false,
  updated_at = NOW()
WHERE code IN ('qv', 'oi');

-- Vérification
SELECT code, name, active, total_available, category, popularity_score
FROM services
WHERE code IN ('badoo', 'tinder', 'qv', 'oi')
ORDER BY popularity_score DESC;
