-- Reorder atomic_freeze to write ledger before updating users, satisfying users_balance_guard

CREATE OR REPLACE FUNCTION atomic_freeze(
  p_user_id uuid,
  p_amount numeric,
  p_transaction_id uuid,
  p_activation_id uuid DEFAULT NULL,
  p_rental_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_available DECIMAL;
  v_new_frozen DECIMAL;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive: %', p_amount;
  END IF;

  SELECT balance, frozen_balance
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  v_available := v_user.balance - v_user.frozen_balance;
  IF v_available < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: % available, % required', v_available, p_amount;
  END IF;

  v_new_frozen := v_user.frozen_balance + p_amount;

  -- Insert ledger FIRST so users_balance_guard allows the subsequent user update
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
    'freeze',
    p_amount,
    v_user.balance,
    v_user.balance,
    v_user.frozen_balance,
    v_new_frozen,
    COALESCE(p_reason, 'Credits frozen for purchase')
  );

  UPDATE users
  SET 
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;

  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET frozen_amount = p_amount, updated_at = NOW()
    WHERE id = p_activation_id;
  END IF;

  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET frozen_amount = p_amount, updated_at = NOW()
    WHERE id = p_rental_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'balance_before', v_user.balance,
    'balance_after', v_user.balance,
    'frozen_before', v_user.frozen_balance,
    'frozen_after', v_new_frozen,
    'available', v_user.balance - v_new_frozen
  );
END;
$$;