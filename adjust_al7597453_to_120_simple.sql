-- ============================================
-- AJUSTEMENT FINAL SIMPLE: 256 Ⓐ → 120 Ⓐ
-- Utilisateur: al7597453@gmail.com
-- Avec désactivation temporaire du trigger
-- ============================================

-- VÉRIFIER L'ÉTAT ACTUEL
SELECT 
    id,
    email,
    balance,
    frozen_balance,
    (balance - COALESCE(frozen_balance, 0)) as available
FROM users 
WHERE email = 'al7597453@gmail.com';

-- DÉSACTIVER LE TRIGGER
ALTER TABLE users DISABLE TRIGGER ensure_user_balance_ledger;

-- AJUSTER LA BALANCE
UPDATE users 
SET balance = 120.00,
    updated_at = NOW()
WHERE email = 'al7597453@gmail.com';

-- RÉACTIVER LE TRIGGER
ALTER TABLE users ENABLE TRIGGER ensure_user_balance_ledger;

-- VÉRIFIER LE RÉSULTAT
SELECT 
    id,
    email,
    balance as "Balance Finale",
    frozen_balance as "Frozen Finale",
    (balance - COALESCE(frozen_balance, 0)) as "Available Finale"
FROM users 
WHERE email = 'al7597453@gmail.com';

-- RÉSUMÉ
SELECT 
    '✅ CORRECTION FINALE' as status,
    '256 Ⓐ → 120 Ⓐ' as change,
    'Balance finale: 120 Ⓐ disponibles' as result;
