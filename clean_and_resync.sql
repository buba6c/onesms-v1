-- ============================================
-- SOLUTION COMPLÈTE: NETTOYAGE + RESYNC
-- ============================================

-- ÉTAPE 1: Supprimer TOUS les services pour forcer une resynchronisation propre
DELETE FROM services;

-- ÉTAPE 2: Supprimer les pricing_rules pour éviter les conflits
DELETE FROM pricing_rules;

-- ÉTAPE 3: Après avoir exécuté ce SQL, lancez immédiatement la resynchronisation
-- La nouvelle Edge Function va recréer tous les services avec les bonnes catégories

-- VÉRIFICATION (à exécuter APRÈS la resync):
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
