-- Migration: Ajouter display_order aux services pour correspondre à l'ordre de 5sim
-- Basé sur l'ordre visible sur https://5sim.net (homepage)

-- Ordre des services sur 5sim.net (page d'accueil):
-- 1. Amazon
-- 2. Facebook  
-- 3. Telegram
-- 4. Whatsapp
-- 5. Google
-- 6. Microsoft
-- 7. Twitter
-- 8. Instagram
-- Puis autres services populaires

-- Mettre à jour les popularity_score basés sur l'ordre de 5sim
UPDATE services SET popularity_score = 1000 WHERE code = 'amazon';
UPDATE services SET popularity_score = 950 WHERE code = 'facebook';
UPDATE services SET popularity_score = 900 WHERE code = 'telegram';
UPDATE services SET popularity_score = 850 WHERE code = 'whatsapp';
UPDATE services SET popularity_score = 800 WHERE code = 'google';
UPDATE services SET popularity_score = 750 WHERE code = 'microsoft';
UPDATE services SET popularity_score = 700 WHERE code = 'twitter';
UPDATE services SET popularity_score = 650 WHERE code = 'instagram';

-- Autres services très populaires sur 5sim
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

-- Les autres services gardent leur popularity_score actuel ou 0 par défaut
UPDATE services 
SET popularity_score = COALESCE(popularity_score, 0)
WHERE code NOT IN (
  'amazon', 'facebook', 'telegram', 'whatsapp', 'google', 
  'microsoft', 'twitter', 'instagram', 'tiktok', 'uber',
  'netflix', 'snapchat', 'linkedin', 'viber', 'wechat',
  'discord', 'spotify', 'ebay', 'paypal'
);

-- Afficher le résultat
SELECT code, name, popularity_score, total_available, active
FROM services
ORDER BY popularity_score DESC, total_available DESC
LIMIT 30;
