-- ============================================
-- LIBÉRATION DES FONDS GELÉS ORPHELINS
-- Utilisateur: al7597453@gmail.com
-- Montant à libérer: 116 Ⓐ
-- ============================================

-- AVANT DE LANCER: Vérifier le user_id
SELECT 
    id,
    email,
    balance as "Balance Actuelle",
    frozen_balance as "Frozen Actuel",
    (balance - COALESCE(frozen_balance, 0)) as "Available Actuel"
FROM users 
WHERE email = 'al7597453@gmail.com';

-- CORRECTION: Mettre frozen_balance à 0
UPDATE users 
SET frozen_balance = 0,
    updated_at = NOW()
WHERE email = 'al7597453@gmail.com'
  AND frozen_balance > 0;

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
    'Frozen balance libéré: 116 Ⓐ → 0 Ⓐ' as action,
    'Balance disponible passée de 24 Ⓐ à 140 Ⓐ' as result;
