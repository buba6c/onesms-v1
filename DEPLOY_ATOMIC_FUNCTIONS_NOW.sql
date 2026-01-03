-- DÉPLOIEMENT URGENT: Fonctions RPC Atomiques pour Grizzly
-- Exécutez ce script dans Supabase SQL Editor

-- ===============================================================================
-- 1️⃣ CRÉER ALIAS: atomic_complete_activation → atomic_commit
-- ===============================================================================
-- Les Edge Functions appellent atomic_complete_activation,
-- mais la fonction s'appelle atomic_commit dans la DB

CREATE OR REPLACE FUNCTION atomic_complete_activation(
  p_activation_id UUID,
  p_sms_code TEXT DEFAULT NULL,
  p_sms_text TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- 1. Récupérer user_id depuis l'activation
  SELECT user_id INTO v_user_id
  FROM activations
  WHERE id = p_activation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activation not found: %', p_activation_id;
  END IF;
  
  -- 2. Mettre à jour le SMS code/text d'abord
  UPDATE activations
  SET 
    sms_code = p_sms_code,
    sms_text = p_sms_text
  WHERE id = p_activation_id;
  
  -- 3. Appeler atomic_commit
  SELECT atomic_commit(
    v_user_id,
    p_activation_id,
    NULL, -- rental_id
    NULL, -- transaction_id
    'SMS received - activation complete'
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION atomic_complete_activation IS 
'Wrapper for atomic_commit - called by check-*-status Edge Functions';

-- ===============================================================================
-- 2️⃣ DÉPLOYER atomic_commit (si pas encore fait)
-- ===============================================================================
CREATE OR REPLACE FUNCTION atomic_commit(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_frozen_amount DECIMAL;
  v_commit DECIMAL;
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
  
  -- 2. GET frozen_amount
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
  ELSE
    RAISE EXCEPTION 'activation_id or rental_id required';
  END IF;
  
  -- 3. IDEMPOTENCE
  IF v_frozen_amount <= 0 THEN
    RETURN json_build_object(
      'success', true,
      'idempotent', true,
      'message', 'Already committed'
    );
  END IF;
  
  -- 4. CALCULATE (balance ET frozen diminuent)
  v_commit := LEAST(v_frozen_amount, v_user.frozen_balance);
  v_new_balance := GREATEST(0, v_user.balance - v_commit);
  v_new_frozen := GREATEST(0, v_user.frozen_balance - v_commit);
  
  -- 5. UPDATE USER
  UPDATE users
  SET 
    balance = v_new_balance,
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 6. UPDATE ACTIVATION
  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET 
      frozen_amount = 0,
      charged = true,
      status = 'received',
      updated_at = NOW()
    WHERE id = p_activation_id;
  END IF;
  
  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET 
      frozen_amount = 0,
      charged = true,
      updated_at = NOW()
    WHERE id = p_rental_id;
  END IF;
  
  -- 7. UPDATE TRANSACTION
  IF p_transaction_id IS NOT NULL THEN
    UPDATE transactions
    SET status = 'completed', updated_at = NOW()
    WHERE id = p_transaction_id;
  END IF;
  
  -- 8. LOG OPERATION
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
    v_commit,
    v_user.balance,
    v_new_balance,
    v_user.frozen_balance, 
    v_new_frozen,
    COALESCE(p_reason, 'Payment committed')
  );
  
  -- 9. RETURN
  RETURN json_build_object(
    'success', true,
    'committed', v_commit,
    'balance_after', v_new_balance,
    'frozen_after', v_new_frozen
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================================================
-- 3️⃣ DÉPLOYER atomic_refund (si pas encore fait)
-- ===============================================================================
-- (Code déjà dans fix_atomic_refund.sql - lignes 9-170)
-- Si la fonction atomic_refund n'existe pas, exécutez fix_atomic_refund.sql

-- ===============================================================================
-- 4️⃣ PERMISSIONS
-- ===============================================================================
GRANT EXECUTE ON FUNCTION atomic_complete_activation TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION atomic_commit TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION atomic_refund TO authenticated, service_role, anon;

-- ===============================================================================
-- 5️⃣ VÉRIFICATION
-- ===============================================================================
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as parameters
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('atomic_complete_activation', 'atomic_commit', 'atomic_refund')
ORDER BY proname;

-- Résultat attendu: 3 lignes
