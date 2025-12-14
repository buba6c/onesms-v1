-- ========================================================================
-- DÉPLOIEMENT: admin_add_credit - VERSION FINALE
-- ========================================================================
-- Date: 2025-12-02
-- Corrections:
--   1. payment_method = 'bonus' au lieu de 'admin'
--   2. PAS d'insertion dans balance_operations (contrainte valid_freeze_op)
-- ========================================================================

CREATE OR REPLACE FUNCTION admin_add_credit(
  p_user_id UUID,
  p_amount DECIMAL,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  -- Validation
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive: %', p_amount;
  END IF;
  
  -- 1. LOCK USER et lire balance actuel
  SELECT id, balance, frozen_balance, email
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- 2. CALCULATE NEW BALANCE
  v_new_balance := v_user.balance + p_amount;
  
  -- 3. UPDATE USER BALANCE
  UPDATE users
  SET 
    balance = v_new_balance,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 4. CREATE TRANSACTION LOG
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    status,
    payment_method,
    balance_before,
    balance_after,
    description
  ) VALUES (
    p_user_id,
    'credit',
    p_amount,
    'completed',
    'bonus',  -- 'bonus' car 'admin' n'est pas autorisé par la contrainte
    v_user.balance,
    v_new_balance,
    COALESCE(p_admin_note, 'Crédit ajouté par admin')
  )
  RETURNING id INTO v_transaction_id;
  
  -- 5. NOTE: PAS de balance_operations
  -- Les crédits admin ne passent pas par le système freeze/commit/refund
  -- Ils sont directement ajoutés à la balance (Model A)
  -- La transaction dans 'transactions' suffit pour l'audit
  
  -- 6. RETURN RESULT
  RETURN json_build_object(
    'success', true,
    'amount_added', p_amount,
    'balance_before', v_user.balance,
    'balance_after', v_new_balance,
    'frozen', v_user.frozen_balance,
    'transaction_id', v_transaction_id,
    'user_email', v_user.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions (seulement service_role pour admin)
REVOKE ALL ON FUNCTION admin_add_credit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_add_credit TO service_role;

-- Commentaire
COMMENT ON FUNCTION admin_add_credit IS 'Admin function to add credits to user balance (Model A) - logs only in transactions table';

-- ========================================================================
-- TEST
-- ========================================================================
-- SELECT admin_add_credit('e108c02a-2012-4043-bbc2-fb09bb11f824', 10, 'Test');
