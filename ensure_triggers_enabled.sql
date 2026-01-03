-- ============================================
-- SÉCURITÉ: RÉACTIVATION DES TRIGGERS
-- À lancer si vous avez un doute
-- ============================================

-- 1. Activer enforce_balance_ledger
ALTER TABLE users ENABLE TRIGGER enforce_balance_ledger;

-- 2. Activer prevent_direct_frozen_amount_update
ALTER TABLE users ENABLE TRIGGER prevent_direct_frozen_amount_update;

-- 3. Confirmer que c'est actif
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    '✅ ACTIF' as status
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_name IN ('enforce_balance_ledger', 'prevent_direct_frozen_amount_update');
