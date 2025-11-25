/**
 * ATTENTION: Ce script doit être exécuté dans le Dashboard Supabase
 * SQL Editor: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new
 * 
 * Copier-coller ce SQL et l'exécuter
 */

-- ========================================
-- FIX: Tinder & Badoo - Codes SMS-Activate
-- ========================================

-- PROBLÈME IDENTIFIÉ:
-- 1. Tinder a le code "tinder" au lieu de "oi" (code SMS-Activate correct)
-- 2. Badoo a 2 entrées: "badoo" (actif, mauvais) et "qv" (inactif, correct)

-- SOLUTION:

-- 1️⃣ Corriger Tinder: "tinder" → "oi"
UPDATE services
SET code = 'oi'
WHERE name = 'Tinder' 
  AND code = 'tinder'
  AND active = true;

-- 2️⃣ Désactiver le mauvais Badoo (code: "badoo")
UPDATE services
SET active = false
WHERE name = 'Badoo' 
  AND code = 'badoo';

-- 3️⃣ Activer le bon Badoo (code: "qv")
UPDATE services
SET active = true,
    popularity_score = 850  -- Copier la popularité du mauvais Badoo
WHERE name = 'Badoo' 
  AND code = 'qv';

-- 4️⃣ Vérifier le résultat
SELECT 
  name, 
  code, 
  active, 
  category, 
  popularity_score, 
  total_available
FROM services
WHERE name IN ('Tinder', 'Badoo')
ORDER BY name, active DESC;

-- ========================================
-- RÉSULTAT ATTENDU:
-- ========================================
-- Badoo | qv     | true  | dating | 850 | 43 pays
-- Badoo | badoo  | false | dating | 850 | 0
-- Tinder| oi     | true  | dating | 900 | 52 pays
-- ========================================
