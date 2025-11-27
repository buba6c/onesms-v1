-- ============================================================================
-- CORRECTION INTELLIGENTE: TRI SERVICES SMS-ACTIVATE
-- ============================================================================
-- 
-- PROBLÈMES DÉTECTÉS:
-- 1. Services manquants: wa (WhatsApp), tg (Telegram) - codes SMS-Activate
-- 2. Duplicats: google/go, discord/ds, vkontakte/vk, amazon/am, netflix/nf
-- 3. Scores popularity_score incohérents
-- 4. Catégories mal assignées (2384 "other" vs 14 "popular")
--
-- SOLUTIONS:
-- 1. Créer les services manquants avec codes courts SMS-Activate
-- 2. Consolider les duplicats (garder code court, transférer stock)
-- 3. Assigner popularity_score selon ordre réel SMS-Activate
-- 4. Recatégoriser automatiquement (Top 50 = popular)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTIE 1: CRÉER SERVICES MANQUANTS (CODES SMS-ACTIVATE)
-- ============================================================================

-- WhatsApp (wa) - Service le plus populaire sur SMS-Activate
INSERT INTO services (
  code, name, display_name, category, icon, active, popularity_score, total_available
) VALUES (
  'wa', 'WhatsApp', 'WhatsApp', 'popular', '💬', true, 1000, 0
) ON CONFLICT (code) DO UPDATE SET
  popularity_score = 1000,
  category = 'popular',
  icon = '💬',
  active = true;

-- Telegram (tg) - Deuxième service le plus populaire
INSERT INTO services (
  code, name, display_name, category, icon, active, popularity_score, total_available
) VALUES (
  'tg', 'Telegram', 'Telegram', 'popular', '✈️', true, 990, 0
) ON CONFLICT (code) DO UPDATE SET
  popularity_score = 990,
  category = 'popular',
  icon = '✈️',
  active = true;

-- Viber (vi) - Troisième service populaire
-- Si viber existe avec code long, on le crée d'abord avec code court
INSERT INTO services (
  code, name, display_name, category, icon, active, popularity_score, total_available
) VALUES (
  'vi', 'Viber', 'Viber', 'popular', '📞', true, 980, 0
) ON CONFLICT (code) DO UPDATE SET
  popularity_score = 980,
  category = 'popular',
  icon = '📞',
  active = true;

-- ============================================================================
-- PARTIE 2: CONSOLIDATION DES DUPLICATS
-- ============================================================================

-- Fonction pour transférer le stock d'un service à un autre
CREATE OR REPLACE FUNCTION transfer_service_stock(
  source_code TEXT,
  target_code TEXT
) RETURNS void AS $$
BEGIN
  -- Vérifier si les deux services existent
  IF NOT EXISTS (SELECT 1 FROM services WHERE code = source_code) THEN
    RAISE NOTICE 'Service source % n''existe pas, skip', source_code;
    RETURN;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM services WHERE code = target_code) THEN
    RAISE NOTICE 'Service target % n''existe pas, skip', target_code;
    RETURN;
  END IF;
  
  -- Transférer le total_available
  UPDATE services
  SET total_available = COALESCE(total_available, 0) + (
    SELECT COALESCE(total_available, 0) 
    FROM services 
    WHERE code = source_code
  )
  WHERE code = target_code;
  
  -- Mettre à jour les foreign keys dans service_icons
  UPDATE service_icons
  SET service_code = target_code
  WHERE service_code = source_code;
  
  -- Mettre à jour les foreign keys dans pricing_rules
  UPDATE pricing_rules
  SET service_code = target_code
  WHERE service_code = source_code
  AND NOT EXISTS (
    SELECT 1 FROM pricing_rules 
    WHERE service_code = target_code 
    AND country_code = pricing_rules.country_code
  );
  
  -- Supprimer les pricing_rules en doublon
  DELETE FROM pricing_rules
  WHERE service_code = source_code;
  
  -- Désactiver le service source
  UPDATE services
  SET active = false
  WHERE code = source_code;
  
  RAISE NOTICE 'Stock transféré de % vers % avec foreign keys mis à jour', source_code, target_code;
END;
$$ LANGUAGE plpgsql;

-- Consolider les duplicats (version longue → version courte)
SELECT transfer_service_stock('google', 'go');
SELECT transfer_service_stock('discord', 'ds');
SELECT transfer_service_stock('vkontakte', 'vk');
SELECT transfer_service_stock('amazon', 'am');
SELECT transfer_service_stock('netflix', 'nf');
SELECT transfer_service_stock('uber', 'ub');
SELECT transfer_service_stock('paypal', 'ts');
SELECT transfer_service_stock('whatsapp', 'wa');
SELECT transfer_service_stock('telegram', 'tg');
SELECT transfer_service_stock('viber', 'vi');

-- ============================================================================
-- PARTIE 3: ASSIGNER POPULARITY_SCORE SELON ORDRE SMS-ACTIVATE
-- ============================================================================

-- Ordre exact SMS-Activate (basé sur l'API getNumbersStatus)
-- Les services apparaissent dans cet ordre sur leur plateforme

UPDATE services SET popularity_score = 1000 WHERE code = 'wa';  -- WhatsApp
UPDATE services SET popularity_score = 990  WHERE code = 'tg';  -- Telegram
UPDATE services SET popularity_score = 980  WHERE code = 'vi';  -- Viber
UPDATE services SET popularity_score = 970  WHERE code = 'ig';  -- Instagram
UPDATE services SET popularity_score = 960  WHERE code = 'fb';  -- Facebook
UPDATE services SET popularity_score = 950  WHERE code = 'go';  -- Google
UPDATE services SET popularity_score = 940  WHERE code = 'tw';  -- Twitter
UPDATE services SET popularity_score = 930  WHERE code = 'wb';  -- Weibo
UPDATE services SET popularity_score = 920  WHERE code = 'ds';  -- Discord
UPDATE services SET popularity_score = 910  WHERE code = 'vk';  -- VKontakte
UPDATE services SET popularity_score = 900  WHERE code = 'ok';  -- Odnoklassniki
UPDATE services SET popularity_score = 890  WHERE code = 'mm';  -- Microsoft
UPDATE services SET popularity_score = 880  WHERE code = 'am';  -- Amazon
UPDATE services SET popularity_score = 870  WHERE code = 'nf';  -- Netflix
UPDATE services SET popularity_score = 860  WHERE code = 'ub';  -- Uber
UPDATE services SET popularity_score = 850  WHERE code = 'ts';  -- PayPal

-- Autres services populaires (ordre SMS-Activate)
UPDATE services SET popularity_score = 840  WHERE code = 'apple';
UPDATE services SET popularity_score = 830  WHERE code = 'mb';  -- MB
UPDATE services SET popularity_score = 820  WHERE code = 'spotify';
UPDATE services SET popularity_score = 810  WHERE code = 'tiktok';
UPDATE services SET popularity_score = 800  WHERE code = 'li';  -- LinkedIn
UPDATE services SET popularity_score = 790  WHERE code = 'ya';  -- Yandex
UPDATE services SET popularity_score = 780  WHERE code = 'snapchat';
UPDATE services SET popularity_score = 770  WHERE code = 'reddit';
UPDATE services SET popularity_score = 760  WHERE code = 'pinterest';
UPDATE services SET popularity_score = 750  WHERE code = 'yahoo';
UPDATE services SET popularity_score = 740  WHERE code = 'microsoft365';
UPDATE services SET popularity_score = 730  WHERE code = 'coinbase';
UPDATE services SET popularity_score = 720  WHERE code = 'binance';
UPDATE services SET popularity_score = 710  WHERE code = 'uber';

-- Services de messagerie populaires
UPDATE services SET popularity_score = 700  WHERE code = 'signal';
UPDATE services SET popularity_score = 690  WHERE code = 'line';
UPDATE services SET popularity_score = 680  WHERE code = 'kakao';
UPDATE services SET popularity_score = 670  WHERE code = 'wechat';

-- Services de livraison populaires
UPDATE services SET popularity_score = 660  WHERE code = 'deliveroo';
UPDATE services SET popularity_score = 650  WHERE code = 'doordash';
UPDATE services SET popularity_score = 640  WHERE code = 'grubhub';
UPDATE services SET popularity_score = 630  WHERE code = 'postmates';

-- Services financiers populaires
UPDATE services SET popularity_score = 620  WHERE code = 'revolut';
UPDATE services SET popularity_score = 610  WHERE code = 'wise';
UPDATE services SET popularity_score = 600  WHERE code = 'cashapp';

-- ============================================================================
-- PARTIE 4: RECATÉGORISATION INTELLIGENTE
-- ============================================================================

-- Mettre à jour les catégories automatiquement
-- Top 50 = popular, autres selon le nom/type

-- 1. Marquer Top 50 comme "popular"
WITH ranked_services AS (
  SELECT code, ROW_NUMBER() OVER (ORDER BY popularity_score DESC, total_available DESC) as rank
  FROM services
  WHERE active = true
)
UPDATE services s
SET category = 'popular'
FROM ranked_services r
WHERE s.code = r.code AND r.rank <= 50;

-- 2. Catégoriser les autres automatiquement selon le nom
UPDATE services
SET category = 'social'
WHERE category != 'popular' 
  AND active = true
  AND (
    name ILIKE '%social%' OR
    name ILIKE '%twitter%' OR
    name ILIKE '%facebook%' OR
    name ILIKE '%instagram%' OR
    name ILIKE '%tiktok%' OR
    name ILIKE '%snapchat%' OR
    name ILIKE '%linkedin%' OR
    name ILIKE '%reddit%' OR
    name ILIKE '%pinterest%' OR
    code IN ('tw', 'fb', 'ig', 'li', 'tt', 'sc', 'rd', 'pn')
  );

UPDATE services
SET category = 'messaging'
WHERE category NOT IN ('popular', 'social')
  AND active = true
  AND (
    name ILIKE '%message%' OR
    name ILIKE '%chat%' OR
    name ILIKE '%whatsapp%' OR
    name ILIKE '%telegram%' OR
    name ILIKE '%viber%' OR
    name ILIKE '%signal%' OR
    name ILIKE '%wechat%' OR
    name ILIKE '%line%' OR
    code IN ('wa', 'tg', 'vi', 'sg', 'wc', 'ln')
  );

UPDATE services
SET category = 'email'
WHERE category NOT IN ('popular', 'social', 'messaging')
  AND active = true
  AND (
    name ILIKE '%mail%' OR
    name ILIKE '%gmail%' OR
    name ILIKE '%yahoo%' OR
    name ILIKE '%outlook%' OR
    code IN ('gm', 'ya', 'ot')
  );

UPDATE services
SET category = 'shopping'
WHERE category NOT IN ('popular', 'social', 'messaging', 'email')
  AND active = true
  AND (
    name ILIKE '%shop%' OR
    name ILIKE '%amazon%' OR
    name ILIKE '%ebay%' OR
    name ILIKE '%alibaba%' OR
    name ILIKE '%store%' OR
    code IN ('am', 'eb', 'al')
  );

UPDATE services
SET category = 'financial'
WHERE category NOT IN ('popular', 'social', 'messaging', 'email', 'shopping')
  AND active = true
  AND (
    name ILIKE '%bank%' OR
    name ILIKE '%pay%' OR
    name ILIKE '%wallet%' OR
    name ILIKE '%crypto%' OR
    name ILIKE '%coin%' OR
    name ILIKE '%finance%' OR
    name ILIKE '%revolut%' OR
    name ILIKE '%wise%' OR
    code IN ('ts', 'cb', 'bn', 'rv', 'ws')
  );

UPDATE services
SET category = 'delivery'
WHERE category NOT IN ('popular', 'social', 'messaging', 'email', 'shopping', 'financial')
  AND active = true
  AND (
    name ILIKE '%deliver%' OR
    name ILIKE '%food%' OR
    name ILIKE '%uber%' OR
    name ILIKE '%doordash%' OR
    name ILIKE '%grubhub%' OR
    code IN ('ub', 'dd', 'gh', 'pm')
  );

UPDATE services
SET category = 'entertainment'
WHERE category NOT IN ('popular', 'social', 'messaging', 'email', 'shopping', 'financial', 'delivery')
  AND active = true
  AND (
    name ILIKE '%music%' OR
    name ILIKE '%video%' OR
    name ILIKE '%stream%' OR
    name ILIKE '%netflix%' OR
    name ILIKE '%spotify%' OR
    name ILIKE '%youtube%' OR
    name ILIKE '%tiktok%' OR
    code IN ('nf', 'sp', 'yt', 'tt')
  );

UPDATE services
SET category = 'dating'
WHERE category NOT IN ('popular', 'social', 'messaging', 'email', 'shopping', 'financial', 'delivery', 'entertainment')
  AND active = true
  AND (
    name ILIKE '%dating%' OR
    name ILIKE '%tinder%' OR
    name ILIKE '%bumble%' OR
    name ILIKE '%match%' OR
    code IN ('oi', 'bu', 'ma')
  );

UPDATE services
SET category = 'tech'
WHERE category NOT IN ('popular', 'social', 'messaging', 'email', 'shopping', 'financial', 'delivery', 'entertainment', 'dating')
  AND active = true
  AND (
    name ILIKE '%microsoft%' OR
    name ILIKE '%google%' OR
    name ILIKE '%apple%' OR
    name ILIKE '%github%' OR
    code IN ('mm', 'go', 'ap', 'gh')
  );

-- Les autres restent dans "other"

-- ============================================================================
-- PARTIE 5: CRÉER INDEX POUR PERFORMANCE
-- ============================================================================

-- Index pour le tri par popularity_score (utilisé dans Dashboard)
CREATE INDEX IF NOT EXISTS idx_services_popularity_sort 
ON services(popularity_score DESC, total_available DESC) 
WHERE active = true;

-- Index pour le filtre par catégorie
CREATE INDEX IF NOT EXISTS idx_services_category_active 
ON services(category, active) 
WHERE active = true;

-- Index pour la recherche par nom
CREATE INDEX IF NOT EXISTS idx_services_name_search 
ON services USING gin(to_tsvector('english', name || ' ' || COALESCE(display_name, '')));

-- ============================================================================
-- PARTIE 6: NETTOYER LES SERVICES INACTIFS/DUPLICATS
-- ============================================================================

-- Marquer les duplicats comme inactifs (déjà fait par transfer_service_stock)
UPDATE services
SET active = false
WHERE code IN (
  'google', 'discord', 'vkontakte', 'amazon', 'netflix', 
  'uber', 'paypal', 'whatsapp', 'telegram', 'viber',
  'odnoklassniki', 'microsoft', 'linkedin', 'snapchat'
) AND active = true;

-- ============================================================================
-- PARTIE 7: VALIDATION ET STATISTIQUES
-- ============================================================================

DO $$
DECLARE
  total_services INT;
  active_services INT;
  popular_services INT;
  top_10 RECORD;
BEGIN
  SELECT COUNT(*) INTO total_services FROM services;
  SELECT COUNT(*) INTO active_services FROM services WHERE active = true;
  SELECT COUNT(*) INTO popular_services FROM services WHERE category = 'popular' AND active = true;
  
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ CORRECTION TERMINÉE';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTIQUES:';
  RAISE NOTICE '   Total services: %', total_services;
  RAISE NOTICE '   Services actifs: %', active_services;
  RAISE NOTICE '   Services populaires: %', popular_services;
  RAISE NOTICE '';
  RAISE NOTICE '🏆 TOP 10 SERVICES (ordre SMS-Activate):';
  
  FOR top_10 IN 
    SELECT code, name, popularity_score, total_available, category
    FROM services
    WHERE active = true
    ORDER BY popularity_score DESC, total_available DESC
    LIMIT 10
  LOOP
    RAISE NOTICE '   % - % (%) | Score: % | Stock: %', 
      top_10.code, 
      top_10.name, 
      top_10.category,
      top_10.popularity_score,
      top_10.total_available;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📂 RÉPARTITION PAR CATÉGORIE:';
  
  FOR top_10 IN 
    SELECT category, COUNT(*) as count
    FROM services
    WHERE active = true
    GROUP BY category
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '   % : % services', top_10.category, top_10.count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

COMMIT;

-- ============================================================================
-- REQUÊTES DE VÉRIFICATION (à exécuter après)
-- ============================================================================

-- Vérifier les services populaires
-- SELECT code, name, popularity_score, total_available, category
-- FROM services
-- WHERE active = true
-- ORDER BY popularity_score DESC, total_available DESC
-- LIMIT 50;

-- Vérifier les duplicats
-- SELECT code, name, active, total_available
-- FROM services
-- WHERE code IN ('wa', 'whatsapp', 'tg', 'telegram', 'go', 'google', 'ds', 'discord')
-- ORDER BY code;

-- Statistiques par catégorie
-- SELECT category, COUNT(*) as count, SUM(total_available) as total_stock
-- FROM services
-- WHERE active = true
-- GROUP BY category
-- ORDER BY count DESC;
