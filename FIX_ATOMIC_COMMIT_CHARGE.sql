-- ============================================================================
-- CORRECTION ATOMIC_COMMIT: DOIT CHARGER LA BALANCE, PAS REFUND
-- Date: 2025-12-03
-- Problème: atomic_commit() ne diminue pas la balance, seulement frozen_balance
-- Solution: Corriger pour faire un vrai COMMIT (balance ET frozen diminuent)
-- ============================================================================

-- 1. DROP et recréer atomic_commit avec la bonne logique
DROP FUNCTION IF EXISTS atomic_commit CASCADE;

CREATE OR REPLACE FUNCTION atomic_commit(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Service completed'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_frozen_amount DECIMAL := 0;
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

  IF v_frozen_amount <= 0 THEN
    RETURN json_build_object('success', true, 'idempotent', true);
  END IF;

  -- ✅ COMMIT = CHARGE: Diminuer balance ET frozen_balance
  UPDATE users
  SET 
    balance = GREATEST(0, balance - v_frozen_amount),
    frozen_balance = GREATEST(0, frozen_balance - v_frozen_amount),
    updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO balance_operations (
    user_id, activation_id, rental_id, operation_type, amount,
    balance_before, balance_after, frozen_before, frozen_after, reason
  ) VALUES (
    p_user_id, p_activation_id, p_rental_id, 'commit', v_frozen_amount,
    v_user.balance, GREATEST(0, v_user.balance - v_frozen_amount),
    v_user.frozen_balance, GREATEST(0, v_user.frozen_balance - v_frozen_amount),
    p_reason
  );

  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET frozen_amount = 0, charged = true, updated_at = NOW()
    WHERE id = p_activation_id;
  END IF;

  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET frozen_amount = 0, charged = true, updated_at = NOW()
    WHERE id = p_rental_id;
  END IF;

  RETURN json_build_object('success', true, 'committed', v_frozen_amount);
END;
$$;

-- 2. Remettre les permissions
GRANT EXECUTE ON FUNCTION atomic_commit TO service_role, authenticated;

-- 3. Vérification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'atomic_commit') THEN
    RAISE NOTICE '✅ atomic_commit corrigée et déployée';
  ELSE
    RAISE EXCEPTION '❌ atomic_commit manquante';
  END IF;
END $$;

SELECT 'atomic_commit corrigée: balance ET frozen_balance diminuent lors du commit' AS status;
