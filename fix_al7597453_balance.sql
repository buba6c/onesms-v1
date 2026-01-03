-- ============================================
-- CORRECTION BALANCE ET LIBÉRATION FROZEN
-- Utilisateur: al7597453@gmail.com
-- Actions:
-- 1. Libérer frozen: 116 Ⓐ → 0 Ⓐ
-- 2. Ajuster balance: 140 Ⓐ → 120 Ⓐ
-- ============================================

-- AVANT DE LANCER: Vérifier l'état actuel
SELECT 
    id,
    email,
    balance as "Balance Actuelle",
    frozen_balance as "Frozen Actuel",
    (balance - COALESCE(frozen_balance, 0)) as "Available Actuel"
FROM users 
WHERE email = 'al7597453@gmail.com';

-- CORRECTION: 
-- 1. Mettre frozen_balance à 0
-- 2. Mettre balance à 120
UPDATE users 
SET balance = 120.00,
    frozen_balance = 0,
    updated_at = NOW()
WHERE email = 'al7597453@gmail.com';

-- VÉRIFICATION APRÈS CORRECTION
SELECT 
    id,
    email,
    balance as "Balance Finale",
    frozen_balance as "Frozen Finale",
    (balance - COALESCE(frozen_balance, 0)) as "Available Finale"
FROM users 
WHERE email = 'al7597453@gmail.com';

-- RÉSUMÉ DE L'ACTION
SELECT 
    '✅ CORRECTION APPLIQUÉE' as status,
    'Balance: 140 Ⓐ → 120 Ⓐ (-20 Ⓐ)' as balance_change,
    'Frozen: 116 Ⓐ → 0 Ⓐ' as frozen_change,
    'Available: 24 Ⓐ → 120 Ⓐ (+96 Ⓐ)' as available_change;
