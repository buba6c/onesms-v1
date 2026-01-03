-- AJOUTER GRIZZLY POUR LES SERVICES POPULAIRES
-- Le smart mode filtre par service_code, donc on doit ajouter Grizzly pour chaque service

-- Services populaires à ajouter
INSERT INTO public.provider_performance (provider, service_code, attempts, successes)
VALUES 
    ('grizzly', 'wa', 10, 9),        -- WhatsApp (90%)
    ('grizzly', 'tg', 10, 9),        -- Telegram
    ('grizzly', 'ig', 10, 8),        -- Instagram (80%)
    ('grizzly', 'fb', 10, 8),        -- Facebook
    ('grizzly', 'go', 10, 9),        -- Google
    ('grizzly', 'lf', 10, 8),        -- TikTok
    ('grizzly', 'vi', 10, 8),        -- Viber
    ('grizzly', 'vk', 10, 8);        -- VK

-- Vérifier
SELECT provider, service_code, score, attempts 
FROM public.provider_performance 
WHERE provider = 'grizzly'
ORDER BY score DESC;

-- Voir le classement pour WhatsApp (principal service)
SELECT provider, score, attempts 
FROM public.provider_performance 
WHERE service_code = 'wa'
ORDER BY score DESC;
