-- Mise à jour de la priorité des providers : Grizzly en PREMIER
-- 
-- Ordre de priorité optimal :
-- 1. Grizzly SMS    - Bon prix, bonne disponibilité, simple
-- 2. 5sim           - Excellent pour WhatsApp
-- 3. HeroSMS        - Provider principal pour la liste
-- 4. SMSPVA         - Backup
-- 5. OnlineSIM      - Backup
-- 6. TextVerified   - Premium uniquement (WhatsApp/TikTok USA/UK)

UPDATE public.system_settings
SET value = '["grizzly", "5sim", "herosms", "smspva", "onlinesim", "textverified"]'
WHERE key = 'provider_priority';

-- Vérifier la mise à jour
SELECT 
    key,
    value as new_priority_order,
    updated_at
FROM public.system_settings 
WHERE key = 'provider_priority';
