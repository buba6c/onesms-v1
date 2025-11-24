-- ================================================================
-- MISE À JOUR DE L'ORDRE DES SERVICES (COMME 5SIM.NET)
-- ================================================================
-- Exécuter ce script dans Supabase SQL Editor
-- Basé sur l'ordre visible sur https://5sim.net homepage

-- Étape 1: Réinitialiser tous les scores à 0
UPDATE services SET popularity_score = 0;

-- Étape 2: Définir l'ordre exact de 5sim (homepage)
-- Amazon en premier, puis Facebook, Telegram, etc.

UPDATE services SET popularity_score = 1000 WHERE code = 'amazon';
UPDATE services SET popularity_score = 950 WHERE code = 'facebook';
UPDATE services SET popularity_score = 900 WHERE code = 'telegram';
UPDATE services SET popularity_score = 850 WHERE code = 'whatsapp';
UPDATE services SET popularity_score = 800 WHERE code = 'google';
UPDATE services SET popularity_score = 750 WHERE code = 'microsoft';
UPDATE services SET popularity_score = 700 WHERE code = 'twitter';
UPDATE services SET popularity_score = 650 WHERE code = 'instagram';
UPDATE services SET popularity_score = 600 WHERE code = 'tiktok';
UPDATE services SET popularity_score = 550 WHERE code = 'uber';
UPDATE services SET popularity_score = 500 WHERE code = 'netflix';
UPDATE services SET popularity_score = 450 WHERE code = 'snapchat';
UPDATE services SET popularity_score = 400 WHERE code = 'linkedin';
UPDATE services SET popularity_score = 350 WHERE code = 'viber';
UPDATE services SET popularity_score = 300 WHERE code = 'wechat';
UPDATE services SET popularity_score = 250 WHERE code = 'discord';
UPDATE services SET popularity_score = 200 WHERE code = 'spotify';
UPDATE services SET popularity_score = 150 WHERE code = 'ebay';
UPDATE services SET popularity_score = 100 WHERE code = 'paypal';

-- Étape 3: Vérifier le résultat
SELECT 
  code, 
  COALESCE(display_name, name) as display_name,
  popularity_score,
  total_available,
  active
FROM services
ORDER BY popularity_score DESC, total_available DESC
LIMIT 30;

-- Afficher le nombre de services mis à jour
SELECT 
  COUNT(*) FILTER (WHERE popularity_score > 0) as services_prioritaires,
  COUNT(*) FILTER (WHERE popularity_score = 0) as autres_services,
  COUNT(*) as total_services
FROM services;
