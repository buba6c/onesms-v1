-- ========================================
-- FIX: Restaurer icônes Tinder & Badoo
-- ========================================

-- 1️⃣ Restaurer l'icône Tinder (❤️ ou 🔥)
UPDATE services
SET icon = '❤️'
WHERE code = 'oi';

-- 2️⃣ Restaurer l'icône Badoo (💙 ou 💕)
UPDATE services
SET icon = '💙'
WHERE code = 'qv';

-- 3️⃣ Mettre à jour service_icons pour Badoo (si manquant)
INSERT INTO service_icons (service_code, icon_url, created_at)
VALUES ('qv', '/badoo.svg', NOW())
ON CONFLICT (service_code) DO UPDATE
SET icon_url = '/badoo.svg',
    updated_at = NOW();

-- 4️⃣ Vérifier
SELECT code, name, icon, active FROM services WHERE code IN ('oi', 'qv');
SELECT service_code, icon_url FROM service_icons WHERE service_code IN ('oi', 'qv');
