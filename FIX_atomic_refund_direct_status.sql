-- ========================================================================
-- FIX: atomic_refund_direct - Utiliser 'failed' au lieu de 'refunded'
-- ========================================================================
-- PROBLÈME: transactions.status n'autorise que: pending, completed, failed, cancelled
-- atomic_refund_direct essayait de mettre 'refunded' → constraint violation
-- RÉSULTAT: NO_NUMBERS gelait les fonds sans jamais les libérer
-- ========================================================================

CREATE OR REPLACE FUNCTION atomic_refund_direct(
  p_user_id UUID,
  p_amount DECIMAL,
  p_transaction_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_amount_to_refund DECIMAL;
  v_new_frozen DECIMAL;
BEGIN
  -- Validation
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive: %', p_amount;
  END IF;
  
  -- 1. LOCK USER et lire les valeurs
  SELECT balance, frozen_balance
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- 2. CALCULATE REFUND (Model A)
  -- On ne peut pas refund plus que ce qui est frozen
  v_amount_to_refund := LEAST(p_amount, v_user.frozen_balance);
  v_new_frozen := GREATEST(0, v_user.frozen_balance - v_amount_to_refund);
  
  -- 3. UPDATE USER (Model A: balance INCHANGÉ, frozen diminue)
  UPDATE users
  SET 
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 4. UPDATE TRANSACTION
  IF p_transaction_id IS NOT NULL THEN
    UPDATE transactions
    SET 
      status = 'failed',  -- ✅ FIX: Utiliser 'failed' au lieu de 'refunded'
      balance_after = v_user.balance, -- balance inchangé
      updated_at = NOW()
    WHERE id = p_transaction_id AND status = 'pending';
  END IF;
  
  -- 5. LOG OPERATION (Model A)
  INSERT INTO balance_operations (
    user_id,
    related_transaction_id,
    operation_type,
    amount,
    balance_before,
    balance_after,
    frozen_before,
    frozen_after,
    reason
  ) VALUES (
    p_user_id,
    p_transaction_id,
    'refund',
    v_amount_to_refund,
    v_user.balance,
    v_user.balance, -- Model A: balance inchangé
    v_user.frozen_balance,
    v_new_frozen,
    COALESCE(p_reason, 'Refund - purchase failed before activation')
  );
  
  -- 6. RETURN RESULT
  RETURN json_build_object(
    'success', true,
    'amount_refunded', v_amount_to_refund,
    'balance', v_user.balance,
    'frozen_before', v_user.frozen_balance,
    'frozen_after', v_new_frozen
  );
END;
$$ LANGUAGE plpgsql;

-- Permissions
GRANT EXECUTE ON FUNCTION atomic_refund_direct TO authenticated, service_role;

COMMENT ON FUNCTION atomic_refund_direct IS 'Model A: Refund sans activation - balance inchangé, frozen diminue. Fix: status=failed au lieu de refunded';
