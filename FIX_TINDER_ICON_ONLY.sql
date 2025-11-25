-- ========================================
-- FIX FINAL: Corriger uniquement l'icône Tinder
-- ========================================
-- 
-- ANALYSE COMPLÈTE effectuée le 25 nov 2025:
-- ✅ Code "oi" déjà correct
-- ✅ Badoo (qv) déjà actif avec 584K numéros
-- ✅ Aucune contrainte FK bloquante
-- ❌ SEUL PROBLÈME: Icône Tinder = "📱" au lieu de "❤️"
--
-- Cette requête unique corrige le dernier problème
-- ========================================

UPDATE services
SET icon = '❤️'
WHERE name = 'Tinder' 
  AND code = 'oi'
  AND active = true;

-- Vérification
SELECT 
  name, 
  code, 
  icon, 
  active,
  total_available,
  popularity_score
FROM services
WHERE name IN ('Tinder', 'Badoo')
  AND active = true
ORDER BY name;

-- ========================================
-- RÉSULTAT ATTENDU:
-- ========================================
-- Tinder | oi | ❤️ | true | 2527430 | 900
-- Badoo  | qv | 💙 | true | 584005  | 850
-- ========================================
