-- ========================================================================
-- FONCTION ADMIN: Ajouter des crédits (Model A)
-- ========================================================================
-- Utilisée par l'admin pour créditer un utilisateur
-- Model A: balance augmente directement (pas de frozen)
-- Log dans balance_operations + transactions
-- ========================================================================

CREATE OR REPLACE FUNCTION admin_add_credit(
  p_user_id UUID,
  p_amount DECIMAL,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
  v_caller UUID := auth.uid();
  v_claims JSON := NULL;
  v_role TEXT := NULL;
BEGIN
  -- Récupérer le rôle JWT si présent
  BEGIN
    v_claims := current_setting('request.jwt.claims', true)::json;
    v_role := COALESCE(v_claims->>'role', v_claims->>'role_name', NULL);
  EXCEPTION WHEN others THEN
    v_role := NULL;
  END;

  -- 🔒 Vérifier que l'appelant est un admin authentifié (via JWT) ou service_role
  -- ✅ Si role = 'service_role', autoriser (webhooks, scripts admin)
  IF v_role = 'service_role' OR current_user = 'service_role' THEN
    -- OK, appel avec SERVICE_ROLE_KEY ou rôle DB service_role
    NULL;
  ELSIF v_caller IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no authenticated user';
  ELSE
    -- Vérifier que l'utilisateur authentifié est admin
    PERFORM 1 FROM users WHERE id = v_caller AND role = 'admin';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;
  END IF;

  -- Validation
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive: %', p_amount;
  END IF;
  
  -- 1. LOCK USER et lire balance actuel
  SELECT id, balance, frozen_balance, email
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- 2. CALCULATE NEW BALANCE
  v_new_balance := v_user.balance + p_amount;
  
  -- 3. LOG dans balance_operations AVANT l'update user (satisfait users_balance_guard)
  INSERT INTO balance_operations (
    user_id,
    operation_type,
    amount,
    balance_before,
    balance_after,
    frozen_before,
    frozen_after,
    reason
  ) VALUES (
    p_user_id,
    'credit_admin',
    p_amount,
    v_user.balance,
    v_new_balance,
    v_user.frozen_balance,
    v_user.frozen_balance,
    COALESCE(p_admin_note, 'Crédit ajouté par admin')
  );
  
  -- 4. UPDATE USER BALANCE (users_balance_guard vérifie la ligne ci-dessus)
  UPDATE users
  SET 
    balance = v_new_balance,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 5. CREATE TRANSACTION LOG
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    status,
    payment_method,
    balance_before,
    balance_after,
    description
  ) VALUES (
    p_user_id,
    'credit',
    p_amount,
    'completed',
    'bonus',  -- 'bonus' car 'admin' n'est pas autorisé par la contrainte
    v_user.balance,
    v_new_balance,
    COALESCE(p_admin_note, 'Crédit ajouté par admin')
  )
  RETURNING id INTO v_transaction_id;
  
  -- 6. RETURN RESULT
  RETURN json_build_object(
    'success', true,
    'amount_added', p_amount,
    'balance_before', v_user.balance,
    'balance_after', v_new_balance,
    'frozen', v_user.frozen_balance,
    'transaction_id', v_transaction_id,
    'user_email', v_user.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions (seulement service_role pour admin)
REVOKE ALL ON FUNCTION admin_add_credit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_add_credit TO authenticated;
GRANT EXECUTE ON FUNCTION admin_add_credit TO service_role;

-- Commentaire
COMMENT ON FUNCTION admin_add_credit IS 'Admin function to add credits to user balance (Model A) with full logging';
