-- ============================================================================
-- Fonction RPC pour dégeler automatiquement les soldes orphelins
-- ============================================================================
-- Cette fonction identifie et corrige les utilisateurs avec frozen_balance
-- mais sans transactions actives correspondantes
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_unfreeze_orphaned_balance(
  p_user_email text DEFAULT NULL
)
RETURNS TABLE (
  user_email text,
  unfrozen_amount numeric,
  new_balance numeric,
  status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user record;
  v_expected_frozen numeric;
  v_orphan_amount numeric;
  v_processed boolean := false;
BEGIN
  -- Si un email est fourni, traiter uniquement cet utilisateur
  -- Sinon, traiter tous les utilisateurs avec des soldes orphelins
  FOR v_user IN 
    SELECT 
      u.id,
      u.email,
      u.balance,
      u.frozen_balance
    FROM users u
    WHERE u.frozen_balance > 0
      AND (p_user_email IS NULL OR u.email = p_user_email)
  LOOP
    v_processed := true;
    
    -- Calculer le montant qui devrait être gelé
    SELECT COALESCE(SUM(frozen_amount), 0)
    INTO v_expected_frozen
    FROM (
      SELECT a.frozen_amount FROM activations a
      WHERE a.user_id = v_user.id AND a.status IN ('pending', 'waiting')
      UNION ALL
      SELECT r.frozen_amount FROM rentals r
      WHERE r.user_id = v_user.id AND r.status = 'active'
    ) active_freezes;

    -- Calculer le montant orphelin
    v_orphan_amount := v_user.frozen_balance - v_expected_frozen;

    -- Si il y a un montant orphelin, le dégeler
    IF v_orphan_amount > 0 THEN
      -- Créer l'entrée dans balance_operations avec un type valide
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
        v_user.id,
        'refund', -- Utiliser 'refund' au lieu de 'admin_correction'
        v_orphan_amount,
        v_user.balance,
        v_user.balance + v_orphan_amount,
        v_user.frozen_balance,
        v_expected_frozen,
        'Admin cleanup: Unfreezing orphaned balance (no active transactions)'
      );

      -- Mettre à jour le solde de l'utilisateur
      UPDATE users 
      SET balance = balance + v_orphan_amount,
          frozen_balance = v_expected_frozen
      WHERE id = v_user.id;

      -- Retourner le résultat
      RETURN QUERY SELECT 
        v_user.email,
        v_orphan_amount,
        v_user.balance + v_orphan_amount,
        'SUCCESS'::text;
    ELSE
      -- Aucun montant orphelin
      RETURN QUERY SELECT 
        v_user.email,
        0::numeric,
        v_user.balance,
        'NO_ORPHAN'::text;
    END IF;
  END LOOP;

  -- Si aucun utilisateur trouvé
  IF NOT v_processed THEN
    RETURN QUERY SELECT 
      COALESCE(p_user_email, 'ALL')::text,
      0::numeric,
      0::numeric,
      'NO_USER_FOUND'::text;
  END IF;
END;
$$;

-- ============================================================================
-- Exemples d'utilisation
-- ============================================================================

-- 1. Dégeler pour un utilisateur spécifique
-- SELECT * FROM admin_unfreeze_orphaned_balance('mbayefaye176@gmail.com');

-- 2. Dégeler pour TOUS les utilisateurs avec des soldes orphelins
-- SELECT * FROM admin_unfreeze_orphaned_balance();

-- 3. Voir d'abord qui serait affecté (requête de diagnostic)
-- SELECT 
--   u.email,
--   u.frozen_balance as current_frozen,
--   COALESCE(active_frozen.total, 0) as expected_frozen,
--   u.frozen_balance - COALESCE(active_frozen.total, 0) as orphan_amount
-- FROM users u
-- LEFT JOIN (
--   SELECT user_id, SUM(frozen_amount) as total
--   FROM (
--     SELECT user_id, frozen_amount FROM activations WHERE status IN ('pending', 'waiting')
--     UNION ALL
--     SELECT user_id, frozen_amount FROM rentals WHERE status = 'active'
--   ) active
--   GROUP BY user_id
-- ) active_frozen ON u.id = active_frozen.user_id
-- WHERE u.frozen_balance > 0
--   AND u.frozen_balance != COALESCE(active_frozen.total, 0);
