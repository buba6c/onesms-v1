-- Idempotent payout for referral bonuses (parrain/filleul)
CREATE OR REPLACE FUNCTION public.secure_referral_payout(
  p_referral_id uuid,
  p_bonus_referrer numeric,
  p_bonus_referee numeric,
  p_reason text default 'referral_bonus'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref referrals%rowtype;
  v_now timestamptz := now();
  v_referrer_balance numeric;
  v_referrer_frozen numeric;
  v_referee_balance numeric;
  v_referee_frozen numeric;
BEGIN
  SELECT * INTO v_ref
  FROM referrals
  WHERE id = p_referral_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'referral % not found', p_referral_id USING errcode = 'P0002';
  END IF;

  IF v_ref.status = 'rewarded' THEN
    RETURN jsonb_build_object('status', 'noop', 'reason', 'already_rewarded');
  END IF;

  IF v_ref.referee_id IS NULL THEN
    RAISE EXCEPTION 'referee missing on referral %', p_referral_id USING errcode = 'P0003';
  END IF;

  -- Credit referee
  SELECT balance, frozen_balance INTO v_referee_balance, v_referee_frozen
  FROM users WHERE id = v_ref.referee_id FOR UPDATE;

  v_referee_balance := coalesce(v_referee_balance, 0) + coalesce(p_bonus_referee, 0);

  INSERT INTO balance_operations(
    user_id, related_transaction_id, operation_type, amount,
    balance_before, balance_after, frozen_before, frozen_after,
    reason, metadata, created_at
  ) VALUES (
    v_ref.referee_id, NULL, 'credit_admin', coalesce(p_bonus_referee, 0),
    coalesce(v_referee_balance, 0) - coalesce(p_bonus_referee, 0), v_referee_balance,
    coalesce(v_referee_frozen, 0), coalesce(v_referee_frozen, 0),
    p_reason,
    jsonb_build_object('source', 'referral_bonus', 'referral_id', p_referral_id),
    v_now
  );

  UPDATE users
    SET balance = v_referee_balance,
        updated_at = v_now
    WHERE id = v_ref.referee_id;

  -- Credit referrer if present
  IF v_ref.referrer_id IS NOT NULL AND coalesce(p_bonus_referrer, 0) > 0 THEN
    SELECT balance, frozen_balance INTO v_referrer_balance, v_referrer_frozen
    FROM users WHERE id = v_ref.referrer_id FOR UPDATE;

    v_referrer_balance := coalesce(v_referrer_balance, 0) + coalesce(p_bonus_referrer, 0);

    INSERT INTO balance_operations(
      user_id, related_transaction_id, operation_type, amount,
      balance_before, balance_after, frozen_before, frozen_after,
      reason, metadata, created_at
    ) VALUES (
      v_ref.referrer_id, NULL, 'credit_admin', coalesce(p_bonus_referrer, 0),
      coalesce(v_referrer_balance, 0) - coalesce(p_bonus_referrer, 0), v_referrer_balance,
      coalesce(v_referrer_frozen, 0), coalesce(v_referrer_frozen, 0),
      p_reason,
      jsonb_build_object('source', 'referral_bonus', 'referral_id', p_referral_id),
      v_now
    );

    UPDATE users
      SET balance = v_referrer_balance,
          updated_at = v_now
      WHERE id = v_ref.referrer_id;
  END IF;

  -- Log transactions for visibility in admin (idempotent because function returns noop when already rewarded)
  IF coalesce(p_bonus_referee, 0) > 0 THEN
    INSERT INTO transactions(
      user_id, type, amount, status, description, reference, metadata, created_at
    ) VALUES (
      v_ref.referee_id,
      'referral_bonus',
      p_bonus_referee,
      'completed',
      'Bonus parrainage (filleul)',
      concat('REF-', p_referral_id, '-REFEREE'),
      jsonb_build_object('referral_id', p_referral_id, 'role', 'referee'),
      v_now
    )
    ON CONFLICT (reference) DO NOTHING;
  END IF;

  IF v_ref.referrer_id IS NOT NULL AND coalesce(p_bonus_referrer, 0) > 0 THEN
    INSERT INTO transactions(
      user_id, type, amount, status, description, reference, metadata, created_at
    ) VALUES (
      v_ref.referrer_id,
      'referral_bonus',
      p_bonus_referrer,
      'completed',
      'Bonus parrainage (parrain)',
      concat('REF-', p_referral_id, '-REFERRER'),
      jsonb_build_object('referral_id', p_referral_id, 'role', 'referrer'),
      v_now
    )
    ON CONFLICT (reference) DO NOTHING;
  END IF;

  UPDATE referrals
    SET status = 'rewarded',
        rewarded_at = v_now,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'payout_reason', p_reason,
          'bonus_referrer', coalesce(p_bonus_referrer, 0),
          'bonus_referee', coalesce(p_bonus_referee, 0)
        )
    WHERE id = p_referral_id;

  RETURN jsonb_build_object('status', 'rewarded', 'referral_id', p_referral_id);
END;
$$;

COMMENT ON FUNCTION public.secure_referral_payout(uuid, numeric, numeric, text) IS 'Crédite parrain/filleul de façon idempotente et marque le referral comme rewarded.';

GRANT EXECUTE ON FUNCTION public.secure_referral_payout(uuid, numeric, numeric, text) TO service_role;
