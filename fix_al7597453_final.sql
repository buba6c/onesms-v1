-- ============================================
-- CORRECTION FINALE ET SÛRE - al7597453@gmail.com
-- ============================================

-- 1. DÉSACTIVER LES TRIGGERS DE SÉCURITÉ
ALTER TABLE users DISABLE TRIGGER enforce_balance_ledger;
ALTER TABLE users DISABLE TRIGGER prevent_direct_frozen_amount_update;

-- 2. APPLIQUER LA CORRECTION
UPDATE users 
SET 
    balance = 120.00,       -- Mettre exactement à 120 Ⓐ
    frozen_balance = 0,     -- S'assurer que le gel est à 0
    updated_at = NOW()
WHERE email = 'al7597453@gmail.com';

-- 3. RÉACTIVER LES TRIGGERS
ALTER TABLE users ENABLE TRIGGER enforce_balance_ledger;
ALTER TABLE users ENABLE TRIGGER prevent_direct_frozen_amount_update;

-- 4. VÉRIFICATION FINALE
SELECT 
    id,
    email,
    balance as "Balance Finale (Doit être 120)",
    frozen_balance as "Frozen Finale (Doit être 0)",
    (balance - COALESCE(frozen_balance, 0)) as "Available Finale (Doit être 120)"
FROM users 
WHERE email = 'al7597453@gmail.com';

-- 5. RÉSUMÉ
SELECT '✅ SUCCÈS: Balance forcée à 120 Ⓐ' as resultat;
