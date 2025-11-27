-- ============================================
-- FIX CATÉGORIES ET AFFICHAGE DASHBOARD
-- ============================================
-- Objectif: Mettre à jour category='popular' pour services avec score > 800
-- Et supprimer les duplicatas

-- ÉTAPE 1: Mettre à jour les catégories pour services populaires (score > 800)
UPDATE services
SET category = 'popular'
WHERE active = true
  AND popularity_score > 800
  AND total_available > 0;

-- ÉTAPE 2: Supprimer les duplicatas (garder versions avec stock)
-- Facebook duplicata
DELETE FROM services 
WHERE code = 'facebook' 
  AND name = 'Facebook' 
  AND total_available = 0
  AND category = 'other';

-- Twitter duplicata  
DELETE FROM services 
WHERE code = 'twitter' 
  AND name = 'Twitter' 
  AND total_available = 0
  AND category = 'other';

-- WhatsApp/Whatsapp duplicatas (garder versions avec meilleur stock)
DELETE FROM services 
WHERE name ILIKE 'whatsapp' 
  AND total_available = 0;

-- Telegram duplicatas
DELETE FROM services 
WHERE name ILIKE 'telegram' 
  AND total_available = 0;

-- Instagram duplicatas
DELETE FROM services 
WHERE name ILIKE 'instagram' 
  AND total_available = 0
  AND category = 'other';

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Compter les services par catégorie
SELECT 
  category,
  COUNT(*) as total,
  SUM(CASE WHEN total_available > 0 THEN 1 ELSE 0 END) as avec_stock
FROM services
WHERE active = true
GROUP BY category
ORDER BY 
  CASE 
    WHEN category = 'popular' THEN 1
    WHEN category = 'social' THEN 2
    WHEN category = 'messaging' THEN 3
    ELSE 10
  END;

-- Afficher les services populaires
SELECT 
  name,
  code,
  category,
  popularity_score,
  total_available
FROM services
WHERE active = true AND category = 'popular'
ORDER BY popularity_score DESC
LIMIT 30;
