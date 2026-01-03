-- ============================================
-- Analyse complète pour al7597453@gmail.com
-- Version corrigée - colonnes vérifiées
-- ============================================

-- 1. INFO UTILISATEUR
SELECT 
    '👤 USER INFO' as section,
    id,
    email,
    balance,
    frozen_balance,
    (balance - COALESCE(frozen_balance, 0)) as available,
    role,
    created_at
FROM users 
WHERE email = 'al7597453@gmail.com';

-- 2. RÉSUMÉ TRANSACTIONS
SELECT 
    '💰 TRANSACTIONS SUMMARY' as section,
    type,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    MIN(created_at) as first_transaction,
    MAX(created_at) as last_transaction
FROM transactions 
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
GROUP BY type
ORDER BY total_amount DESC;

-- 3. DERNIÈRES TRANSACTIONS (20)
SELECT 
    '📋 LAST 20 TRANSACTIONS' as section,
    created_at,
    type,
    amount,
    description,
    status,
    payment_method
FROM transactions 
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
ORDER BY created_at DESC
LIMIT 20;

-- 4. RÉSUMÉ ACTIVATIONS
SELECT 
    '📱 ACTIVATIONS SUMMARY' as section,
    status,
    COUNT(*) as count,
    SUM(COALESCE(frozen_amount, 0)) as total_frozen,
    provider,
    service_code
FROM activations 
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
GROUP BY status, provider, service_code
ORDER BY count DESC;

-- 5. ACTIVATIONS AVEC FONDS GELÉS
SELECT 
    '🔒 ACTIVATIONS WITH FROZEN FUNDS' as section,
    id,
    status,
    service_code,
    phone,
    frozen_amount,
    price,
    provider,
    created_at,
    expires_at
FROM activations 
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
  AND COALESCE(frozen_amount, 0) > 0
ORDER BY created_at DESC;

-- 6. DERNIÈRES ACTIVATIONS
SELECT 
    '📱 LAST 10 ACTIVATIONS' as section,
    created_at,
    status,
    service_code,
    phone,
    sms_code,
    frozen_amount,
    provider
FROM activations 
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
ORDER BY created_at DESC
LIMIT 10;

-- 7. RÉSUMÉ RENTALS (si existant)
SELECT 
    '🏠 RENTALS SUMMARY' as section,
    status,
    COUNT(*) as count,
    SUM(COALESCE(frozen_amount, 0)) as total_frozen,
    provider
FROM rentals 
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
GROUP BY status, provider;

-- 8. RENTALS AVEC FONDS GELÉS
SELECT 
    '🔒 RENTALS WITH FROZEN FUNDS' as section,
    id,
    status,
    phone,
    frozen_amount,
    price,
    provider,
    created_at,
    end_date
FROM rentals 
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
  AND COALESCE(frozen_amount, 0) > 0
ORDER BY created_at DESC;

-- 9. CALCUL FINANCIER DÉTAILLÉ
WITH user_stats AS (
    SELECT 
        u.id,
        u.balance,
        u.frozen_balance,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = u.id AND type = 'deposit'), 0) as total_deposits,
        COALESCE((SELECT ABS(SUM(amount)) FROM transactions WHERE user_id = u.id AND type = 'purchase'), 0) as total_purchases,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = u.id AND type = 'refund'), 0) as total_refunds,
        COALESCE((SELECT SUM(frozen_amount) FROM activations WHERE user_id = u.id), 0) as frozen_in_activations,
        COALESCE((SELECT SUM(frozen_amount) FROM rentals WHERE user_id = u.id), 0) as frozen_in_rentals
    FROM users u
    WHERE u.email = 'al7597453@gmail.com'
)
SELECT 
    '📊 FINANCIAL SUMMARY' as section,
    balance,
    frozen_balance,
    (balance - COALESCE(frozen_balance, 0)) as available,
    total_deposits,
    total_purchases,
    total_refunds,
    (total_deposits - total_purchases + total_refunds) as expected_balance,
    frozen_in_activations,
    frozen_in_rentals,
    (frozen_in_activations + frozen_in_rentals) as total_frozen_calculated,
    CASE 
        WHEN frozen_balance != (frozen_in_activations + frozen_in_rentals) 
        THEN '⚠️ MISMATCH'
        ELSE '✅ OK'
    END as frozen_status
FROM user_stats;

-- 10. TRANSACTIONS SUSPECTES
SELECT 
    '⚠️ SUSPICIOUS TRANSACTIONS' as section,
    created_at,
    type,
    amount,
    description,
    status
FROM transactions 
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
  AND (
      (type = 'deposit' AND amount < 0) OR
      (type = 'refund' AND amount < 0) OR
      (type = 'purchase' AND amount > 0)
  )
ORDER BY created_at DESC;
