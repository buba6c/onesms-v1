-- ═══════════════════════════════════════════════════════════════════════════════
-- ANALYSE APPROFONDIE DES DOUBLONS DE SERVICES
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Objectif: Détecter et supprimer les services en doublon (comme PayPal)
-- Date: 26 novembre 2025
-- ═══════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. ANALYSE DES DOUBLONS PAR NOM (name)
-- ───────────────────────────────────────────────────────────────────────────────

SELECT 
  name,
  COUNT(*) as nombre_doublons,
  STRING_AGG(code, ', ' ORDER BY code) as codes,
  STRING_AGG(CASE WHEN active THEN '✅' ELSE '❌' END, '' ORDER BY code) as statuts,
  STRING_AGG(id::text, ', ' ORDER BY code) as ids
FROM services
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, name;

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. ANALYSE DES DOUBLONS PAR DISPLAY_NAME
-- ───────────────────────────────────────────────────────────────────────────────

SELECT 
  display_name,
  COUNT(*) as nombre_doublons,
  STRING_AGG(code, ', ' ORDER BY code) as codes,
  STRING_AGG(name, ', ' ORDER BY code) as names,
  STRING_AGG(CASE WHEN active THEN '✅' ELSE '❌' END, '' ORDER BY code) as statuts,
  STRING_AGG(id::text, ', ' ORDER BY code) as ids
FROM services
WHERE display_name IS NOT NULL AND display_name != ''
GROUP BY display_name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, display_name;

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. DÉTAIL COMPLET DES SERVICES AYANT LE MÊME NOM
-- ───────────────────────────────────────────────────────────────────────────────

WITH duplicates AS (
  SELECT name
  FROM services
  GROUP BY name
  HAVING COUNT(*) > 1
)
SELECT 
  s.code,
  s.name,
  s.display_name,
  s.active,
  s.category,
  s.popularity_score,
  s.total_available,
  s.id,
  s.created_at,
  s.updated_at
FROM services s
INNER JOIN duplicates d ON s.name = d.name
ORDER BY s.name, s.code;

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. DÉTAIL COMPLET DES SERVICES AYANT LE MÊME DISPLAY_NAME
-- ───────────────────────────────────────────────────────────────────────────────

WITH duplicates AS (
  SELECT display_name
  FROM services
  WHERE display_name IS NOT NULL AND display_name != ''
  GROUP BY display_name
  HAVING COUNT(*) > 1
)
SELECT 
  s.code,
  s.name,
  s.display_name,
  s.active,
  s.category,
  s.popularity_score,
  s.total_available,
  s.id,
  s.created_at,
  s.updated_at
FROM services s
INNER JOIN duplicates d ON s.display_name = d.display_name
ORDER BY s.display_name, s.code;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ANALYSE SPÉCIFIQUE: PAYPAL
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  code,
  name,
  display_name,
  active,
  category,
  popularity_score,
  total_available,
  id,
  created_at,
  updated_at
FROM services
WHERE LOWER(name) LIKE '%paypal%' 
   OR LOWER(display_name) LIKE '%paypal%'
   OR code IN ('ts', 'pp', 'paypal')
ORDER BY code;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE NETTOYAGE AUTOMATIQUE
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- STRATÉGIE:
-- 1. Pour chaque groupe de doublons, garder celui avec:
--    - Le code le plus court
--    - OU le plus populaire (popularity_score le plus élevé)
--    - OU actif si les autres sont inactifs
-- 2. Supprimer les autres
--
-- ⚠️  ATTENTION: Vérifiez les résultats avant d'exécuter ce script!
-- ───────────────────────────────────────────────────────────────────────────────

-- Étape 1: Identifier les IDs à supprimer (services en doublon avec critères)
WITH duplicate_groups AS (
  -- Grouper par name
  SELECT 
    name,
    ARRAY_AGG(
      id ORDER BY 
        active DESC,                    -- Préférer les actifs
        popularity_score DESC,          -- Préférer les populaires
        LENGTH(code),                   -- Préférer les codes courts
        code                            -- Ordre alphabétique
    ) as service_ids
  FROM services
  GROUP BY name
  HAVING COUNT(*) > 1
  
  UNION ALL
  
  -- Grouper par display_name
  SELECT 
    display_name as name,
    ARRAY_AGG(
      id ORDER BY 
        active DESC,
        popularity_score DESC,
        LENGTH(code),
        code
    ) as service_ids
  FROM services
  WHERE display_name IS NOT NULL AND display_name != ''
  GROUP BY display_name
  HAVING COUNT(*) > 1
),
ids_to_delete AS (
  SELECT 
    name,
    service_ids[1] as keep_id,
    UNNEST(service_ids[2:]) as delete_id
  FROM duplicate_groups
)
SELECT 
  '-- ' || s.name || ' (code: ' || s.code || ')' as comment,
  'DELETE FROM services WHERE id = ''' || s.id || ''';' as sql_command,
  s.code,
  s.name,
  s.display_name,
  s.active,
  s.id
FROM services s
WHERE s.id IN (SELECT delete_id FROM ids_to_delete)
ORDER BY s.name, s.code;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STATISTIQUES GLOBALES
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  'Total services' as metric,
  COUNT(*) as value
FROM services

UNION ALL

SELECT 
  'Services actifs' as metric,
  COUNT(*) as value
FROM services
WHERE active = true

UNION ALL

SELECT 
  'Services inactifs' as metric,
  COUNT(*) as value
FROM services
WHERE active = false

UNION ALL

SELECT 
  'Doublons par name' as metric,
  COUNT(DISTINCT name) as value
FROM (
  SELECT name
  FROM services
  GROUP BY name
  HAVING COUNT(*) > 1
) sub

UNION ALL

SELECT 
  'Doublons par display_name' as metric,
  COUNT(DISTINCT display_name) as value
FROM (
  SELECT display_name
  FROM services
  WHERE display_name IS NOT NULL AND display_name != ''
  GROUP BY display_name
  HAVING COUNT(*) > 1
) sub

UNION ALL

SELECT 
  'Services sans display_name' as metric,
  COUNT(*) as value
FROM services
WHERE display_name IS NULL OR display_name = '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE L'ANALYSE
-- ═══════════════════════════════════════════════════════════════════════════════
