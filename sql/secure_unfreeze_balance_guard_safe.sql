-- Reorder secure_unfreeze_balance to insert ledger BEFORE updating users, and avoid balance change on refund (freeze never debits balance)

CREATE OR REPLACE FUNCTION secure_unfreeze_balance(
    p_user_id UUID,
    p_activation_id UUID DEFAULT NULL,
    p_rental_id UUID DEFAULT NULL,
    p_refund_to_balance BOOLEAN DEFAULT false, -- true=refund (no balance change), false=commit (charge balance)
    p_refund_reason TEXT DEFAULT 'Refund'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_frozen_amount DECIMAL := 0;
  v_balance_before DECIMAL := 0;
  v_frozen_before DECIMAL := 0;
  v_new_balance DECIMAL := 0;
  v_new_frozen DECIMAL := 0;
  v_operation_type TEXT;
BEGIN
  SELECT id, balance, frozen_balance INTO v_user
  FROM users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM activations
    WHERE id = p_activation_id AND user_id = p_user_id FOR UPDATE;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM rentals
    WHERE id = p_rental_id AND user_id = p_user_id FOR UPDATE;
  END IF;

  v_frozen_amount := COALESCE(v_frozen_amount, 0);
  v_balance_before := v_user.balance;
  v_frozen_before := COALESCE(v_user.frozen_balance, 0);

  IF v_frozen_amount <= 0 THEN
    RETURN json_build_object(
      'success', true,
      'idempotent', true,
      'unfrozen', 0,
      'balance_before', v_balance_before,
      'balance_after', v_balance_before,
      'frozen_before', v_frozen_before,
      'frozen_after', v_frozen_before
    );
  END IF;

  -- Calculate new balances depending on refund or commit (charge)
  v_new_frozen := GREATEST(0, v_frozen_before - v_frozen_amount);
  IF p_refund_to_balance THEN
    v_operation_type := 'refund';
    v_new_balance := v_balance_before; -- Model A: refund just frees frozen, balance unchanged
  ELSE
    v_operation_type := 'commit';
    v_new_balance := v_balance_before - v_frozen_amount; -- Charge: consume the frozen amount from balance
  END IF;

  -- Insert ledger FIRST so users_balance_guard passes on the upcoming user update
  INSERT INTO balance_operations (
    user_id, activation_id, rental_id, operation_type, amount,
    balance_before, balance_after, frozen_before, frozen_after, reason
  ) VALUES (
    p_user_id, p_activation_id, p_rental_id, v_operation_type, v_frozen_amount,
    v_balance_before, v_new_balance,
    v_frozen_before, v_new_frozen,
    p_refund_reason
  );

  -- Update user balances
  UPDATE users
  SET frozen_balance = v_new_frozen,
      balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Clear frozen_amount on the activation/rental
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET frozen_amount = 0,
        charged = charged OR (NOT p_refund_to_balance),
        status = CASE
                   WHEN NOT p_refund_to_balance AND status IN ('pending', 'waiting') THEN 'received'
                   ELSE status
                 END,
        updated_at = NOW()
    WHERE id = p_activation_id;
  END IF;

  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET frozen_amount = 0,
        charged = charged OR (NOT p_refund_to_balance),
        status = CASE
                   WHEN NOT p_refund_to_balance AND status IN ('active', 'pending') THEN 'completed'
                   ELSE status
                 END,
        updated_at = NOW()
    WHERE id = p_rental_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'unfrozen', v_frozen_amount,
    'balance_before', v_balance_before,
    'balance_after', v_new_balance,
    'frozen_before', v_frozen_before,
    'frozen_after', v_new_frozen
  );
END;
$$;