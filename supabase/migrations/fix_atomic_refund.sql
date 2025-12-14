-- ========================================================================
-- FIX: Améliorer atomic_refund pour supporter le refund sans activation
-- ========================================================================
-- Problème: Quand l'appel API échoue AVANT la création de l'activation,
-- on ne peut pas passer p_activation_id car elle n'existe pas encore.
-- Solution: Ajouter p_amount optionnel pour ce cas.
-- ========================================================================

CREATE OR REPLACE FUNCTION atomic_refund(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_amount DECIMAL DEFAULT NULL  -- NEW: Montant direct (utilisé quand activation pas encore créée)
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_frozen_amount DECIMAL;
  v_refund DECIMAL;
  v_new_balance DECIMAL;
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
  
  -- 2. GET frozen_amount FROM ACTIVATION, RENTAL, TRANSACTION, OR DIRECT AMOUNT
  IF p_activation_id IS NOT NULL THEN
    -- Récupérer depuis l'activation
    SELECT frozen_amount INTO v_frozen_amount
    FROM activations
    WHERE id = p_activation_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Activation not found: %', p_activation_id;
    END IF;
    
  ELSIF p_rental_id IS NOT NULL THEN
    -- Récupérer depuis la location
    SELECT frozen_amount INTO v_frozen_amount
    FROM rentals
    WHERE id = p_rental_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Rental not found: %', p_rental_id;
    END IF;
    
  ELSIF p_amount IS NOT NULL AND p_amount > 0 THEN
    -- Utiliser le montant direct fourni
    v_frozen_amount := p_amount;
    
  ELSIF p_transaction_id IS NOT NULL THEN
    -- Fallback: Récupérer le montant depuis la transaction
    SELECT ABS(amount) INTO v_frozen_amount
    FROM transactions
    WHERE id = p_transaction_id;
    
    IF NOT FOUND OR v_frozen_amount IS NULL THEN
      -- Dernier recours: utiliser tout le frozen_balance
      v_frozen_amount := v_user.frozen_balance;
    END IF;
  ELSE
    RAISE EXCEPTION 'Either activation_id, rental_id, p_amount, or transaction_id must be provided';
  END IF;
  
  -- Safety check
  IF v_frozen_amount IS NULL OR v_frozen_amount <= 0 THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Nothing to refund',
      'refunded', 0,
      'balance', v_user.balance,
      'frozen', v_user.frozen_balance
    );
  END IF;
  
  -- 3. CALCULATE REFUND (sécurisé: min entre frozen_amount et frozen_balance)
  v_refund := LEAST(v_frozen_amount, v_user.frozen_balance);
  v_new_balance := v_user.balance + v_refund;
  v_new_frozen := GREATEST(0, v_user.frozen_balance - v_refund);
  
  -- 4. UPDATE USER (UNFREEZE + REFUND)
  UPDATE users
  SET 
    balance = v_new_balance,
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 5. RESET frozen_amount AND UPDATE STATUS (if applicable)
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET 
      frozen_amount = 0,
      status = CASE 
        WHEN status IN ('pending', 'waiting', 'active') THEN 'cancelled'
        ELSE status 
      END,
      updated_at = NOW()
    WHERE id = p_activation_id;
  END IF;
  
  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET 
      frozen_amount = 0,
      status = CASE 
        WHEN status = 'active' THEN 'cancelled'
        ELSE status 
      END,
      updated_at = NOW()
    WHERE id = p_rental_id;
  END IF;
  
  -- 6. UPDATE TRANSACTION
  IF p_transaction_id IS NOT NULL THEN
    UPDATE transactions
    SET status = 'refunded', updated_at = NOW()
    WHERE id = p_transaction_id AND status = 'pending';
  END IF;
  
  -- 7. LOG OPERATION
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
    'refund', 
    v_refund,
    v_user.balance, 
    v_new_balance,
    v_user.frozen_balance, 
    v_new_frozen,
    COALESCE(p_reason, 'Refund for cancelled/expired activation')
  );
  
  -- 8. RETURN RESULT
  RETURN json_build_object(
    'success', true,
    'refunded', v_refund,
    'balance_before', v_user.balance,
    'balance_after', v_new_balance,
    'frozen_before', v_user.frozen_balance,
    'frozen_after', v_new_frozen
  );
END;
$$ LANGUAGE plpgsql;
