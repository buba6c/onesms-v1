-- ============================================
-- INVESTIGATION APPROFONDIE - al7597453@gmail.com
-- Problèmes détectés:
-- 1. Frozen balance = 116 Ⓐ MAIS aucun gel dans activations/rentals
-- 2. Balance = 140 Ⓐ MAIS devrait être ~9442 Ⓐ
-- ============================================

-- 1. CHERCHER TOUS LES FLUX D'ARGENT (CHRONOLOGIQUE)
SELECT 
    '💸 ALL MONEY FLOWS (CHRONOLOGICAL)' as section,
    created_at,
    type,
    amount,
    CASE 
        WHEN type = 'deposit' THEN '📥 IN'
        WHEN type = 'purchase' THEN '🛒 OUT'
        WHEN type = 'refund' THEN '↩️ BACK'
        ELSE '❓'
    END as flow,
    description,
    status,
    SUM(amount) OVER (ORDER BY created_at) as running_balance
FROM transactions 
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
ORDER BY created_at ASC;

-- 2. CHERCHER ACTIVATIONS ACTIVES OU EN ATTENTE
SELECT 
    '📱 ACTIVE/WAITING ACTIVATIONS' as section,
    id,
    status,
    service_code,
    phone,
    price,
    frozen_amount,
    created_at,
    expires_at,
    provider
FROM activations 
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
  AND status IN ('pending', 'waiting', 'active')
ORDER BY created_at DESC;

-- 3. CHERCHER TOUTES LES ACTIVATIONS (MÊME ANCIENNES)
SELECT 
    '📱 ALL ACTIVATIONS BY STATUS' as section,
    status,
    COUNT(*) as count,
    SUM(price) as total_price,
    SUM(COALESCE(frozen_amount, 0)) as total_frozen,
    MIN(created_at) as first,
    MAX(created_at) as last
FROM activations 
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
GROUP BY status
ORDER BY count DESC;

-- 4. CHERCHER ACTIVATIONS AVEC FROZEN > 0 (MÊME SI TERMINÉES)
SELECT 
    '🔍 ACTIVATIONS WITH FROZEN > 0 (ALL STATUS)' as section,
    id,
    status,
    service_code,
    phone,
    price,
    frozen_amount,
    created_at,
    sms_code
FROM activations 
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
  AND frozen_amount > 0
ORDER BY created_at DESC;

-- 5. TRANSACTIONS DE TYPE "PURCHASE" SANS REFUND
SELECT 
    '🛒 PURCHASES WITHOUT REFUNDS' as section,
    t.created_at,
    t.amount,
    t.description,
    t.status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM transactions r 
            WHERE r.user_id = t.user_id 
            AND r.type = 'refund' 
            AND r.created_at > t.created_at
            AND r.created_at < t.created_at + INTERVAL '1 hour'
        ) THEN '✅ Has refund'
        ELSE '❌ No refund'
    END as refund_status
FROM transactions t
WHERE t.user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
  AND t.type = 'purchase'
ORDER BY t.created_at DESC
LIMIT 20;

-- 6. HISTORIQUE DES MODIFICATIONS DE FROZEN_BALANCE
-- (Si existe une table d'audit, sinon on doit deviner)
SELECT 
    '📊 BALANCE EVOLUTION' as section,
    created_at,
    type,
    amount,
    description,
    SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) OVER (ORDER BY created_at) as cumul_deposits,
    SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) OVER (ORDER BY created_at) as cumul_purchases,
    SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) OVER (ORDER BY created_at) as cumul_refunds,
    SUM(amount) OVER (ORDER BY created_at) as theoretical_balance
FROM transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
ORDER BY created_at DESC
LIMIT 30;

-- 7. VÉRIFIER S'IL Y A EU DES MANIPULATIONS MANUELLES
SELECT 
    '🔧 MANUAL ADJUSTMENTS' as section,
    created_at,
    type,
    amount,
    description,
    status
FROM transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com')
  AND (
    description ILIKE '%manual%' OR
    description ILIKE '%admin%' OR
    description ILIKE '%adjustment%' OR
    description ILIKE '%correction%'
  )
ORDER BY created_at DESC;

-- 8. CALCULER LE DELTA MANQUANT
WITH calculations AS (
    SELECT 
        (SELECT balance FROM users WHERE email = 'al7597453@gmail.com') as current_balance,
        (SELECT frozen_balance FROM users WHERE email = 'al7597453@gmail.com') as current_frozen,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com') AND type = 'deposit'), 0) as total_deposits,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com') AND type = 'purchase'), 0) as total_purchases,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = (SELECT id FROM users WHERE email = 'al7597453@gmail.com') AND type = 'refund'), 0) as total_refunds
)
SELECT 
    '⚠️ MISSING MONEY ANALYSIS' as section,
    current_balance,
    current_frozen,
    total_deposits,
    total_purchases,
    total_refunds,
    (total_deposits + total_purchases + total_refunds) as calculated_balance,
    (total_deposits + total_purchases + total_refunds - current_balance) as missing_amount,
    current_frozen as orphaned_frozen,
    '❌ CRITICAL: Funds are missing!' as status
FROM calculations;
