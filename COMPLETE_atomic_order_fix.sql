-- ===============================================================================
-- 🛡️ COMPLETE FIX: atomic_freeze, atomic_commit, atomic_refund
-- ===============================================================================
-- PROBLEM: The trigger 'users_balance_guard' throws an error if we update 'users'
-- BEFORE inserting into 'balance_operations'.
--
-- REASON: The trigger enforces strict data integrity: no balance change without a log.
--
-- FIX: Reorder ALL atomic functions to:
-- 1. Calculate new values
-- 2. INSERT into balance_operations (Log)
-- 3. UPDATE users (Actual change)
-- ===============================================================================

-- ===============================================================================
-- 1. atomic_freeze (Model A: balance CONSTANT, frozen INCREASES)
-- ===============================================================================
CREATE OR REPLACE FUNCTION atomic_freeze(
  p_user_id UUID,
  p_amount DECIMAL,
  p_transaction_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_available DECIMAL;
  v_new_frozen DECIMAL;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  -- 1. LOCK USER
  SELECT balance, frozen_balance INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  -- 2. CHECK AVAILABLE
  v_available := v_user.balance - v_user.frozen_balance;
  IF v_available < p_amount THEN 
    RAISE EXCEPTION 'Insufficient balance: % available, % required', v_available, p_amount;
  END IF;

  v_new_frozen := v_user.frozen_balance + p_amount;

  -- 3. LOG (INSERT FIRST to satisfy trigger)
  INSERT INTO balance_operations (
    user_id, activation_id, rental_id, related_transaction_id, 
    operation_type, amount, 
    balance_before, balance_after, 
    frozen_before, frozen_after, 
    reason, created_at
  ) VALUES (
    p_user_id, p_activation_id, p_rental_id, p_transaction_id, 
    'freeze', p_amount, 
    v_user.balance, v_user.balance, -- Balance constant in Model A
    v_user.frozen_balance, v_new_frozen,
    COALESCE(p_reason, 'Credits frozen for purchase'),
    NOW()
  );

  -- 4. UPDATE USER (Safe after log)
  UPDATE users SET frozen_balance = v_new_frozen, updated_at = NOW() WHERE id = p_user_id;

  -- 5. UPDATE TARGETS
  IF p_activation_id IS NOT NULL THEN 
    UPDATE activations SET frozen_amount = p_amount, updated_at = NOW() WHERE id = p_activation_id; 
  END IF;
  IF p_rental_id IS NOT NULL THEN 
    UPDATE rentals SET frozen_amount = p_amount, updated_at = NOW() WHERE id = p_rental_id; 
  END IF;

  RETURN json_build_object(
    'success', true, 
    'frozen_before', v_user.frozen_balance,
    'frozen_after', v_new_frozen,
    'balance', v_user.balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===============================================================================
-- 2. atomic_refund (Model A: balance CONSTANT, frozen DECREASES)
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
  SELECT balance, frozen_balance INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  
  -- 2. GET TARGET FROZEN AMOUNT
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
    v_user.balance, v_user.balance, -- Balance constant in Model A
    v_user.frozen_balance, v_new_frozen, 
    COALESCE(p_reason, 'Refund'),
    NOW()
  );

  -- 5. UPDATE USER (Safe after log)
  UPDATE users SET frozen_balance = v_new_frozen, updated_at = NOW() WHERE id = p_user_id;
  
  -- 6. RESET TARGETS
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
-- 3. atomic_commit (Model A: balance DECREASES, frozen DECREASES)
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
  SELECT balance, frozen_balance INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  
  -- 2. GET TARGET FROZEN AMOUNT
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
  
  -- 4. LOG (INSERT FIRST to satisfy trigger)
  INSERT INTO balance_operations (
    user_id, activation_id, rental_id, related_transaction_id,
    operation_type, amount, 
    balance_before, balance_after, 
    frozen_before, frozen_after, 
    reason, created_at
  ) VALUES (
    p_user_id, p_activation_id, p_rental_id, p_transaction_id,
    'commit', v_commit, 
    v_user.balance, v_new_balance, 
    v_user.frozen_balance, v_new_frozen, 
    COALESCE(p_reason, 'Commit'),
    NOW()
  );

  -- 5. UPDATE USER (Safe after log)
  UPDATE users 
  SET balance = v_new_balance, frozen_balance = v_new_frozen, updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 6. UPDATE TARGETS
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations SET frozen_amount = 0, charged = true, status = 'received', updated_at = NOW() WHERE id = p_activation_id;
  END IF;
  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals SET frozen_amount = 0, charged = true, status = 'completed', updated_at = NOW() WHERE id = p_rental_id;
  END IF;
  
  RETURN json_build_object('success', true, 'committed', v_commit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
