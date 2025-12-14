-- Rebuild atomic_commit to satisfy users_balance_guard and remove overload ambiguity

-- Drop every old signature to avoid PGRST203 ambiguity
DROP FUNCTION IF EXISTS atomic_commit(UUID, UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS atomic_commit(UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS atomic_commit(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS atomic_commit(UUID, UUID, UUID, UUID);

-- Ledger-first commit: log BEFORE updating users so enforce_balance_ledger passes
CREATE OR REPLACE FUNCTION atomic_commit(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Commit funds'
)
RETURNS JSONB AS $$
DECLARE
  v_balance_before DECIMAL;
  v_frozen_before DECIMAL;
  v_frozen_amount DECIMAL;
  v_commit DECIMAL;
  v_balance_after DECIMAL;
  v_frozen_after DECIMAL;
BEGIN
  -- 1) Lock user row
  SELECT balance, frozen_balance
  INTO v_balance_before, v_frozen_before
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- 2) Determine frozen amount from activation or rental
  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM activations
    WHERE id = p_activation_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Activation not found: %', p_activation_id;
    END IF;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM rentals
    WHERE id = p_rental_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Rental not found: %', p_rental_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Either activation_id or rental_id must be provided';
  END IF;

  v_frozen_amount := COALESCE(v_frozen_amount, 0);

  -- 3) Idempotence: nothing to commit
  IF v_frozen_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'message', 'Already committed',
      'balance', v_balance_before,
      'frozen', v_frozen_before
    );
  END IF;

  -- 4) Compute new balances (Model A: balance and frozen both decrease)
  v_commit := LEAST(v_frozen_amount, COALESCE(v_frozen_before, 0));
  v_balance_after := v_balance_before - v_commit;
  IF v_balance_after < 0 THEN
    RAISE EXCEPTION 'Insufficient balance to commit %, balance_before=%', v_commit, v_balance_before;
  END IF;
  v_frozen_after := GREATEST(0, v_frozen_before - v_commit);

  -- 5) Insert ledger FIRST to satisfy users_balance_guard
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
    v_balance_before,
    v_balance_after,
    v_frozen_before,
    v_frozen_after,
    COALESCE(p_reason, 'Commit funds')
  );

  -- 6) Update user balances (guard now passes)
  UPDATE users
  SET
    balance = v_balance_after,
    frozen_balance = v_frozen_after,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 7) Clear frozen_amount and mark charged
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET
      frozen_amount = 0,
      charged = true,
      status = CASE WHEN status IN ('pending', 'waiting') THEN 'received' ELSE status END,
      updated_at = NOW()
    WHERE id = p_activation_id;
  END IF;

  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET
      frozen_amount = 0,
      charged = true,
      status = CASE WHEN status IN ('pending', 'active') THEN 'completed' ELSE status END,
      updated_at = NOW()
    WHERE id = p_rental_id;
  END IF;

  -- 8) Update linked transaction if provided
  IF p_transaction_id IS NOT NULL THEN
    UPDATE transactions
    SET status = 'completed', updated_at = NOW()
    WHERE id = p_transaction_id AND status = 'pending';
  END IF;

  -- 9) Return result
  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'committed', v_commit,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'frozen_before', v_frozen_before,
    'frozen_after', v_frozen_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION atomic_commit TO service_role, authenticated;
