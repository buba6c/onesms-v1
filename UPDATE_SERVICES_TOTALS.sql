-- ============================================================================
-- MISE À JOUR DES TOTAUX DE SERVICES
-- ============================================================================
-- Ce script met à jour le champ total_available dans services
-- en additionnant tous les available_count de pricing_rules
-- ============================================================================

-- Mettre à jour total_available pour tous les services
UPDATE services s
SET total_available = (
  SELECT COALESCE(SUM(pr.available_count), 0)
  FROM pricing_rules pr
  WHERE pr.service_code = s.code
    AND pr.active = true
);

-- Vérifier les résultats
SELECT 
  code,
  name,
  total_available,
  (SELECT COUNT(*) FROM pricing_rules WHERE service_code = code AND active = true) as pricing_rules_count
FROM services
WHERE active = true
ORDER BY total_available DESC
LIMIT 20;

-- Statistiques globales
SELECT 
  COUNT(*) as total_services,
  SUM(total_available) as total_numbers,
  AVG(total_available) as avg_per_service,
  MAX(total_available) as max_numbers
FROM services
WHERE active = true;
