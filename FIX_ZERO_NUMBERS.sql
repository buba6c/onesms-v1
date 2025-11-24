-- ============================================================================
-- CORRECTION IMMÉDIATE - Affichage "0 numbers"
-- ============================================================================
-- Exécutez ce script MAINTENANT dans Supabase SQL Editor
-- https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql
-- ============================================================================

-- PROBLÈME: Le dashboard utilisateur affiche "10 services" et "0 numbers"
-- CAUSE: La colonne `total_available` dans `services` n'est jamais mise à jour
-- SOLUTION: Calculer total_available en sommant tous les available_count de pricing_rules

-- Étape 1: Mettre à jour total_available pour tous les services
UPDATE services s
SET total_available = COALESCE((
  SELECT SUM(pr.available_count)
  FROM pricing_rules pr
  WHERE pr.service_code = s.code
    AND pr.active = true
), 0);

-- Étape 2: Vérifier les résultats
SELECT 
  code,
  name,
  total_available,
  (SELECT COUNT(*) FROM pricing_rules WHERE service_code = code AND active = true) as pricing_rules_count,
  (SELECT SUM(available_count) FROM pricing_rules WHERE service_code = code AND active = true) as calculated_total
FROM services
WHERE active = true
ORDER BY total_available DESC
LIMIT 30;

-- Étape 3: Statistiques globales
SELECT 
  COUNT(*) as total_services_actifs,
  SUM(total_available) as total_numeros_disponibles,
  COUNT(CASE WHEN total_available > 0 THEN 1 END) as services_avec_stock,
  COUNT(CASE WHEN total_available = 0 THEN 1 END) as services_sans_stock,
  AVG(total_available)::INTEGER as moyenne_par_service,
  MAX(total_available) as max_numbers
FROM services
WHERE active = true;

-- Étape 4: Top 20 services les plus populaires
SELECT 
  name,
  total_available,
  popularity_score
FROM services
WHERE active = true
  AND total_available > 0
ORDER BY popularity_score DESC, total_available DESC
LIMIT 20;

-- ============================================================================
-- TERMINÉ! 
-- Maintenant rechargez http://localhost:3000 
-- Vous devriez voir TOUS les services avec leurs vrais compteurs
-- ============================================================================
