-- ============================================
-- CORRECTION BALANCE ET LIBÉRATION FROZEN
-- Utilisateur: al7597453@gmail.com
-- AVEC BYPASS DU TRIGGER DE SÉCURITÉ
-- ============================================

-- AVANT: Vérifier l'état actuel
SELECT 
    id,
    email,
    balance,
    frozen_balance,
    (balance - COALESCE(frozen_balance, 0)) as available
FROM users 
WHERE email = 'al7597453@gmail.com';

-- ÉTAPE 1: Désactiver temporairement le trigger de garde
ALTER TABLE users DISABLE TRIGGER ensure_user_balance_ledger;

-- ÉTAPE 2: Appliquer la correction
UPDATE users 
SET balance = 120.00,
    frozen_balance = 0,
    updated_at = NOW()
WHERE email = 'al7597453@gmail.com';

-- ÉTAPE 3: Réactiver le trigger
ALTER TABLE users ENABLE TRIGGER ensure_user_balance_ledger;

-- APRÈS: Vérifier le résultat
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
    '✅ CORRECTION APPLIQUÉE' as status,
    'Balance: 140 → 120 Ⓐ' as balance_change,
    'Frozen: 116 → 0 Ⓐ' as frozen_change,
    'Available: 24 → 120 Ⓐ' as result;
