-- SYNCHRONISATION INTELLIGENTE SMS-ACTIVATE
-- Utilise les données statiques pour pré-remplir la base
-- Ultra-rapide car pas besoin d'appeler l'API

-- 0. AJOUTER LES COLONNES MANQUANTES (si elles n'existent pas déjà)
ALTER TABLE countries ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE services ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;

-- 1. INSERTION DES PAYS TOP (9 pays les plus populaires)
INSERT INTO countries (code, name, flag_emoji, active, provider, popularity_score, display_order, available_numbers) VALUES
('usa', 'USA', '🇺🇸', true, 'sms-activate', 1000, 1000, 0),
('philippines', 'Philippines', '🇵🇭', true, 'sms-activate', 900, 900, 0),
('indonesia', 'Indonesia', '🇮🇩', true, 'sms-activate', 800, 800, 0),
('india', 'India', '🇮🇳', true, 'sms-activate', 700, 700, 0),
('england', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', true, 'sms-activate', 600, 600, 0),
('russia', 'Russia', '🇷🇺', true, 'sms-activate', 500, 500, 0),
('canada', 'Canada', '🇨🇦', true, 'sms-activate', 400, 400, 0),
('france', 'France', '🇫🇷', true, 'sms-activate', 300, 300, 0),
('germany', 'Germany', '🇩🇪', true, 'sms-activate', 200, 200, 0)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  provider = 'sms-activate',
  popularity_score = EXCLUDED.popularity_score,
  display_order = EXCLUDED.display_order;

-- 2. INSERTION DES SERVICES POPULAIRES (Par catégorie)
-- Social Media
INSERT INTO services (code, name, icon, category, provider, popularity_score) VALUES
('wa', 'WhatsApp', '/whatsapp.svg', 'social', 'sms-activate', 1000),
('tg', 'Telegram', '/telegram.svg', 'social', 'sms-activate', 950),
('ig', 'Instagram', '/instagram.svg', 'social', 'sms-activate', 900),
('fb', 'Facebook', '/facebook.svg', 'social', 'sms-activate', 850),
('tw', 'Twitter', '/twitter.svg', 'social', 'sms-activate', 800),
('ds', 'Discord', '/discord.svg', 'social', 'sms-activate', 750),
('lf', 'TikTok', '/tiktok.svg', 'social', 'sms-activate', 900),
('fu', 'Snapchat', '/snapchat.svg', 'social', 'sms-activate', 700),
('tn', 'LinkedIn', '/linkedin.svg', 'social', 'sms-activate', 650),
('bnl', 'Reddit', '/reddit.svg', 'social', 'sms-activate', 600)
ON CONFLICT (code) DO UPDATE SET
  provider = 'sms-activate',
  popularity_score = EXCLUDED.popularity_score;

-- Shopping
INSERT INTO services (code, name, icon, category, provider, popularity_score) VALUES
('am', 'Amazon', '/amazon.svg', 'shopping', 'sms-activate', 800),
('ka', 'Shopee', '/shopee.svg', 'shopping', 'sms-activate', 700),
('ep', 'Temu', '/temu.svg', 'shopping', 'sms-activate', 750),
('hx', 'AliExpress', '/aliexpress.svg', 'shopping', 'sms-activate', 750),
('aez', 'Shein', '/shein.svg', 'shopping', 'sms-activate', 700)
ON CONFLICT (code) DO UPDATE SET
  provider = 'sms-activate',
  popularity_score = EXCLUDED.popularity_score;

-- Finance
INSERT INTO services (code, name, icon, category, provider, popularity_score) VALUES
('ts', 'PayPal', '/paypal.svg', 'finance', 'sms-activate', 850),
('aon', 'Binance', '/binance.svg', 'finance', 'sms-activate', 800),
('re', 'Coinbase', '/coinbase.svg', 'finance', 'sms-activate', 750),
('nc', 'Payoneer', '/payoneer.svg', 'finance', 'sms-activate', 700),
('ij', 'Revolut', '/revolut.svg', 'finance', 'sms-activate', 700)
ON CONFLICT (code) DO UPDATE SET
  provider = 'sms-activate',
  popularity_score = EXCLUDED.popularity_score;

-- Tech
INSERT INTO services (code, name, icon, category, provider, popularity_score) VALUES
('go', 'Google', '/google.svg', 'tech', 'sms-activate', 950),
('wx', 'Apple', '/apple.svg', 'tech', 'sms-activate', 900),
('mm', 'Microsoft', '/microsoft.svg', 'tech', 'sms-activate', 850),
('dr', 'OpenAI', '/openai.svg', 'tech', 'sms-activate', 850),
('mb', 'Yahoo', '/yahoo.svg', 'tech', 'sms-activate', 700)
ON CONFLICT (code) DO UPDATE SET
  provider = 'sms-activate',
  popularity_score = EXCLUDED.popularity_score;

-- Delivery
INSERT INTO services (code, name, icon, category, provider, popularity_score) VALUES
('ub', 'Uber', '/uber.svg', 'delivery', 'sms-activate', 800),
('jg', 'Grab', '/grab.svg', 'delivery', 'sms-activate', 750),
('ac', 'DoorDash', '/doordash.svg', 'delivery', 'sms-activate', 700)
ON CONFLICT (code) DO UPDATE SET
  provider = 'sms-activate',
  popularity_score = EXCLUDED.popularity_score;

-- Dating
INSERT INTO services (code, name, icon, category, provider, popularity_score) VALUES
('oi', 'Tinder', '/tinder.svg', 'dating', 'sms-activate', 850),
('mo', 'Bumble', '/bumble.svg', 'dating', 'sms-activate', 750),
('qv', 'Badoo', '/badoo.svg', 'dating', 'sms-activate', 700),
('vz', 'Hinge', '/hinge.svg', 'dating', 'sms-activate', 700)
ON CONFLICT (code) DO UPDATE SET
  provider = 'sms-activate',
  popularity_score = EXCLUDED.popularity_score;

-- Gaming
INSERT INTO services (code, name, icon, category, provider, popularity_score) VALUES
('mt', 'Steam', '/steam.svg', 'gaming', 'sms-activate', 850),
('aiw', 'Roblox', '/roblox.svg', 'gaming', 'sms-activate', 800),
('blm', 'Epic Games', '/epicgames.svg', 'gaming', 'sms-activate', 750),
('bz', 'Blizzard', '/blizzard.svg', 'gaming', 'sms-activate', 700)
ON CONFLICT (code) DO UPDATE SET
  provider = 'sms-activate',
  popularity_score = EXCLUDED.popularity_score;

-- Entertainment
INSERT INTO services (code, name, icon, category, provider, popularity_score) VALUES
('nf', 'Netflix', '/netflix.svg', 'entertainment', 'sms-activate', 850),
('alj', 'Spotify', '/spotify.svg', 'entertainment', 'sms-activate', 800),
('hb', 'Twitch', '/twitch.svg', 'entertainment', 'sms-activate', 750)
ON CONFLICT (code) DO UPDATE SET
  provider = 'sms-activate',
  popularity_score = EXCLUDED.popularity_score;

-- 3. CRÉER DES INDEX POUR LA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_popularity ON services(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_countries_popularity ON countries(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_countries_display_order ON countries(display_order DESC);

-- 4. STATISTIQUES FINALES
SELECT 
  'Services synchronisés' as type,
  COUNT(*) as total,
  COUNT(DISTINCT category) as categories
FROM services 
WHERE provider = 'sms-activate';

SELECT 
  'Pays synchronisés' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE popularity_score > 0) as popular
FROM countries 
WHERE provider = 'sms-activate';
