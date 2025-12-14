-- Idempotent credit function for MoneyFusion recharges (v2 to avoid breaking existing calls)
CREATE OR REPLACE FUNCTION public.secure_moneyfusion_credit_v2(
  p_transaction_id uuid,
  p_token text,
  p_reference text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx transactions%rowtype;
  v_user_balance numeric;
  v_user_frozen numeric;
  v_credits numeric;
  v_now timestamptz := now();
BEGIN
  -- Lock transaction
  SELECT * INTO v_tx
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'transaction % not found', p_transaction_id USING errcode = 'P0002';
  END IF;

  -- Idempotence: already credited?
  IF EXISTS (
    SELECT 1 FROM balance_operations
    WHERE related_transaction_id = p_transaction_id
      AND operation_type = 'credit_admin'
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('status', 'noop', 'reason', 'already_credited');
  END IF;

  -- Extract credits from metadata
  v_credits := coalesce((v_tx.metadata->>'activations')::numeric, 0);
  IF v_credits <= 0 THEN
    RAISE EXCEPTION 'no activations in transaction metadata' USING errcode = 'P0003';
  END IF;

  -- Lock user
  SELECT balance, frozen_balance INTO v_user_balance, v_user_frozen
  FROM users WHERE id = v_tx.user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user % not found', v_tx.user_id USING errcode = 'P0004';
  END IF;

  v_user_balance := coalesce(v_user_balance, 0) + v_credits;

  -- Insert balance operation
  INSERT INTO balance_operations(
    user_id, related_transaction_id, operation_type, amount,
    balance_before, balance_after, frozen_before, frozen_after,
    reason, metadata, created_at
  ) VALUES (
    v_tx.user_id, p_transaction_id, 'credit_admin', v_credits,
    coalesce(v_user_balance, 0) - v_credits, v_user_balance,
    coalesce(v_user_frozen, 0), coalesce(v_user_frozen, 0),
    'moneyfusion_topup',
    jsonb_build_object(
      'token', p_token,
      'reference', p_reference,
      'credits', v_credits
    ),
    v_now
  );

  -- Update user balance
  UPDATE users
    SET balance = v_user_balance,
        updated_at = v_now
    WHERE id = v_tx.user_id;

  -- Mark transaction completed
  UPDATE transactions
    SET status = 'completed',
        balance_after = v_user_balance,
        updated_at = v_now
    WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'status', 'credited',
    'transaction_id', p_transaction_id,
    'user_id', v_tx.user_id,
    'credits', v_credits,
    'new_balance', v_user_balance
  );
END;
$$;

COMMENT ON FUNCTION public.secure_moneyfusion_credit_v2(uuid, text, text) IS 'Crédite le solde utilisateur de façon idempotente après paiement MoneyFusion (version 2, sans drop).';

GRANT EXECUTE ON FUNCTION public.secure_moneyfusion_credit_v2(uuid, text, text) TO service_role;
