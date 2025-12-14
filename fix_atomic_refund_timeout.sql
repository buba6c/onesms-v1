-- ═══════════════════════════════════════════════════════════════
-- FIX: atomic_refund ne convertit pas "timeout" en "refunded"
-- DATE: 2025-12-02
-- ═══════════════════════════════════════════════════════════════

-- ÉTAPE 1: Supprimer TOUTES les versions de atomic_refund
DROP FUNCTION IF EXISTS atomic_refund(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS atomic_refund(UUID, UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS atomic_refund(UUID, UUID, UUID, UUID, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS atomic_refund(UUID, UUID, UUID, UUID, TEXT, NUMERIC);

-- ÉTAPE 2: Créer la version UNIQUE et CORRECTE
CREATE OR REPLACE FUNCTION atomic_refund(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_amount DECIMAL DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_frozen_amount DECIMAL := 0;
  v_refund DECIMAL;
  v_new_balance DECIMAL;
  v_new_frozen DECIMAL;
BEGIN
  -- ══════════════════════════════════════════════════════════════
  -- IDEMPOTENCE CHECK: Vérifier si déjà remboursé via activation/rental
  -- ══════════════════════════════════════════════════════════════
  
  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM activations
    WHERE id = p_activation_id
    FOR UPDATE SKIP LOCKED;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Activation not found or locked',
        'refunded', 0
      );
    END IF;
    
    -- ✅ IDEMPOTENCE: Si frozen_amount = 0, déjà remboursé
    IF COALESCE(v_frozen_amount, 0) <= 0 THEN
      RETURN json_build_object(
        'success', true,
        'message', 'Already refunded (frozen_amount=0)',
        'refunded', 0,
        'idempotent', true
      );
    END IF;
    
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM rentals
    WHERE id = p_rental_id
    FOR UPDATE SKIP LOCKED;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Rental not found or locked',
        'refunded', 0
      );
    END IF;
    
    IF COALESCE(v_frozen_amount, 0) <= 0 THEN
      RETURN json_build_object(
        'success', true,
        'message', 'Already refunded (frozen_amount=0)',
        'refunded', 0,
        'idempotent', true
      );
    END IF;
    
  ELSIF p_amount IS NOT NULL AND p_amount > 0 THEN
    v_frozen_amount := p_amount;
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Either activation_id, rental_id, or amount must be provided',
      'refunded', 0
    );
  END IF;

  -- ══════════════════════════════════════════════════════════════
  -- LOCK USER pour éviter les race conditions
  -- ══════════════════════════════════════════════════════════════
  
  SELECT balance, frozen_balance
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found',
      'refunded', 0
    );
  END IF;
  
  -- ══════════════════════════════════════════════════════════════
  -- CALCUL SÉCURISÉ: Min entre frozen_amount et frozen_balance
  -- ══════════════════════════════════════════════════════════════
  
  v_refund := LEAST(v_frozen_amount, COALESCE(v_user.frozen_balance, 0));
  
  IF v_refund <= 0 THEN
    IF p_activation_id IS NOT NULL THEN
      UPDATE activations SET frozen_amount = 0, status = 'refunded', updated_at = NOW() WHERE id = p_activation_id;
    END IF;
    IF p_rental_id IS NOT NULL THEN
      UPDATE rentals SET frozen_amount = 0, status = 'cancelled', updated_at = NOW() WHERE id = p_rental_id;
    END IF;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Nothing to refund (frozen_balance=0)',
      'refunded', 0
    );
  END IF;
  
  v_new_balance := v_user.balance + v_refund;
  v_new_frozen := GREATEST(0, v_user.frozen_balance - v_refund);
  
  -- ══════════════════════════════════════════════════════════════
  -- UPDATE USER (unfreeze + add to balance)
  -- ══════════════════════════════════════════════════════════════
  
  UPDATE users
  SET 
    balance = v_new_balance,
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- ══════════════════════════════════════════════════════════════
  -- RESET frozen_amount sur activation/rental (ATOMIQUE)
  -- ✅ FIX: Ajouter 'timeout' dans la liste des status à convertir
  -- ══════════════════════════════════════════════════════════════
  
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET 
      frozen_amount = 0,
      status = CASE 
        -- ✅ FIX: timeout ajouté à la liste
        WHEN status IN ('pending', 'waiting', 'active', 'timeout') THEN 'refunded'
        ELSE status 
      END,
      updated_at = NOW()
    WHERE id = p_activation_id
      AND frozen_amount > 0;
  END IF;
  
  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET 
      frozen_amount = 0,
      status = CASE WHEN status = 'active' THEN 'cancelled' ELSE status END,
      updated_at = NOW()
    WHERE id = p_rental_id
      AND frozen_amount > 0;
  END IF;
  
  -- ══════════════════════════════════════════════════════════════
  -- LOG OPERATION
  -- ══════════════════════════════════════════════════════════════
  
  IF NOT EXISTS (
    SELECT 1 FROM balance_operations 
    WHERE user_id = p_user_id 
      AND activation_id = p_activation_id 
      AND operation_type = 'refund'
      AND created_at > NOW() - INTERVAL '2 seconds'
  ) THEN
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
      COALESCE(p_reason, 'Credits refunded (atomic)')
    );
  END IF;
  
  -- ══════════════════════════════════════════════════════════════
  -- RETURN SUCCESS
  -- ══════════════════════════════════════════════════════════════
  
  RETURN json_build_object(
    'success', true,
    'refunded', v_refund,
    'balance_before', v_user.balance,
    'balance_after', v_new_balance,
    'frozen_before', v_user.frozen_balance,
    'frozen_after', v_new_frozen
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION atomic_refund TO service_role, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 3: Vérification
-- ═══════════════════════════════════════════════════════════════
SELECT 
  routine_name,
  specific_name
FROM information_schema.routines 
WHERE routine_name = 'atomic_refund' 
  AND routine_schema = 'public';
