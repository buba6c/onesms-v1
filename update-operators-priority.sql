-- ================================================================
-- MISE À JOUR DU SYSTÈME DE TRI DES OPÉRATEURS
-- ================================================================
-- Exécuter ce script dans Supabase SQL Editor

-- Étape 1: Ajouter une colonne pour le tri des pricing rules
ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS display_priority INTEGER DEFAULT 0;

-- Étape 2: Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_pricing_rules_priority 
ON pricing_rules(service_code, country_code, display_priority DESC, available_count DESC);

-- Étape 3: Calculer le display_priority basé sur la stratégie optimale
-- Formule: (available_count / 1000) + (margin_percentage * 2) + (activation_price inversé)
-- Ceci favorise: Stock élevé + Bonne marge + Prix compétitif

UPDATE pricing_rules
SET display_priority = CASE
  -- Si pas de stock, priorité 0
  WHEN available_count = 0 THEN 0
  -- Sinon calculer le score composite
  ELSE 
    (available_count / 1000)::INTEGER +
    (CASE WHEN margin_percentage > 0 THEN margin_percentage * 2 ELSE 0 END)::INTEGER +
    (CASE WHEN activation_price > 0 THEN (100 / activation_price)::INTEGER ELSE 0 END)
END
WHERE active = true;

-- Étape 4: Vérifier les résultats pour Google + England
SELECT 
  operator,
  activation_price,
  available_count,
  margin_percentage,
  display_priority,
  active
FROM pricing_rules
WHERE service_code = 'google' 
  AND country_code = 'england'
  AND active = true
ORDER BY display_priority DESC, available_count DESC, activation_price ASC
LIMIT 10;

-- Étape 5: Statistiques globales
SELECT 
  COUNT(*) as total_rules,
  COUNT(*) FILTER (WHERE display_priority > 0) as rules_with_priority,
  COUNT(*) FILTER (WHERE available_count > 0) as rules_with_stock,
  AVG(display_priority) FILTER (WHERE display_priority > 0) as avg_priority
FROM pricing_rules
WHERE active = true;

-- Étape 6: Top opérateurs par pays (exemple)
SELECT 
  country_code,
  operator,
  COUNT(*) as services_count,
  SUM(available_count) as total_stock,
  AVG(display_priority) as avg_priority
FROM pricing_rules
WHERE active = true AND available_count > 0
GROUP BY country_code, operator
ORDER BY total_stock DESC
LIMIT 20;
