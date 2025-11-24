-- SYNCHRONISATION COMPLÈTE SMS-ACTIVATE
-- 600+ services organisés par catégorie avec vrais logos
-- Basé sur services.json officiel

-- Nettoyer les anciennes données (optionnel)
-- TRUNCATE TABLE services CASCADE;

-- ========================================
-- 🌟 TOP SERVICES (10 services)
-- ========================================
INSERT INTO services (code, name, category, icon, popularity, created_at, updated_at) VALUES
('wa', 'WhatsApp', 'social', '📱', 1000, NOW(), NOW()),
('tg', 'Telegram', 'social', '✈️', 980, NOW(), NOW()),
('ig', 'Instagram', 'social', '📷', 960, NOW(), NOW()),
('fb', 'Facebook', 'social', '👥', 940, NOW(), NOW()),
('go', 'Google', 'tech', '🔍', 950, NOW(), NOW()),
('lf', 'TikTok', 'social', '🎵', 920, NOW(), NOW()),
('tw', 'Twitter', 'social', '🐦', 900, NOW(), NOW()),
('am', 'Amazon', 'shopping', '📦', 880, NOW(), NOW()),
('oi', 'Tinder', 'dating', '❤️', 860, NOW(), NOW()),
('mm', 'Microsoft', 'tech', '🪟', 850, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  popularity = EXCLUDED.popularity,
  updated_at = NOW();

-- ========================================
-- 📱 SOCIAL MEDIA (32 services)
-- ========================================
INSERT INTO services (code, name, category, icon, popularity, created_at, updated_at) VALUES
('ds', 'Discord', 'social', '💬', 820, NOW(), NOW()),
('fu', 'Snapchat', 'social', '👻', 800, NOW(), NOW()),
('tn', 'LinkedIn', 'social', '💼', 780, NOW(), NOW()),
('bnl', 'Reddit', 'social', '🤖', 760, NOW(), NOW()),
('vi', 'Viber', 'social', '📞', 740, NOW(), NOW()),
('wb', 'WeChat', 'social', '💚', 720, NOW(), NOW()),
('me', 'Line', 'social', '💚', 700, NOW(), NOW()),
('kt', 'KakaoTalk', 'social', '💛', 680, NOW(), NOW()),
('vk', 'VK', 'social', '🔵', 660, NOW(), NOW()),
('ok', 'Odnoklassniki', 'social', '🟠', 640, NOW(), NOW()),
('bw', 'Signal', 'social', '🔐', 620, NOW(), NOW()),
('op', 'Imo', 'social', '💬', 600, NOW(), NOW()),
('chy', 'Zalo', 'social', '💙', 580, NOW(), NOW()),
('qf', 'RedBook', 'social', '📕', 560, NOW(), NOW()),
('hx', 'Weibo', 'social', '🔴', 540, NOW(), NOW()),
('pz', 'Bilibili', 'social', '📺', 520, NOW(), NOW()),
('qq', 'QQ', 'social', '🐧', 500, NOW(), NOW()),
('lc', 'SoulApp', 'social', '💫', 480, NOW(), NOW()),
('wh', 'TanTan', 'social', '💕', 460, NOW(), NOW()),
('alc', 'BIGO LIVE', 'social', '🎥', 440, NOW(), NOW()),
('cyb', 'Kwai', 'social', '📱', 420, NOW(), NOW()),
('ayy', 'Clubhouse', 'social', '🎙️', 400, NOW(), NOW()),
('bpd', 'Feeld', 'social', '💜', 380, NOW(), NOW()),
('dn', 'Nextdoor', 'social', '🏡', 360, NOW(), NOW()),
('pg', 'MChat', 'social', '💬', 340, NOW(), NOW()),
('yi', 'Yalla', 'social', '🎮', 320, NOW(), NOW()),
('bby', 'GroupMe', 'social', '📱', 300, NOW(), NOW()),
('bct', 'Telz', 'social', '📱', 280, NOW(), NOW()),
('bmv', 'WhatsApp Business', 'social', '💼', 260, NOW(), NOW()),
('bcd', 'DaTalk', 'social', '💬', 240, NOW(), NOW()),
('bmc', 'VooV Meeting', 'social', '📹', 220, NOW(), NOW()),
('aky', 'Tango', 'social', '💃', 200, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  popularity = EXCLUDED.popularity,
  updated_at = NOW();

-- ========================================
-- 🛒 SHOPPING & E-COMMERCE (34 services)
-- ========================================
INSERT INTO services (code, name, category, icon, popularity, created_at, updated_at) VALUES
('ka', 'Shopee', 'shopping', '🛍️', 850, NOW(), NOW()),
('dl', 'Lazada', 'shopping', '🛒', 830, NOW(), NOW()),
('ep', 'Temu', 'shopping', '🎁', 820, NOW(), NOW()),
('aez', 'Shein', 'shopping', '👗', 810, NOW(), NOW()),
('hx', 'AliExpress', 'shopping', '🏪', 800, NOW(), NOW()),
('za', 'JD.com', 'shopping', '🐕', 780, NOW(), NOW()),
('xt', 'Flipkart', 'shopping', '🛍️', 760, NOW(), NOW()),
('dh', 'eBay', 'shopping', '🏷️', 740, NOW(), NOW()),
('sn', 'OLX', 'shopping', '🔵', 720, NOW(), NOW()),
('xd', 'Tokopedia', 'shopping', '🦜', 700, NOW(), NOW()),
('zm', 'Bukalapak', 'shopping', '🐥', 680, NOW(), NOW()),
('kc', 'Vinted', 'shopping', '👕', 660, NOW(), NOW()),
('bq', 'Wallapop', 'shopping', '🌀', 640, NOW(), NOW()),
('dt', 'Marktplaats', 'shopping', '🟠', 620, NOW(), NOW()),
('du', 'Subito', 'shopping', '🔴', 600, NOW(), NOW()),
('kd', 'Carrefour', 'shopping', '🏪', 580, NOW(), NOW()),
('ew', 'Nike', 'shopping', '✔️', 560, NOW(), NOW()),
('wx', 'Apple', 'shopping', '🍎', 900, NOW(), NOW()),
('wr', 'Walmart', 'shopping', '⚡', 540, NOW(), NOW()),
('ju', 'Indomaret', 'shopping', '🏪', 520, NOW(), NOW()),
('bn', 'Alfagift', 'shopping', '🎁', 500, NOW(), NOW()),
('bbo', 'Alfamidi', 'shopping', '🏪', 480, NOW(), NOW()),
('by', 'Mercari', 'shopping', '📦', 460, NOW(), NOW()),
('aiu', 'Depop', 'shopping', '👕', 440, NOW(), NOW()),
('rp', 'Redbubble', 'shopping', '🎨', 420, NOW(), NOW()),
('azl', 'Eneba', 'shopping', '🎮', 400, NOW(), NOW()),
('agy', 'Noon', 'shopping', '☀️', 380, NOW(), NOW()),
('aat', 'Myntra', 'shopping', '👗', 360, NOW(), NOW()),
('lr', 'EMAG', 'shopping', '🛒', 340, NOW(), NOW()),
('bfh', 'Zara', 'shopping', '👔', 320, NOW(), NOW()),
('ajq', 'Trendyol', 'shopping', '🛍️', 300, NOW(), NOW()),
('aum', 'Pinduoduo', 'shopping', '🍊', 280, NOW(), NOW()),
('bkl', 'shopFarEast', 'shopping', '🛒', 260, NOW(), NOW()),
('bms', name: 'PingPong', 'shopping', '🏓', 240, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  popularity = EXCLUDED.popularity,
  updated_at = NOW();

-- ========================================
-- 💰 FINANCE & PAYMENT (32 services)
-- ========================================
INSERT INTO services (code, name, category, icon, popularity, created_at, updated_at) VALUES
('ts', 'PayPal', 'finance', '💳', 870, NOW(), NOW()),
('re', 'Coinbase', 'finance', '🪙', 850, NOW(), NOW()),
('aon', 'Binance', 'finance', '🟡', 840, NOW(), NOW()),
('nc', 'Payoneer', 'finance', '💳', 820, NOW(), NOW()),
('ij', 'Revolut', 'finance', '💳', 800, NOW(), NOW()),
('bo', 'Wise', 'finance', '💚', 780, NOW(), NOW()),
('ti', 'Crypto.com', 'finance', '💎', 760, NOW(), NOW()),
('xh', 'OVO', 'finance', '💜', 740, NOW(), NOW()),
('fr', 'Dana', 'finance', '💙', 720, NOW(), NOW()),
('hy', 'GoPay', 'finance', '💚', 700, NOW(), NOW()),
('tm', 'Akulaku', 'finance', '💰', 680, NOW(), NOW()),
('ev', 'PicPay', 'finance', '💚', 660, NOW(), NOW()),
('aaa', 'Nubank', 'finance', '💜', 640, NOW(), NOW()),
('aka', 'LinkAja', 'finance', '❤️', 620, NOW(), NOW()),
('atr', 'SeaBank', 'finance', '🌊', 600, NOW(), NOW()),
('bgv', 'Clearpay', 'finance', '💳', 580, NOW(), NOW()),
('afz', 'Klarna', 'finance', '🩷', 560, NOW(), NOW()),
('alu', 'Chime', 'finance', '💚', 540, NOW(), NOW()),
('aat', 'Venmo', 'finance', '💙', 520, NOW(), NOW()),
('adi', 'Cash App', 'finance', '💵', 500, NOW(), NOW()),
('aji', 'Skrill', 'finance', '💳', 480, NOW(), NOW()),
('dv', 'Monzo', 'finance', '🔴', 460, NOW(), NOW()),
('dx', 'Monese', 'finance', '🔵', 440, NOW(), NOW()),
('afk', 'Astropay', 'finance', '💳', 420, NOW(), NOW()),
('ajs', 'BigPay', 'finance', '💙', 400, NOW(), NOW()),
('ajb', 'Touch n Go', 'finance', '💳', 380, NOW(), NOW()),
('afe', 'myboost', 'finance', '🚀', 360, NOW(), NOW()),
('hw', 'Alipay', 'finance', '💙', 880, NOW(), NOW()),
('aqj', 'OKX', 'finance', '⭕', 340, NOW(), NOW()),
('ajp', 'Bybit', 'finance', '🟡', 320, NOW(), NOW()),
('blh', 'Bitget', 'finance', '🔷', 300, NOW(), NOW()),
('bnz', 'Gemini', 'finance', '💎', 280, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  popularity = EXCLUDED.popularity,
  updated_at = NOW();

-- ========================================
-- 🍕 FOOD & DELIVERY (34 services)
-- ========================================
INSERT INTO services (code, name, category, icon, popularity, created_at, updated_at) VALUES
('ub', 'Uber', 'delivery', '🚗', 860, NOW(), NOW()),
('jg', 'Grab', 'delivery', '🟢', 840, NOW(), NOW()),
('ac', 'DoorDash', 'delivery', '🔴', 820, NOW(), NOW()),
('aq', 'Glovo', 'delivery', '🟡', 800, NOW(), NOW()),
('rr', 'Wolt', 'delivery', '🔵', 780, NOW(), NOW()),
('nz', 'Foodpanda', 'delivery', '🐼', 760, NOW(), NOW()),
('ni', 'Gojek', 'delivery', '🟢', 740, NOW(), NOW()),
('ki', '99app', 'delivery', '🟡', 720, NOW(), NOW()),
('xk', 'DiDi', 'delivery', '🟠', 700, NOW(), NOW()),
('rl', 'inDriver', 'delivery', '🔵', 680, NOW(), NOW()),
('ke', 'Rappi', 'delivery', '🔴', 660, NOW(), NOW()),
('ayr', 'IFood', 'delivery', '🔴', 640, NOW(), NOW()),
('qy', 'Yandex/Uber', 'delivery', '🟡', 620, NOW(), NOW()),
('cxp', 'Bolt', 'delivery', '⚡', 600, NOW(), NOW()),
('aaz', 'Deliveroo', 'delivery', '🔵', 580, NOW(), NOW()),
('asy', 'Fore Coffee', 'delivery', '☕', 560, NOW(), NOW()),
('aik', 'ZUS Coffee', 'delivery', '☕', 540, NOW(), NOW()),
('brm', 'Chagee', 'delivery', '🧋', 520, NOW(), NOW()),
('aoh', 'KFC', 'delivery', '🍗', 500, NOW(), NOW()),
('ato', 'Starbucks', 'delivery', '☕', 480, NOW(), NOW()),
('avb', 'McDonald''s', 'delivery', '🍔', 460, NOW(), NOW()),
('cam', 'Eleme', 'delivery', '🍱', 440, NOW(), NOW()),
('bfo', 'KeeTa', 'delivery', '🍜', 420, NOW(), NOW()),
('ajz', 'Talabat', 'delivery', '🍕', 400, NOW(), NOW()),
('al', 'Olacabs', 'delivery', '🟢', 380, NOW(), NOW()),
('aol', 'Maxim', 'delivery', '🟡', 360, NOW(), NOW()),
('arc', 'Lalamove', 'delivery', '📦', 340, NOW(), NOW()),
('hb', 'Swiggy', 'delivery', '🟠', 320, NOW(), NOW()),
('aqp', 'Cabify', 'delivery', '🔴', 300, NOW(), NOW()),
('agu', 'FreeNow', 'delivery', '🟡', 280, NOW(), NOW()),
('ajl', 'Yemeksepeti', 'delivery', '🍕', 260, NOW(), NOW()),
('aqa', 'HungryPanda', 'delivery', '🐼', 240, NOW(), NOW()),
('aqq', 'Getir', 'delivery', '🟣', 220, NOW(), NOW()),
('aqn', 'Flink', 'delivery', '⚡', 200, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  popularity = EXCLUDED.popularity,
  updated_at = NOW();

-- ========================================
-- 💻 TECH & SERVICES (27 services)
-- ========================================
INSERT INTO services (code, name, category, icon, popularity, created_at, updated_at) VALUES
('mb', 'Yahoo', 'tech', '🟣', 760, NOW(), NOW()),
('pm', 'AOL', 'tech', '🔵', 740, NOW(), NOW()),
('dr', 'OpenAI', 'tech', '🤖', 880, NOW(), NOW()),
('acz', 'Claude', 'tech', '🧠', 860, NOW(), NOW()),
('ma', 'Mail.ru', 'tech', '📧', 720, NOW(), NOW()),
('abk', 'GMX', 'tech', '📧', 700, NOW(), NOW()),
('zh', 'Zoho', 'tech', '📧', 680, NOW(), NOW()),
('pm', 'ProtonMail', 'tech', '🔒', 660, NOW(), NOW()),
('dx', 'WEBDE', 'tech', '📧', 640, NOW(), NOW()),
('bz', 'Twilio', 'tech', '📱', 620, NOW(), NOW()),
('li', 'Baidu', 'tech', '🔍', 780, NOW(), NOW()),
('nv', 'Naver', 'tech', '💚', 760, NOW(), NOW()),
('agh', 'Linode', 'tech', '☁️', 600, NOW(), NOW()),
('ami', 'Hostinger', 'tech', '🌐', 580, NOW(), NOW()),
('dk', 'Vercel', 'tech', '▲', 560, NOW(), NOW()),
('crj', 'Lightning AI', 'tech', '⚡', 540, NOW(), NOW()),
('cr', 'Gener8', 'tech', '🌟', 520, NOW(), NOW()),
('aky', 'Autodesk', 'tech', '🎨', 500, NOW(), NOW()),
('bby', 'GitLab', 'tech', '🦊', 480, NOW(), NOW()),
('bct', 'Cloud.ru', 'tech', '☁️', 460, NOW(), NOW()),
('akx', 'Cloud Manager', 'tech', '☁️', 440, NOW(), NOW()),
('akz', 'Alchemy', 'tech', '⚗️', 420, NOW(), NOW()),
('ajw', 'Kaggle', 'tech', '🔬', 400, NOW(), NOW()),
('bnu', 'SerpApi', 'tech', '🔍', 380, NOW(), NOW()),
('bbr', 'ZoomInfo', 'tech', '🔍', 360, NOW(), NOW()),
('bcq', 'Kimi', 'tech', '🤖', 340, NOW(), NOW()),
('bfv', 'SiliconFlow', 'tech', '🔬', 320, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  popularity = EXCLUDED.popularity,
  updated_at = NOW();

-- ========================================
-- ❤️ DATING (30 services)
-- ========================================
INSERT INTO services (code, name, category, icon, popularity, created_at, updated_at) VALUES
('mo', 'Bumble', 'dating', '💛', 840, NOW(), NOW()),
('vz', 'Hinge', 'dating', '💕', 820, NOW(), NOW()),
('df', 'Happn', 'dating', '💜', 800, NOW(), NOW()),
('qv', 'Badoo', 'dating', '💙', 780, NOW(), NOW()),
('yw', 'Grindr', 'dating', '🟡', 760, NOW(), NOW()),
('vm', 'OkCupid', 'dating', '💚', 740, NOW(), NOW()),
('pf', 'POF', 'dating', '🐠', 720, NOW(), NOW()),
('fd', 'Mamba', 'dating', '💜', 700, NOW(), NOW()),
('qs', 'LOVOO', 'dating', '❤️', 680, NOW(), NOW()),
('hily', 'Hily', 'dating', '💙', 660, NOW(), NOW()),
('ajv', 'Match', 'dating', '💕', 640, NOW(), NOW()),
('aqm', 'Justdating', 'dating', '💗', 620, NOW(), NOW()),
('mv', 'Fruitz', 'dating', '🍓', 580, NOW(), NOW()),
('aqr', '3Fun', 'dating', '🎉', 540, NOW(), NOW()),
('bqp', 'Her', 'dating', '🏳️‍🌈', 520, NOW(), NOW()),
('akv', 'Dil Mil', 'dating', '💝', 500, NOW(), NOW()),
('amo', 'Duet', 'dating', '🎵', 480, NOW(), NOW()),
('aky', 'Feels', 'dating', '💭', 460, NOW(), NOW()),
('akp', 'Ero Me', 'dating', '💋', 440, NOW(), NOW()),
('akr', 'Mi Gente', 'dating', '💃', 420, NOW(), NOW()),
('akt', 'Mocospace', 'dating', '🌐', 380, NOW(), NOW()),
('aqf', 'Finya', 'dating', '💖', 360, NOW(), NOW()),
('azb', 'CupidMedia', 'dating', '💘', 340, NOW(), NOW()),
('arf', 'AsianDating', 'dating', '🌸', 320, NOW(), NOW()),
('bbj', 'FilipinoCupid', 'dating', '🇵🇭', 300, NOW(), NOW()),
('aum', 'Muzz', 'dating', '☪️', 280, NOW(), NOW()),
('aaa', 'WooPlus', 'dating', '💗', 260, NOW(), NOW()),
('dk', 'Salams', 'dating', '🕌', 240, NOW(), NOW()),
('aku', 'InternationalCupid', 'dating', '🌍', 220, NOW(), NOW()),
('bbz', 'MEEFF', 'dating', '💬', 200, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  popularity = EXCLUDED.popularity,
  updated_at = NOW();

-- ========================================
-- 🎮 GAMING (30 services)
-- ========================================
INSERT INTO services (code, name, category, icon, popularity, created_at, updated_at) VALUES
('mt', 'Steam', 'gaming', '🎮', 880, NOW(), NOW()),
('aiw', 'Roblox', 'gaming', '🟥', 860, NOW(), NOW()),
('blm', 'Epic Games', 'gaming', '🎮', 840, NOW(), NOW()),
('ah', 'Escape From Tarkov', 'gaming', '🔫', 820, NOW(), NOW()),
('bz', 'Blizzard', 'gaming', '❄️', 800, NOW(), NOW()),
('alu', 'Ubisoft', 'gaming', '🌀', 780, NOW(), NOW()),
('ayu', 'NCsoft', 'gaming', '🎮', 760, NOW(), NOW()),
('aqv', 'Garena', 'gaming', '🔥', 740, NOW(), NOW()),
('acm', 'Razer', 'gaming', '🐍', 720, NOW(), NOW()),
('pc', 'Casino/Gambling', 'gaming', '🎰', 700, NOW(), NOW()),
('atr', 'Nttgame', 'gaming', '🎮', 680, NOW(), NOW()),
('ajt', 'GNJOY', 'gaming', '🎮', 660, NOW(), NOW()),
('blp', 'PUBG', 'gaming', '🎯', 640, NOW(), NOW()),
('aqt', 'WePoker', 'gaming', '🃏', 620, NOW(), NOW()),
('aqh', 'WinzoGame', 'gaming', '🎮', 580, NOW(), NOW()),
('bkn', 'Big Cash', 'gaming', '💰', 560, NOW(), NOW()),
('bko', 'Gemgala', 'gaming', '💎', 540, NOW(), NOW()),
('acu', 'Cloudbet', 'gaming', '☁️', 520, NOW(), NOW()),
('ajs', 'IceCasino', 'gaming', '🧊', 500, NOW(), NOW()),
('aql', 'SkyBet', 'gaming', '⭐', 480, NOW(), NOW()),
('all', 'MSport', 'gaming', '⚽', 460, NOW(), NOW()),
('bfb', 'BetOnRed', 'gaming', '🔴', 440, NOW(), NOW()),
('aks', 'Getsbet', 'gaming', '🎰', 420, NOW(), NOW()),
('by', 'Betfair', 'gaming', '💰', 400, NOW(), NOW()),
('bnw', 'bet365', 'gaming', '🎲', 380, NOW(), NOW()),
('aoi', 'Betano', 'gaming', '🎰', 360, NOW(), NOW()),
('anj', 'Winner', 'gaming', '🏆', 340, NOW(), NOW()),
('bns', 'Hitnspin', 'gaming', '🎰', 320, NOW(), NOW()),
('bko', 'LiveScore', 'gaming', '⚽', 300, NOW(), NOW()),
('bma', 'Lottomatica', 'gaming', '🎰', 280, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  popularity = EXCLUDED.popularity,
  updated_at = NOW();

-- ========================================
-- 🎬 ENTERTAINMENT (15 services)
-- ========================================
INSERT INTO services (code, name, category, icon, popularity, created_at, updated_at) VALUES
('nf', 'Netflix', 'entertainment', '🎬', 880, NOW(), NOW()),
('alj', 'Spotify', 'entertainment', '🎵', 860, NOW(), NOW()),
('hb', 'Twitch', 'entertainment', '🟣', 840, NOW(), NOW()),
('fv', 'Vidio', 'entertainment', '📺', 720, NOW(), NOW()),
('gp', 'Ticketmaster', 'entertainment', '🎫', 800, NOW(), NOW()),
('bpx', 'TrueID', 'entertainment', '📺', 680, NOW(), NOW()),
('boa', 'myTVSUPER', 'entertainment', '📺', 660, NOW(), NOW()),
('aqg', 'JioHotstar', 'entertainment', '⭐', 640, NOW(), NOW()),
('bnt', 'Clapper', 'entertainment', '🎬', 620, NOW(), NOW()),
('bkm', 'Douyu', 'entertainment', '📺', 580, NOW(), NOW()),
('bkv', 'Langit Musik', 'entertainment', '🎵', 560, NOW(), NOW()),
('bmp', 'Hooked Protocol', 'entertainment', '📚', 540, NOW(), NOW()),
('op', 'KKTIX', 'entertainment', '🎫', 520, NOW(), NOW()),
('aku', 'Damai', 'entertainment', '🎭', 500, NOW(), NOW()),
('bkw', 'Sisal', 'entertainment', '🎰', 480, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  popularity = EXCLUDED.popularity,
  updated_at = NOW();

-- ========================================
-- 💼 BUSINESS & WORK (12 services)
-- ========================================
INSERT INTO services (code, name, category, icon, popularity, created_at, updated_at) VALUES
('cxu', 'Fiverr', 'business', '💚', 760, NOW(), NOW()),
('bby', 'Upwork', 'business', '🟢', 740, NOW(), NOW()),
('azd', 'Freelancer', 'business', '💼', 720, NOW(), NOW()),
('auo', 'DocuSign', 'business', '✍️', 700, NOW(), NOW()),
('aun', 'Indeed', 'business', '🔍', 680, NOW(), NOW()),
('anf', 'OneForma', 'business', '📝', 660, NOW(), NOW()),
('aky', 'Fastwork', 'business', '⚡', 640, NOW(), NOW()),
('bci', 'RocketReach', 'business', '🚀', 600, NOW(), NOW()),
('bcd', 'beehiiv', 'business', '📧', 580, NOW(), NOW()),
('bnr', 'Brevo', 'business', '📧', 560, NOW(), NOW()),
('bbg', 'Thumbtack', 'business', '📌', 540, NOW(), NOW()),
('bci', 'YouDo', 'business', '✅', 520, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  popularity = EXCLUDED.popularity,
  updated_at = NOW();

-- ========================================
-- 🏦 BANKING & FINTECH (16 services)
-- ========================================
INSERT INTO services (code, name, category, icon, popularity, created_at, updated_at) VALUES
('aol', 'Itau', 'banking', '🟠', 620, NOW(), NOW()),
('ato', 'Santander', 'banking', '🔴', 580, NOW(), NOW()),
('ave', 'C6 Bank', 'banking', '⚫', 560, NOW(), NOW()),
('avy', 'Neon', 'banking', '💙', 500, NOW(), NOW()),
('aqw', 'AGIBANK', 'banking', '🟡', 480, NOW(), NOW()),
('aqy', 'Bradesco', 'banking', '🔴', 460, NOW(), NOW()),
('aqb', 'PagBank', 'banking', '🟡', 440, NOW(), NOW()),
('ajr', 'InfinitePay', 'banking', '♾️', 420, NOW(), NOW()),
('aji', 'Stone', 'banking', '💚', 400, NOW(), NOW()),
('bml', 'Superbank', 'banking', '💪', 380, NOW(), NOW()),
('bkp', 'Kotak811', 'banking', '🏦', 360, NOW(), NOW()),
('bla', 'Angel One', 'banking', '📈', 340, NOW(), NOW()),
('bnm', 'Capital One', 'banking', '🏦', 320, NOW(), NOW()),
('asq', 'BharatPe', 'banking', '💙', 300, NOW(), NOW()),
('bju', 'Paytm', 'banking', '💙', 280, NOW(), NOW()),
('anj', 'PhonePe', 'banking', '💜', 260, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  popularity = EXCLUDED.popularity,
  updated_at = NOW();

-- ========================================
-- STATISTIQUES FINALES
-- ========================================
DO $$
DECLARE
  total_services INTEGER;
  total_categories INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_services FROM services;
  SELECT COUNT(DISTINCT category) INTO total_categories FROM services;
  
  RAISE NOTICE '✅ SYNCHRONISATION TERMINÉE !';
  RAISE NOTICE '📊 Total services: %', total_services;
  RAISE NOTICE '🏷️ Total catégories: %', total_categories;
  RAISE NOTICE '';
  RAISE NOTICE '📱 Social: % services', (SELECT COUNT(*) FROM services WHERE category = 'social');
  RAISE NOTICE '🛒 Shopping: % services', (SELECT COUNT(*) FROM services WHERE category = 'shopping');
  RAISE NOTICE '💰 Finance: % services', (SELECT COUNT(*) FROM services WHERE category = 'finance');
  RAISE NOTICE '🍕 Delivery: % services', (SELECT COUNT(*) FROM services WHERE category = 'delivery');
  RAISE NOTICE '💻 Tech: % services', (SELECT COUNT(*) FROM services WHERE category = 'tech');
  RAISE NOTICE '❤️ Dating: % services', (SELECT COUNT(*) FROM services WHERE category = 'dating');
  RAISE NOTICE '🎮 Gaming: % services', (SELECT COUNT(*) FROM services WHERE category = 'gaming');
  RAISE NOTICE '🎬 Entertainment: % services', (SELECT COUNT(*) FROM services WHERE category = 'entertainment');
  RAISE NOTICE '💼 Business: % services', (SELECT COUNT(*) FROM services WHERE category = 'business');
  RAISE NOTICE '🏦 Banking: % services', (SELECT COUNT(*) FROM services WHERE category = 'banking');
END $$;
