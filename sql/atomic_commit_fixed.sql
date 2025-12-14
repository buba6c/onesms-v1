-- Fix atomic_commit pour qu'il fonctionne même si frozen_balance n'existe pas
-- dans OLD (problème de trigger/record)

CREATE OR REPLACE FUNCTION atomic_commit(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_balance DECIMAL;
  v_frozen DECIMAL;
  v_frozen_amount DECIMAL;
  v_commit DECIMAL;
  v_new_balance DECIMAL;
  v_new_frozen DECIMAL;
BEGIN
  -- 1. LOCK USER (sans utiliser RECORD)
  SELECT balance, frozen_balance
  INTO v_balance, v_frozen
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- 2. GET frozen_amount FROM ACTIVATION OR RENTAL
  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM activations
    WHERE id = p_activation_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Activation not found: %', p_activation_id;
    END IF;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM rentals
    WHERE id = p_rental_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Rental not found: %', p_rental_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Either activation_id or rental_id must be provided';
  END IF;
  
  -- 3. IDEMPOTENCE: Si frozen_amount = 0, déjà commité
  IF v_frozen_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'message', 'Already committed'
    );
  END IF;
  
  -- 4. CALCULATE COMMIT (Model A: balance ET frozen diminuent)
  v_commit := LEAST(v_frozen_amount, v_frozen);
  v_new_balance := GREATEST(0, v_balance - v_commit);
  v_new_frozen := GREATEST(0, v_frozen - v_commit);
  
  -- 5. UPDATE USER (balance ET frozen diminuent)
  UPDATE users
  SET 
    balance = v_new_balance,
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 6. RESET frozen_amount ON ACTIVATION/RENTAL
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET 
      frozen_amount = 0,
      charged = true,
      status = CASE WHEN status = 'waiting' THEN 'received' ELSE status END,
      updated_at = NOW()
    WHERE id = p_activation_id;
  END IF;
  
  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET 
      frozen_amount = 0,
      charged = true,
      status = CASE WHEN status = 'active' THEN 'completed' ELSE status END,
      updated_at = NOW()
    WHERE id = p_rental_id;
  END IF;
  
  -- 7. UPDATE TRANSACTION
  IF p_transaction_id IS NOT NULL THEN
    UPDATE transactions
    SET status = 'completed', updated_at = NOW()
    WHERE id = p_transaction_id AND status = 'pending';
  END IF;
  
  -- 8. LOG OPERATION
  INSERT INTO balance_operations (
    user_id, 
    activation_id,
    rental_id,
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
    p_activation_id,
    p_rental_id,
    p_transaction_id,
    'commit', 
    v_commit,
    v_balance,
    v_new_balance,
    v_frozen, 
    v_new_frozen,
    COALESCE(p_reason, 'Commit funds')
  );
  
  -- 9. RETURN
  RETURN jsonb_build_object(
    'success', true,
    'committed', v_commit,
    'balance_after', v_new_balance,
    'frozen_after', v_new_frozen
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
