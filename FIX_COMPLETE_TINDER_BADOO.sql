-- ========================================
-- FIX COMPLET: Tinder & Badoo - Codes + Icônes + Disponibilité
-- ========================================

-- PROBLÈMES À CORRIGER:
-- 1. Codes SMS-Activate incorrects (tinder/badoo → oi/qv)
-- 2. Contraintes FK (service_icons, pricing_rules)
-- 3. Service "OI" bloque le code "oi"
-- 4. Icône Tinder changée en "📱" au lieu de "❤️"
-- 5. Badoo (qv) a total_available=0 donc invisible (filtré par .gt(0))

-- ========================================
-- ÉTAPE 1: Mettre à jour les FK
-- ========================================

-- 1️⃣ Mettre à jour service_icons: "tinder" → "oi"
UPDATE service_icons
SET service_code = 'oi'
WHERE service_code = 'tinder';

-- 2️⃣ Mettre à jour pricing_rules: "tinder" → "oi"
UPDATE pricing_rules
SET service_code = 'oi'
WHERE service_code = 'tinder';

-- 3️⃣ Mettre à jour service_icons: "badoo" → "qv"
UPDATE service_icons
SET service_code = 'qv'
WHERE service_code = 'badoo';

-- 4️⃣ Mettre à jour pricing_rules: "badoo" → "qv"
UPDATE pricing_rules
SET service_code = 'qv'
WHERE service_code = 'badoo';

-- ========================================
-- ÉTAPE 2: Corriger les services
-- ========================================

-- 5️⃣ Supprimer le service "OI" qui bloque
DELETE FROM services
WHERE name = 'OI' 
  AND code = 'oi' 
  AND active = false;

-- 6️⃣ Corriger Tinder: "tinder" → "oi" + restaurer icône
UPDATE services
SET code = 'oi',
    icon = '❤️'
WHERE name = 'Tinder' 
  AND code = 'tinder'
  AND active = true;

-- 7️⃣ Désactiver le mauvais Badoo (code: "badoo")
UPDATE services
SET active = false
WHERE name = 'Badoo' 
  AND code = 'badoo';

-- 8️⃣ Activer le bon Badoo (code: "qv") + copier données
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

-- ========================================
-- ÉTAPE 3: Vérifications
-- ========================================

-- 9️⃣ Vérifier services
SELECT 
  name, 
  code, 
  active,
  icon,
  total_available,
  category, 
  popularity_score
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
-- Tinder | oi    | true  | ❤️ | 2527430 | dating | 900
-- Badoo  | qv    | true  | 💙 | 584005  | dating | 850
-- Badoo  | badoo | false | 💙 | 584005  | dating | 850
-- (OI supprimé)
--
-- service_icons: oi=1, qv=1
-- pricing_rules: oi=5, qv=5
-- ========================================
