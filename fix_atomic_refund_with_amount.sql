-- =====================================================
-- FIX CRITIQUE: atomic_refund avec p_amount
-- =====================================================
-- Le problème: atomic_refund exige activation_id ou rental_id
-- Mais quand l'achat échoue AVANT création de l'activation,
-- on doit pouvoir rembourser avec juste le montant.
-- =====================================================

-- ÉTAPE 1: Corriger le frozen orphelin actuel
DO $$
DECLARE
  v_user_id UUID := 'e108c02a-2012-4043-bbc2-fb09bb11f824';
  v_current_balance DECIMAL;
  v_current_frozen DECIMAL;
  v_calculated_frozen DECIMAL;
  v_orphan_amount DECIMAL;
BEGIN
  -- Récupérer état actuel
  SELECT balance, frozen_balance INTO v_current_balance, v_current_frozen
  FROM users WHERE id = v_user_id;
  
  -- Calculer frozen réel basé sur activations pending
  SELECT COALESCE(SUM(frozen_amount), 0) INTO v_calculated_frozen
  FROM activations 
  WHERE user_id = v_user_id 
    AND status IN ('pending', 'active')
    AND frozen_amount > 0;
  
  v_orphan_amount := v_current_frozen - v_calculated_frozen;
  
  RAISE NOTICE 'État actuel: balance=%, frozen=%, frozen_calculé=%, orphelin=%',
    v_current_balance, v_current_frozen, v_calculated_frozen, v_orphan_amount;
  
  IF v_orphan_amount > 0 THEN
    -- Corriger: remettre le frozen orphelin dans la balance
    UPDATE users 
    SET 
      balance = balance + v_orphan_amount,
      frozen_balance = v_calculated_frozen,
      updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Logger l'opération
    INSERT INTO balance_operations (
      user_id, operation_type, amount,
      balance_before, balance_after, frozen_before, frozen_after, reason
    ) VALUES (
      v_user_id, 'refund', v_orphan_amount,
      v_current_balance, v_current_balance + v_orphan_amount,
      v_current_frozen, v_calculated_frozen,
      'Fix: orphan frozen refund (failed purchases without proper rollback)'
    );
    
    RAISE NOTICE '✅ Corrigé: % Ⓐ remboursé', v_orphan_amount;
  ELSE
    RAISE NOTICE 'Aucun frozen orphelin à corriger';
  END IF;
END $$;

-- ÉTAPE 2: Modifier atomic_refund pour accepter p_amount
CREATE OR REPLACE FUNCTION atomic_refund(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_amount DECIMAL DEFAULT NULL  -- NOUVEAU: montant direct si pas d'activation
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
  
  -- 2. GET frozen_amount FROM ACTIVATION OR RENTAL OR DIRECT AMOUNT
  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM activations
    WHERE id = p_activation_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Activation not found: %', p_activation_id;
    END IF;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM rentals
    WHERE id = p_rental_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Rental not found: %', p_rental_id;
    END IF;
  ELSIF p_amount IS NOT NULL AND p_amount > 0 THEN
    -- NOUVEAU: Utiliser le montant direct si fourni
    v_frozen_amount := p_amount;
  ELSE
    RAISE EXCEPTION 'Either activation_id, rental_id, or amount must be provided';
  END IF;
  
  -- 3. CALCULATE REFUND (sécurisé: min entre frozen_amount et frozen_balance)
  v_refund := LEAST(v_frozen_amount, v_user.frozen_balance);
  
  IF v_refund <= 0 THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Nothing to refund',
      'refunded', 0
    );
  END IF;
  
  v_new_balance := v_user.balance + v_refund;
  v_new_frozen := GREATEST(0, v_user.frozen_balance - v_refund);
  
  -- 4. UPDATE USER (UNFREEZE + REFUND)
  UPDATE users
  SET 
    balance = v_new_balance,
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 5. RESET frozen_amount AND UPDATE STATUS (si activation/rental fourni)
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
  
  -- 6. LOG OPERATION
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
    COALESCE(p_reason, 'Credits refunded')
  );
  
  -- 7. RETURN RESULT
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

-- ÉTAPE 3: Vérifier le résultat
SELECT 
  balance, 
  frozen_balance,
  balance - frozen_balance as available
FROM users 
WHERE id = 'e108c02a-2012-4043-bbc2-fb09bb11f824';
