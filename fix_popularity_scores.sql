-- Fix popularity_score for popular services
-- Execute this in Supabase SQL Editor

-- Top tier services (1000-900)
UPDATE services SET popularity_score = 1000 WHERE code IN ('wa') OR name ILIKE '%whatsapp%';
UPDATE services SET popularity_score = 990 WHERE code IN ('tg') OR name ILIKE '%telegram%';
UPDATE services SET popularity_score = 980 WHERE code IN ('ig') OR name ILIKE '%instagram%';
UPDATE services SET popularity_score = 970 WHERE code IN ('fb') OR name ILIKE '%facebook%';
UPDATE services SET popularity_score = 960 WHERE code IN ('go') OR name ILIKE '%google%';
UPDATE services SET popularity_score = 950 WHERE code IN ('tw') OR name ILIKE '%twitter%';
UPDATE services SET popularity_score = 940 WHERE code IN ('ds') OR name ILIKE '%discord%';
UPDATE services SET popularity_score = 930 WHERE code IN ('mm') OR name ILIKE '%microsoft%';
UPDATE services SET popularity_score = 920 WHERE code IN ('am') OR name ILIKE '%amazon%';
UPDATE services SET popularity_score = 910 WHERE code IN ('nf') OR name ILIKE '%netflix%';
UPDATE services SET popularity_score = 900 WHERE name ILIKE '%spotify%';

-- Second tier services (890-800)
UPDATE services SET popularity_score = 890 WHERE code IN ('lf') OR name ILIKE '%tiktok%';
UPDATE services SET popularity_score = 880 WHERE name ILIKE '%snapchat%';
UPDATE services SET popularity_score = 870 WHERE name ILIKE '%linkedin%';
UPDATE services SET popularity_score = 860 WHERE code IN ('ub') OR name ILIKE '%uber%';
UPDATE services SET popularity_score = 850 WHERE code IN ('ts') OR name ILIKE '%paypal%';
UPDATE services SET popularity_score = 840 WHERE name ILIKE '%apple%';
UPDATE services SET popularity_score = 830 WHERE code IN ('mb') OR name ILIKE '%yahoo%';
UPDATE services SET popularity_score = 820 WHERE name ILIKE '%skype%';
UPDATE services SET popularity_score = 810 WHERE code IN ('vi') OR name ILIKE '%viber%';
UPDATE services SET popularity_score = 800 WHERE name ILIKE '%wechat%';

-- Third tier services (790-700)
UPDATE services SET popularity_score = 790 WHERE name ILIKE '%line%';
UPDATE services SET popularity_score = 780 WHERE name ILIKE '%steam%';
UPDATE services SET popularity_score = 770 WHERE name ILIKE '%airbnb%';
UPDATE services SET popularity_score = 760 WHERE name ILIKE '%tinder%';
UPDATE services SET popularity_score = 750 WHERE name ILIKE '%ebay%';
UPDATE services SET popularity_score = 740 WHERE name ILIKE '%alibaba%';
UPDATE services SET popularity_score = 730 WHERE name ILIKE '%nike%';
UPDATE services SET popularity_score = 720 WHERE name ILIKE '%booking%';
UPDATE services SET popularity_score = 710 WHERE name ILIKE '%bolt%';
UPDATE services SET popularity_score = 700 WHERE name ILIKE '%grab%';

-- Verify the changes
SELECT code, name, popularity_score, total_available 
FROM services 
WHERE popularity_score >= 700 
ORDER BY popularity_score DESC, total_available DESC
LIMIT 30;
