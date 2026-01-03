-- FIX TRIGGER BLOCKS: Reorder operations
-- The trigger 'users_balance_guard' requires a balance_operations row to exist
-- BEFORE the users table is updated.
-- We must INSERT into balance_operations FIRST, then UPDATE users.

-- ===============================================================================
-- 1. RECREATE atomic_refund WITH CORRECT ORDER
-- ===============================================================================
CREATE OR REPLACE FUNCTION atomic_refund(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_frozen_amount DECIMAL;
  v_refund DECIMAL;
  v_new_frozen DECIMAL;
BEGIN
  -- 1. LOCK USER
  SELECT balance, frozen_balance
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- 2. GET frozen_amount
  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount FROM activations WHERE id = p_activation_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Activation not found'; END IF;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount FROM rentals WHERE id = p_rental_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Rental not found'; END IF;
  ELSIF p_transaction_id IS NOT NULL THEN
     SELECT ABS(amount) INTO v_frozen_amount FROM transactions WHERE id = p_transaction_id;
  ELSE
    RAISE EXCEPTION 'Target ID required';
  END IF;
  
  IF v_frozen_amount <= 0 OR v_frozen_amount IS NULL THEN v_frozen_amount := 0; END IF;

  -- 3. CALCULATE
  v_refund := LEAST(v_frozen_amount, v_user.frozen_balance);
  v_new_frozen := GREATEST(0, v_user.frozen_balance - v_refund);
  
  -- 4. LOG (INSERT FIRST to satisfy trigger)
  INSERT INTO balance_operations (
    user_id, activation_id, rental_id, related_transaction_id, 
    operation_type, amount, 
    balance_before, balance_after, 
    frozen_before, frozen_after, 
    reason, created_at
  ) VALUES (
    p_user_id, p_activation_id, p_rental_id, p_transaction_id, 
    'refund', v_refund, 
    v_user.balance, v_user.balance,  -- Balance doesn't change
    v_user.frozen_balance, v_new_frozen, 
    COALESCE(p_reason, 'Refund'),
    NOW()
  );

  -- 5. UPDATE USER (Now safe because log exists)
  UPDATE users
  SET frozen_balance = v_new_frozen, updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 6. RESET TARGET
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations SET frozen_amount = 0, status = 'cancelled', updated_at = NOW() WHERE id = p_activation_id;
  END IF;
  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals SET frozen_amount = 0, status = 'cancelled', updated_at = NOW() WHERE id = p_rental_id;
  END IF;
  IF p_transaction_id IS NOT NULL THEN
    UPDATE transactions SET status = 'refunded', updated_at = NOW() WHERE id = p_transaction_id;
  END IF;
  
  RETURN json_build_object('success', true, 'refunded', v_refund);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================================================
-- 2. RECREATE atomic_commit WITH CORRECT ORDER
-- ===============================================================================
CREATE OR REPLACE FUNCTION atomic_commit(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_frozen_amount DECIMAL;
  v_commit DECIMAL;
  v_new_balance DECIMAL;
  v_new_frozen DECIMAL;
BEGIN
  -- 1. LOCK USER
  SELECT balance, frozen_balance
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  
  -- 2. GET TARGET
  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount FROM activations WHERE id = p_activation_id FOR UPDATE;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount FROM rentals WHERE id = p_rental_id FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Target ID required';
  END IF;
  
  IF v_frozen_amount <= 0 THEN
    RETURN json_build_object('success', true, 'message', 'Already committed');
  END IF;
  
  -- 3. CALCULATE
  v_commit := LEAST(v_frozen_amount, v_user.frozen_balance);
  v_new_balance := GREATEST(0, v_user.balance - v_commit);
  v_new_frozen := GREATEST(0, v_user.frozen_balance - v_commit);
  
  -- 4. LOG (INSERT FIRST)
  INSERT INTO balance_operations (
    user_id, activation_id, rental_id, 
    operation_type, amount, 
    balance_before, balance_after, 
    frozen_before, frozen_after, 
    reason, created_at
  ) VALUES (
    p_user_id, p_activation_id, p_rental_id, 
    'commit', v_commit, 
    v_user.balance, v_new_balance, 
    v_user.frozen_balance, v_new_frozen, 
    COALESCE(p_reason, 'Commit'),
    NOW()
  );

  -- 5. UPDATE USER
  UPDATE users
  SET balance = v_new_balance, frozen_balance = v_new_frozen, updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 6. UPDATE TARGET
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations SET frozen_amount = 0, charged = true, status = 'received', updated_at = NOW() WHERE id = p_activation_id;
  END IF;
  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals SET frozen_amount = 0, charged = true, status = 'completed', updated_at = NOW() WHERE id = p_rental_id;
  END IF;
  
  RETURN json_build_object('success', true, 'committed', v_commit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
