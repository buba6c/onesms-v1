-- ============================================
-- AJUSTEMENT FINAL: 256 Ⓐ → 120 Ⓐ
-- Utilisateur: al7597453@gmail.com
-- Retrait: 136 Ⓐ
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

-- MÉTHODE: Créer une balance_operation avec type 'admin_deduction'
DO $$
DECLARE
    v_user_id uuid;
    v_current_balance numeric;
BEGIN
    -- Récupérer user_id et balance actuelle
    SELECT id, balance INTO v_user_id, v_current_balance
    FROM users 
    WHERE email = 'al7597453@gmail.com';
    
    -- Créer l'entrée dans balance_operations
    INSERT INTO balance_operations (
        user_id,
        operation_type,
        amount,
        balance_before,
        balance_after,
        frozen_before,
        frozen_after,
        reason
    ) VALUES (
        v_user_id,
        'purchase', -- Utiliser 'purchase' pour retrait
        -136, -- Montant négatif pour retrait
        v_current_balance,
        120.00,
        0,
        0,
        'Admin adjustment: Correction to 120 Ⓐ (removed excess from unfreeze)'
    );
    
    -- Mettre à jour la balance
    UPDATE users 
    SET balance = 120.00,
        updated_at = NOW()
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Balance adjusted from % to 120 Ⓐ', v_current_balance;
END $$;

-- VÉRIFIER LE RÉSULTAT FINAL
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
    '✅ AJUSTEMENT FINAL' as status,
    '256 Ⓐ → 120 Ⓐ' as change,
    '-136 Ⓐ retiré' as amount,
    'Balance finale: 120 Ⓐ disponibles' as result;
