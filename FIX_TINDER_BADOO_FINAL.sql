-- ========================================
-- FIX: Tinder & Badoo - Codes SMS-Activate (Avec gestion conflit + FK)
-- ========================================

-- CONFLIT DÉTECTÉ: 
-- 1. Un service "OI" existe déjà avec le code "oi"
-- 2. Tinder est référencé dans service_icons (FK constraint)
-- SOLUTION: Mettre à jour les FK d'abord, supprimer OI, puis corriger Tinder

-- 1️⃣ Mettre à jour service_icons: "tinder" → "oi"
UPDATE service_icons
SET service_code = 'oi'
WHERE service_code = 'tinder';

-- 2️⃣ Mettre à jour pricing_rules: "tinder" → "oi"
UPDATE pricing_rules
SET service_code = 'oi'
WHERE service_code = 'tinder';

-- 3️⃣ Supprimer le service "OI" qui bloque (inactive, popularity 5)
DELETE FROM services
WHERE name = 'OI' 
  AND code = 'oi' 
  AND active = false;

-- 4️⃣ Corriger Tinder: "tinder" → "oi" + restaurer icône
UPDATE services
SET code = 'oi',
    icon = '❤️'
WHERE name = 'Tinder' 
  AND code = 'tinder'
  AND active = true;

-- 5️⃣ Mettre à jour service_icons: "badoo" → "qv"
UPDATE service_icons
SET service_code = 'qv'
WHERE service_code = 'badoo';

-- 6️⃣ Mettre à jour pricing_rules: "badoo" → "qv"
UPDATE pricing_rules
SET service_code = 'qv'
WHERE service_code = 'badoo';

-- 7️⃣ Désactiver le mauvais Badoo (code: "badoo")
UPDATE services
SET active = false
WHERE name = 'Badoo' 
  AND code = 'badoo';

-- 8️⃣ Activer le bon Badoo (code: "qv") + copier données + restaurer icône
UPDATE services
SET active = true,
    popularity_score = 850,
    icon = '💙',
    total_available = (
      SELECT total_available 
      FROM services 
      WHERE name = 'Badoo' AND code = 'badoo'
    )
WHERE name = 'Badoo' 
  AND code = 'qv';

-- 9️⃣ Vérifier services (avec icônes)
SELECT 
  name, 
  code, 
  active,
  icon,
  category, 
  popularity_score, 
  total_available
FROM services
WHERE name IN ('Tinder', 'Badoo', 'OI')
ORDER BY name, active DESC;

-- 🔟 Vérifier service_icons
SELECT service_code, COUNT(*) as count
FROM service_icons
WHERE service_code IN ('oi', 'qv', 'tinder', 'badoo')
GROUP BY service_code
ORDER BY service_code;

-- 1️⃣1️⃣ Vérifier pricing_rules
SELECT service_code, COUNT(*) as count
FROM pricing_rules
WHERE service_code IN ('oi', 'qv', 'tinder', 'badoo')
GROUP BY service_code
ORDER BY service_code;

-- ========================================
-- RÉSULTAT ATTENDU:
-- ========================================
-- Services:
-- Tinder | oi    | true  | ❤️ | dating | 900 | 2527430
-- Badoo  | qv    | true  | 💙 | dating | 850 | 584005
-- Badoo  | badoo | false | 💙 | dating | 850 | 584005
-- (OI supprimé)
--
-- service_icons: oi=1, qv=1
-- pricing_rules: oi=5, qv=5
--
-- ✅ Tinder affiche avec code "oi" et icône ❤️
-- ✅ Badoo affiche avec code "qv" et icône 💙 (584K numéros disponibles)
-- ✅ Pas de limite de 1000 services (2244+ services actifs)
-- ========================================
