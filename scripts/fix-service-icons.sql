-- Fix Service Icons - Corriger tous les emojis et chemins invalides
-- Ce script met à jour la colonne `icon` de la table `services`
-- avec les bons emojis basés sur les codes SMS-Activate

-- ═══════════════════════════════════════════════════════════════════
-- PARTIE 1: CORRIGER LES CHEMINS INVALIDES (/, /twitter.svg, etc.)
-- ═══════════════════════════════════════════════════════════════════

UPDATE services SET icon = '🐦' WHERE code = 'tw' AND icon LIKE '/%';    -- Twitter
UPDATE services SET icon = '🚗' WHERE code = 'ub' AND icon LIKE '/%';    -- Uber  
UPDATE services SET icon = '💳' WHERE code = 'ts' AND icon LIKE '/%';    -- PayPal
UPDATE services SET icon = '📱' WHERE icon LIKE '/%';                     -- Autres chemins invalides

-- ═══════════════════════════════════════════════════════════════════
-- PARTIE 2: SERVICES POPULAIRES (codes courts validés)
-- ═══════════════════════════════════════════════════════════════════

-- Social Networks
UPDATE services SET icon = '📸' WHERE code = 'ig';    -- Instagram
UPDATE services SET icon = '👥' WHERE code = 'fb';    -- Facebook
UPDATE services SET icon = '🐦' WHERE code = 'tw';    -- Twitter/X
UPDATE services SET icon = '🎥' WHERE code = 'lf';    -- TikTok
UPDATE services SET icon = '👻' WHERE code = 'sn';    -- Snapchat
UPDATE services SET icon = '💼' WHERE code = 'li';    -- LinkedIn
UPDATE services SET icon = '🔵' WHERE code = 'vk';    -- VKontakte
UPDATE services SET icon = '👌' WHERE code = 'ok';    -- Odnoklassniki

-- Messengers
UPDATE services SET icon = '💬' WHERE code = 'wa';    -- WhatsApp
UPDATE services SET icon = '✈️' WHERE code = 'tg';    -- Telegram
UPDATE services SET icon = '💜' WHERE code = 'vi';    -- Viber
UPDATE services SET icon = '💬' WHERE code = 'ds';    -- Discord
UPDATE services SET icon = '💬' WHERE code = 'wb';    -- WeChat
UPDATE services SET icon = '📝' WHERE code = 'me';    -- LINE

-- Tech/Email
UPDATE services SET icon = '🔍' WHERE code = 'go';    -- Google
UPDATE services SET icon = '🪟' WHERE code = 'mm';    -- Microsoft
UPDATE services SET icon = '🍎' WHERE code = 'wx';    -- Apple
UPDATE services SET icon = '📧' WHERE code = 'mb';    -- Yahoo
UPDATE services SET icon = '🟡' WHERE code = 'ya';    -- Yandex
UPDATE services SET icon = '✉️' WHERE code = 'ml';    -- Mail.ru

-- Shopping/E-commerce
UPDATE services SET icon = '📦' WHERE code = 'am';    -- Amazon
UPDATE services SET icon = '🛍️' WHERE code = 'dh';    -- eBay
UPDATE services SET icon = '🛒' WHERE code = 'ka';    -- Shopee
UPDATE services SET icon = '🛒' WHERE code = 'dl';    -- Lazada
UPDATE services SET icon = '🏬' WHERE code = 'wr';    -- Walmart
UPDATE services SET icon = '💰' WHERE code = 'hw';    -- Alipay/Alibaba

-- Streaming/Entertainment
UPDATE services SET icon = '🎬' WHERE code = 'nf';    -- Netflix
UPDATE services SET icon = '🎵' WHERE code = 'sp';    -- Spotify
UPDATE services SET icon = '▶️' WHERE code = 'yt';    -- YouTube
UPDATE services SET icon = '🎮' WHERE code = 'st';    -- Steam
UPDATE services SET icon = '🎮' WHERE code = 'tw';    -- Twitch

-- Dating Apps
UPDATE services SET icon = '🔥' WHERE code = 'oi';    -- Tinder
UPDATE services SET icon = '💛' WHERE code = 'mo';    -- Bumble
UPDATE services SET icon = '💙' WHERE code = 'qv';    -- Badoo
UPDATE services SET icon = '💕' WHERE code = 'vz';    -- Hinge
UPDATE services SET icon = '💕' WHERE code = 'bd';    -- Badoo (autre code)

-- Transport/Delivery
UPDATE services SET icon = '🚗' WHERE code = 'ub';    -- Uber
UPDATE services SET icon = '🚗' WHERE code = 'jg';    -- Grab
UPDATE services SET icon = '🏍️' WHERE code = 'ni';    -- Gojek
UPDATE services SET icon = '🚕' WHERE code = 'bl';    -- Bolt
UPDATE services SET icon = '🚲' WHERE code = 'lm';    -- Lime

-- Finance/Crypto
UPDATE services SET icon = '💳' WHERE code = 'ts';    -- PayPal
UPDATE services SET icon = '💵' WHERE code = 've';    -- Venmo
UPDATE services SET icon = '🪙' WHERE code = 'bn';    -- Binance
UPDATE services SET icon = '🪙' WHERE code = 'cb';    -- Coinbase
UPDATE services SET icon = '💰' WHERE code = 'rv';    -- Revolut
UPDATE services SET icon = '💳' WHERE code = 'sk';    -- Skrill
UPDATE services SET icon = '💳' WHERE code = 'nm';    -- Neteller

-- Gaming
UPDATE services SET icon = '🎮' WHERE code = 'st';    -- Steam
UPDATE services SET icon = '🎮' WHERE code = 'ep';    -- Epic Games
UPDATE services SET icon = '🕹️' WHERE code = 'rb';    -- Roblox
UPDATE services SET icon = '🎮' WHERE code = 'ps';    -- PlayStation
UPDATE services SET icon = '🎮' WHERE code = 'xb';    -- Xbox

-- Food Delivery
UPDATE services SET icon = '🍔' WHERE code = 'ue';    -- UberEats
UPDATE services SET icon = '🍕' WHERE code = 'dd';    -- DoorDash
UPDATE services SET icon = '🍔' WHERE code = 'gr';    -- GrubHub
UPDATE services SET icon = '🍔' WHERE code = 'de';    -- Deliveroo

-- Business/Productivity
UPDATE services SET icon = '💼' WHERE code = 'sl';    -- Slack
UPDATE services SET icon = '📝' WHERE code = 'nt';    -- Notion
UPDATE services SET icon = '🎨' WHERE code = 'fg';    -- Figma
UPDATE services SET icon = '📊' WHERE code = 'tr';    -- Trello
UPDATE services SET icon = '💬' WHERE code = 'dc';    -- Discord
UPDATE services SET icon = '📹' WHERE code = 'zm';    -- Zoom
UPDATE services SET icon = '📹' WHERE code = 'mt';    -- Microsoft Teams

-- Travel
UPDATE services SET icon = '✈️' WHERE code = 'ab';    -- Airbnb
UPDATE services SET icon = '🏨' WHERE code = 'bk';    -- Booking.com
UPDATE services SET icon = '✈️' WHERE code = 'ex';    -- Expedia
UPDATE services SET icon = '🚂' WHERE code = 'tr';    -- Trainline

-- Special Services
UPDATE services SET icon = '🏠' WHERE code = 'full';  -- Full rent
UPDATE services SET icon = '📱' WHERE code = 'ot';    -- Other

-- ═══════════════════════════════════════════════════════════════════
-- PARTIE 3: VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════════

-- Compter les services avec emojis corrects
SELECT 
  COUNT(*) as total_services,
  COUNT(CASE WHEN icon NOT LIKE '/%' AND icon IS NOT NULL THEN 1 END) as valid_icons,
  COUNT(CASE WHEN icon LIKE '/%' THEN 1 END) as invalid_paths,
  COUNT(CASE WHEN icon IS NULL THEN 1 END) as null_icons,
  COUNT(CASE WHEN icon = '📱' THEN 1 END) as default_emoji
FROM services 
WHERE active = true;

-- Afficher les services avec chemins invalides restants
SELECT code, name, icon 
FROM services 
WHERE active = true 
  AND icon LIKE '/%'
ORDER BY code
LIMIT 20;

-- Afficher les TOP 30 services avec leurs nouveaux emojis
SELECT 
  code, 
  name, 
  icon,
  category,
  total_available
FROM services 
WHERE active = true 
ORDER BY popularity_score DESC 
LIMIT 30;

-- ═══════════════════════════════════════════════════════════════════
-- PARTIE 4: METTRE À JOUR TOUS LES SERVICES SANS EMOJI SPÉCIFIQUE
-- ═══════════════════════════════════════════════════════════════════

-- Assigner emojis par catégorie pour les services restants
UPDATE services 
SET icon = CASE 
  WHEN category = 'social' THEN '👥'
  WHEN category = 'messaging' THEN '💬'
  WHEN category = 'tech' THEN '💻'
  WHEN category = 'shopping' THEN '🛒'
  WHEN category = 'entertainment' THEN '🎬'
  WHEN category = 'dating' THEN '💕'
  WHEN category = 'delivery' THEN '🚚'
  WHEN category = 'finance' THEN '💰'
  ELSE '📱'
END
WHERE icon IS NULL OR icon = '📱' OR icon LIKE '/%';

-- ═══════════════════════════════════════════════════════════════════
-- NOTES D'UTILISATION
-- ═══════════════════════════════════════════════════════════════════

-- 1. Exécuter ce script dans Supabase SQL Editor
-- 2. Vérifier les résultats avec les requêtes SELECT
-- 3. Si OK, refresh le dashboard pour voir les nouveaux emojis
-- 4. Les logos Logo.dev continueront de fonctionner (prioritaires)
-- 5. Les emojis sont utilisés uniquement en fallback

-- ═══════════════════════════════════════════════════════════════════
-- RÉSULTAT ATTENDU
-- ═══════════════════════════════════════════════════════════════════

-- ✅ 0 chemins invalides (/, /twitter.svg, etc.)
-- ✅ 100+ services avec emojis spécifiques
-- ✅ Tous les autres services ont un emoji de catégorie
-- ✅ Fallback intelligent dans l'interface
-- ✅ Logos Logo.dev prioritaires (meilleure qualité)
