-- ============================================
-- ANALYSE DES ACTIVATIONS ANNULÉES INJUSTEMENT
-- User: m782705582@gmail.com
-- Problème: "Annulé/Remboursé" mais numéro actif
-- ============================================

-- 1. Identifier l'ID du user
SELECT id, email, balance FROM users WHERE email = 'm782705582@gmail.com';

-- 2. Voir les activations concernées (TikTok USA)
SELECT 
    id,
    phone_number,
    service_code,
    country_code,
    status,
    provider,
    cost,
    price,
    created_at,
    updated_at,
    sms_text
FROM activations 
WHERE user_id = (SELECT id FROM users WHERE email = 'm782705582@gmail.com')
  AND service_code = 'tiktok'
  AND country_code = 'usa'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Voir les logs de transactions associées
SELECT 
    t.created_at,
    t.type,
    t.amount,
    t.status,
    t.description
FROM transactions t
WHERE t.user_id = (SELECT id FROM users WHERE email = 'm782705582@gmail.com')
ORDER BY t.created_at DESC
LIMIT 20;

-- 4. Vérifier s'il y a des balance_operations (remboursements auto)
SELECT 
    created_at,
    operation_type,
    amount,
    reason,
    balance_before,
    balance_after
FROM balance_operations
WHERE user_id = (SELECT id FROM users WHERE email = 'm782705582@gmail.com')
ORDER BY created_at DESC
LIMIT 10;
