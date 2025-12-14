-- ========================================================================
-- FIX URGENT: atomic_refund_direct avec nettoyage des frozen_amount orphelins
-- ========================================================================
-- PROBLÈME IDENTIFIÉ: 
-- atomic_refund_direct libère frozen_balance mais laisse les frozen_amount
-- → Résultat: incohérence frozen_balance != sum(frozen_amount)
--
-- SOLUTION:
-- Modifier atomic_refund_direct pour nettoyer les frozen_amount orphelins
-- du même utilisateur lors du refund_direct
-- ========================================================================

CREATE OR REPLACE FUNCTION atomic_refund_direct(
  p_user_id UUID,
  p_amount DECIMAL,
  p_transaction_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_amount_to_refund DECIMAL;
  v_new_frozen DECIMAL;
  v_orphaned_activations INTEGER;
  v_orphaned_rentals INTEGER;
  v_total_cleaned DECIMAL;
BEGIN
  -- Validation
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive: %', p_amount;
  END IF;
  
  -- 1. LOCK USER et lire les valeurs
  SELECT balance, frozen_balance
  INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- 2. CALCULATE REFUND (Model A)
  -- On ne peut pas refund plus que ce qui est frozen
  v_amount_to_refund := LEAST(p_amount, v_user.frozen_balance);
  v_new_frozen := GREATEST(0, v_user.frozen_balance - v_amount_to_refund);
  
  -- 3. ✨ NOUVEAU: NETTOYER LES frozen_amount ORPHELINS
  -- Rechercher et nettoyer les activations/rentals avec frozen_amount > 0
  -- pour cet utilisateur (probablement créés puis échoués)
  
  -- Nettoyer les activations orphelines
  UPDATE activations 
  SET 
    frozen_amount = 0,
    updated_at = NOW()
  WHERE user_id = p_user_id 
    AND frozen_amount > 0
    AND status IN ('pending', 'waiting', 'timeout', 'cancelled');
  
  GET DIAGNOSTICS v_orphaned_activations = ROW_COUNT;
  
  -- Nettoyer les rentals orphelins  
  UPDATE rentals
  SET 
    frozen_amount = 0,
    updated_at = NOW()
  WHERE user_id = p_user_id 
    AND frozen_amount > 0
    AND status IN ('active', 'cancelled', 'timeout');
    
  GET DIAGNOSTICS v_orphaned_rentals = ROW_COUNT;
  
  -- Calculer le total nettoyé (pour logging)
  SELECT COALESCE(SUM(frozen_amount), 0) INTO v_total_cleaned
  FROM (
    SELECT frozen_amount FROM activations 
    WHERE user_id = p_user_id AND frozen_amount > 0
    UNION ALL
    SELECT frozen_amount FROM rentals 
    WHERE user_id = p_user_id AND frozen_amount > 0
  ) t;
  
  -- 4. UPDATE USER (Model A: balance INCHANGÉ, frozen diminue)
  UPDATE users
  SET 
    frozen_balance = v_new_frozen,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 5. UPDATE TRANSACTION
  IF p_transaction_id IS NOT NULL THEN
    UPDATE transactions
    SET 
      status = 'refunded',
      balance_after = v_user.balance, -- balance inchangé
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'cleaned_activations', v_orphaned_activations,
        'cleaned_rentals', v_orphaned_rentals,
        'total_cleaned_amount', v_total_cleaned
      )
    WHERE id = p_transaction_id AND status = 'pending';
  END IF;
  
  -- 6. LOG OPERATION (Model A) avec info de nettoyage
  INSERT INTO balance_operations (
    user_id,
    related_transaction_id,
    operation_type,
    amount,
    balance_before,
    balance_after,
    frozen_before,
    frozen_after,
    reason,
    metadata
  ) VALUES (
    p_user_id,
    p_transaction_id,
    'refund',
    v_amount_to_refund,
    v_user.balance,
    v_user.balance, -- Model A: balance inchangé
    v_user.frozen_balance,
    v_new_frozen,
    COALESCE(p_reason, 'Refund - purchase failed before activation') || 
      CASE 
        WHEN (v_orphaned_activations + v_orphaned_rentals) > 0 
        THEN format(' + cleaned %s orphaned items', v_orphaned_activations + v_orphaned_rentals)
        ELSE ''
      END,
    jsonb_build_object(
      'cleaned_activations', v_orphaned_activations,
      'cleaned_rentals', v_orphaned_rentals,
      'total_cleaned_amount', v_total_cleaned
    )
  );
  
  -- 7. RETURN RESULT avec info de nettoyage
  RETURN json_build_object(
    'success', true,
    'amount_refunded', v_amount_to_refund,
    'balance', v_user.balance,
    'frozen_before', v_user.frozen_balance,
    'frozen_after', v_new_frozen,
    'cleaned_activations', v_orphaned_activations,
    'cleaned_rentals', v_orphaned_rentals,
    'total_cleaned_amount', v_total_cleaned
  );
END;
$$ LANGUAGE plpgsql;

-- Permissions
GRANT EXECUTE ON FUNCTION atomic_refund_direct TO authenticated, service_role;

-- ========================================================================
-- COMMENTAIRES
-- ========================================================================

COMMENT ON FUNCTION atomic_refund_direct IS 
'Effectue un refund direct (sans activation/rental spécifique) et nettoie automatiquement les frozen_amount orphelins du même utilisateur. Utilisé quand l''achat échoue après freeze mais avant/pendant la création de l''activation/rental.';

-- ========================================================================
-- TEST DE LA FONCTION CORRIGÉE
-- ========================================================================

-- Fonction de test (à supprimer après validation)
CREATE OR REPLACE FUNCTION test_atomic_refund_direct_fixed()
RETURNS TEXT AS $$
DECLARE
  test_user_id UUID := 'e108c02a-2012-4043-bbc2-fb09bb11f824';
  result JSON;
BEGIN
  -- Test avec nettoyage automatique des orphelins
  SELECT atomic_refund_direct(test_user_id, 1.0, NULL, 'TEST FIX orphaned amounts') INTO result;
  
  RETURN format('✅ Test OK: %s', result::text);
EXCEPTION WHEN OTHERS THEN
  RETURN format('❌ Test FAILED: %s', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Lancer le test
-- SELECT test_atomic_refund_direct_fixed();

-- Nettoyer après test
-- DROP FUNCTION IF EXISTS test_atomic_refund_direct_fixed();