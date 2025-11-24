-- ================================================================
-- MISE À JOUR DE L'ORDRE DES PAYS (COMME 5SIM.NET)
-- ================================================================
-- Exécuter ce script dans Supabase SQL Editor
-- Basé sur l'ordre visible sur https://5sim.net homepage

-- Ajouter la colonne display_order si elle n'existe pas
ALTER TABLE countries ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Étape 1: Réinitialiser tous les display_order à 0
UPDATE countries SET display_order = 0;

-- Étape 2: Définir l'ordre exact de 5sim (homepage section "Select country")
-- England, USA, Canada, Indonesia, Philippines, Cambodia, South Africa, India

UPDATE countries SET display_order = 1000 WHERE code = 'england';
UPDATE countries SET display_order = 950 WHERE code = 'usa';
UPDATE countries SET display_order = 900 WHERE code = 'canada';
UPDATE countries SET display_order = 850 WHERE code = 'indonesia';
UPDATE countries SET display_order = 800 WHERE code = 'philippines';
UPDATE countries SET display_order = 750 WHERE code = 'cambodia';
UPDATE countries SET display_order = 700 WHERE code = 'southafrica';
UPDATE countries SET display_order = 650 WHERE code = 'india';

-- Autres pays populaires (basé sur l'analyse)
UPDATE countries SET display_order = 600 WHERE code = 'italy';
UPDATE countries SET display_order = 550 WHERE code = 'australia';
UPDATE countries SET display_order = 500 WHERE code = 'netherlands';
UPDATE countries SET display_order = 450 WHERE code = 'austria';
UPDATE countries SET display_order = 400 WHERE code = 'vietnam';
UPDATE countries SET display_order = 350 WHERE code = 'spain';
UPDATE countries SET display_order = 300 WHERE code = 'france';
UPDATE countries SET display_order = 250 WHERE code = 'germany';
UPDATE countries SET display_order = 200 WHERE code = 'brazil';
UPDATE countries SET display_order = 150 WHERE code = 'poland';
UPDATE countries SET display_order = 100 WHERE code = 'kenya';

-- Étape 3: Vérifier le résultat
SELECT 
  code, 
  name,
  flag_emoji,
  display_order,
  available_numbers,
  success_rate,
  active
FROM countries
ORDER BY display_order DESC, available_numbers DESC
LIMIT 30;

-- Afficher le nombre de pays mis à jour
SELECT 
  COUNT(*) FILTER (WHERE display_order > 0) as pays_prioritaires,
  COUNT(*) FILTER (WHERE display_order = 0) as autres_pays,
  COUNT(*) as total_pays
FROM countries;
