-- ============================================================================
-- FONCTION POUR CRÉDITER LE WALLET D'UN UTILISATEUR
-- ============================================================================

CREATE OR REPLACE FUNCTION credit_user_wallet(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_operation_id UUID;
BEGIN
  -- 1. Récupérer le solde actuel
  SELECT balance INTO v_current_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE; -- Lock la ligne pour éviter les race conditions

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- 2. Calculer le nouveau solde
  v_new_balance := v_current_balance + p_amount;

  -- 3. Mettre à jour le solde
  UPDATE users
  SET 
    balance = v_new_balance,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 4. Créer l'opération de balance
  INSERT INTO balance_operations (
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    description,
    metadata
  ) VALUES (
    p_user_id,
    'credit',
    p_amount,
    v_current_balance,
    v_new_balance,
    COALESCE(p_description, 'Crédit wallet'),
    p_metadata
  )
  RETURNING id INTO v_operation_id;

  -- 5. Retourner le résultat
  RETURN jsonb_build_object(
    'success', true,
    'operation_id', v_operation_id,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'credited_amount', p_amount
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error crediting wallet: %', SQLERRM;
END;
$$;

-- Commentaire
COMMENT ON FUNCTION credit_user_wallet IS 'Crédite le wallet d\'un utilisateur de manière atomique et thread-safe';

-- Exemple d'utilisation
-- SELECT credit_user_wallet(
--   'user-uuid',
--   10,
--   'Validation paiement Wave - 5000 FCFA',
--   '{"transaction_id": "tx-123", "payment_method": "wave"}'::jsonb
-- );
