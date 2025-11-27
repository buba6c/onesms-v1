-- Fix Categories and Remove Duplicates
-- Étape 1: Supprimer le duplicata Amazon
-- Étape 2: Resynchroniser avec la nouvelle Edge Function

-- ============================================
-- ÉTAPE 1: SUPPRIMER LE DUPLICATA AMAZON
-- ============================================
DELETE FROM services WHERE id = '1893932e-2d8f-4aa5-8a18-dc1eab8bcb2f';

-- ============================================
-- ÉTAPE 2: VÉRIFICATION
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
    WHEN category = 'tech' THEN 4
    WHEN category = 'shopping' THEN 5
    WHEN category = 'entertainment' THEN 6
    WHEN category = 'dating' THEN 7
    WHEN category = 'delivery' THEN 8
    WHEN category = 'finance' THEN 9
    ELSE 10
  END;

-- Afficher les top 30 services populaires
SELECT 
  name,
  code,
  category,
  popularity_score,
  total_available
FROM services
WHERE active = true
ORDER BY popularity_score DESC
LIMIT 30;
