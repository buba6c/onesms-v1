-- Process SMS reception atomically (update activation, commit funds, complete transaction)
CREATE OR REPLACE FUNCTION process_sms_received(
  p_order_id TEXT,
  p_code TEXT,
  p_text TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'unknown'
) RETURNS JSONB AS $$
DECLARE
  v_activation activations%ROWTYPE;
  v_tx transactions%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_sms_text TEXT;ALTER TABLE rentals ADD COLUMN IF NOT EXISTS charged boolean DEFAULT false;
-- Backfill simple
UPDATE rentals
SET charged = CASE
  WHEN status IN ('finished','completed') THEN true
  WHEN status IN ('cancelled','expired') THEN false
  ELSE false
END;
  v_commit JSONB;
BEGIN
  -- 1) Lock activation by order_id
  SELECT * INTO v_activation
  FROM activations
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'activation_not_found', 'order_id', p_order_id);
  END IF;

  -- 2) Idempotence with retry: if already received but not charged or still frozen, we still proceed to commit.
  IF v_activation.status = 'received' THEN
    IF COALESCE(v_activation.charged, false) = true AND COALESCE(v_activation.frozen_amount, 0) <= 0 THEN
      RETURN jsonb_build_object('success', true, 'idempotent', true, 'activation_id', v_activation.id);
    END IF;
    -- else keep going to force the missing commit/cleanup
  END IF;

  -- 3) Prepare SMS text
  v_sms_text := COALESCE(p_text, v_activation.sms_text, format('Votre code de validation est %s', p_code));

  -- 4) Update activation with SMS (set received if not already, also fill missing sms_received_at)
  UPDATE activations
  SET
    status = 'received',
    sms_code = p_code,
    sms_text = v_sms_text,
    sms_received_at = COALESCE(v_activation.sms_received_at, v_now),
    updated_at = v_now
  WHERE id = v_activation.id;

  -- 5) Fetch pending transaction if any
  SELECT * INTO v_tx
  FROM transactions
  WHERE related_activation_id = v_activation.id
    AND status = 'pending'
  LIMIT 1;

  -- 6) Commit funds atomically via guard-safe path (links transaction if present)
  SELECT secure_unfreeze_balance(
    p_user_id := v_activation.user_id,
    p_activation_id := v_activation.id,
    p_rental_id := NULL,
    p_refund_to_balance := false,
    p_refund_reason := CONCAT('SMS received (', p_source, ')')
  ) INTO v_commit;

  IF COALESCE(v_commit ->> 'success', 'false') <> 'true' THEN
    RAISE EXCEPTION 'secure_unfreeze_balance failed: %', v_commit;
  END IF;

  -- 7) Mark transaction completed if it was pending
  IF v_tx.id IS NOT NULL THEN
    UPDATE transactions
    SET status = 'completed', updated_at = v_now
    WHERE id = v_tx.id AND status = 'pending';
  END IF;

  -- 8) Return result
  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'activation_id', v_activation.id,
    'code', p_code,
    'source', p_source,
    'commit', v_commit
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'order_id', p_order_id
  );
END;
$$ LANGUAGE plpgsql;
