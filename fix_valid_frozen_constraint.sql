-- ========================================================================
-- FIX CRITIQUE: Corriger la contrainte valid_frozen et atomic_freeze
-- ========================================================================
-- PROBLÈME: La contrainte exige frozen_after <= balance_after
-- Mais atomic_freeze fait: balance -= amount, frozen += amount
-- Résultat: Si balance=25, frozen=6, et on freeze 12:
--   balance_after = 13, frozen_after = 18 → 18 > 13 = VIOLATION!
--
-- SOLUTION: Le freeze ne doit PAS modifier balance, seulement frozen
-- La balance est modifiée au COMMIT (quand l'activation réussit)
-- ========================================================================

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE balance_operations DROP CONSTRAINT IF EXISTS valid_freeze_op;

-- 2. Recréer la contrainte avec la bonne logique
-- Freeze: balance reste INCHANGÉE, frozen augmente
-- Commit: balance diminue, frozen diminue
-- Refund: balance reste INCHANGÉE, frozen diminue
ALTER TABLE balance_operations ADD CONSTRAINT valid_freeze_op CHECK (
  (operation_type = 'freeze' AND balance_after = balance_before AND frozen_after = frozen_before + amount)
  OR
  (operation_type = 'commit' AND balance_after = balance_before - amount AND frozen_after = frozen_before - amount)
  OR
  (operation_type = 'refund' AND balance_after = balance_before AND frozen_after = frozen_before - amount)
  OR
  (operation_type = 'credit_admin' AND balance_after = balance_before + amount AND frozen_after = frozen_before)
);

-- 3. Corriger atomic_freeze pour NE PAS modifier la balance
DROP FUNCTION IF EXISTS atomic_freeze(uuid, decimal, uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS atomic_freeze(uuid, numeric, uuid, uuid, uuid, text);

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
  v_activation_updated INTEGER := 0;
  v_rental_updated INTEGER := 0;
BEGIN
  -- Validation
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive: %', p_amount;
  END IF;
  
  -- 1. LOCK USER
  SELECT balance, frozen_balance
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- 2. CHECK AVAILABLE BALANCE (balance - frozen)
  v_available := v_user.balance - v_user.frozen_balance;
  IF v_available < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: % available, % required', v_available, p_amount;
  END IF;
  
  -- 3. CALCULATE NEW FROZEN (balance reste inchangée!)
  v_new_frozen := v_user.frozen_balance + p_amount;
  
  -- 4. UPDATE USER (seulement frozen_balance, pas balance!)
  UPDATE users
  SET 
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 5. UPDATE ACTIVATION/RENTAL frozen_amount
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET frozen_amount = p_amount, updated_at = NOW()
    WHERE id = p_activation_id;
    
    GET DIAGNOSTICS v_activation_updated = ROW_COUNT;
  END IF;
  
  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET frozen_amount = p_amount, updated_at = NOW()
    WHERE id = p_rental_id;
    
    GET DIAGNOSTICS v_rental_updated = ROW_COUNT;
  END IF;
  
  -- 6. LOG OPERATION (balance reste inchangée)
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
    v_user.balance,       -- balance_before
    v_user.balance,       -- balance_after = même valeur!
    v_user.frozen_balance, 
    v_new_frozen,
    COALESCE(p_reason, 'Credits frozen for purchase')
  );
  
  -- 7. RETURN RESULT
  RETURN json_build_object(
    'success', true,
    'frozen', p_amount,
    'balance', v_user.balance,  -- Inchangé
    'frozen_before', v_user.frozen_balance,
    'frozen_after', v_new_frozen,
    'available_after', v_user.balance - v_new_frozen,
    'activation_updated', v_activation_updated > 0,
    'rental_updated', v_rental_updated > 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Corriger atomic_commit pour débiter la balance
DROP FUNCTION IF EXISTS atomic_commit(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION atomic_commit(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_amount DECIMAL;
  v_new_balance DECIMAL;
  v_new_frozen DECIMAL;
BEGIN
  -- 1. Déterminer le montant à commit
  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_amount FROM activations WHERE id = p_activation_id;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_amount FROM rentals WHERE id = p_rental_id;
  ELSE
    RAISE EXCEPTION 'activation_id or rental_id required';
  END IF;
  
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'No frozen amount found';
  END IF;
  
  -- 2. LOCK USER
  SELECT balance, frozen_balance
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- 3. CALCULATE NEW VALUES (maintenant on déduit la balance)
  v_new_balance := v_user.balance - v_amount;
  v_new_frozen := v_user.frozen_balance - v_amount;
  
  -- Validation
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Balance would go negative: %', v_new_balance;
  END IF;
  IF v_new_frozen < 0 THEN
    v_new_frozen := 0; -- Safety
  END IF;
  
  -- 4. UPDATE USER
  UPDATE users
  SET 
    balance = v_new_balance,
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 5. CLEAR frozen_amount on activation/rental
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations SET frozen_amount = 0, updated_at = NOW() WHERE id = p_activation_id;
  END IF;
  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals SET frozen_amount = 0, updated_at = NOW() WHERE id = p_rental_id;
  END IF;
  
  -- 6. LOG OPERATION
  INSERT INTO balance_operations (
    user_id, 
    activation_id,
    rental_id,
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
    'commit', 
    v_amount,
    v_user.balance, 
    v_new_balance,
    v_user.frozen_balance, 
    v_new_frozen,
    'Payment committed'
  );
  
  RETURN json_build_object(
    'success', true,
    'committed', v_amount,
    'balance_before', v_user.balance,
    'balance_after', v_new_balance,
    'frozen_before', v_user.frozen_balance,
    'frozen_after', v_new_frozen
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Corriger atomic_refund (balance reste inchangée, frozen diminue)
DROP FUNCTION IF EXISTS atomic_refund(uuid, uuid, uuid, text);

CREATE OR REPLACE FUNCTION atomic_refund(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_amount DECIMAL;
  v_new_frozen DECIMAL;
BEGIN
  -- 1. Déterminer le montant à refund
  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_amount FROM activations WHERE id = p_activation_id;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_amount FROM rentals WHERE id = p_rental_id;
  ELSE
    RAISE EXCEPTION 'activation_id or rental_id required';
  END IF;
  
  IF v_amount IS NULL OR v_amount <= 0 THEN
    -- Déjà remboursé ou pas de montant gelé
    RETURN json_build_object('success', true, 'refunded', 0, 'message', 'Nothing to refund');
  END IF;
  
  -- 2. LOCK USER
  SELECT balance, frozen_balance
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- 3. CALCULATE (balance inchangée, frozen diminue)
  v_new_frozen := GREATEST(0, v_user.frozen_balance - v_amount);
  
  -- 4. UPDATE USER (balance reste la même!)
  UPDATE users
  SET 
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 5. CLEAR frozen_amount
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations SET frozen_amount = 0, updated_at = NOW() WHERE id = p_activation_id;
  END IF;
  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals SET frozen_amount = 0, updated_at = NOW() WHERE id = p_rental_id;
  END IF;
  
  -- 6. LOG
  INSERT INTO balance_operations (
    user_id, 
    activation_id,
    rental_id,
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
    'refund', 
    v_amount,
    v_user.balance, 
    v_user.balance,  -- Balance inchangée!
    v_user.frozen_balance, 
    v_new_frozen,
    COALESCE(p_reason, 'Frozen credits released')
  );
  
  RETURN json_build_object(
    'success', true,
    'refunded', v_amount,
    'balance', v_user.balance,  -- Inchangé
    'frozen_before', v_user.frozen_balance,
    'frozen_after', v_new_frozen,
    'available_after', v_user.balance - v_new_frozen
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Accorder les permissions
GRANT EXECUTE ON FUNCTION atomic_freeze TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION atomic_commit TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION atomic_refund TO service_role, authenticated;

-- 7. Commentaires
COMMENT ON FUNCTION atomic_freeze IS 'Gèle des crédits. Balance INCHANGÉE, frozen augmente.';
COMMENT ON FUNCTION atomic_commit IS 'Confirme le paiement. Balance DIMINUE, frozen diminue.';
COMMENT ON FUNCTION atomic_refund IS 'Libère les crédits gelés. Balance INCHANGÉE, frozen diminue.';
