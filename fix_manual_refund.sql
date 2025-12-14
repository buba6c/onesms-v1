-- =====================================================
-- FIX: Activation expirée avec frozen bloqué
-- À exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. Vérifier l'état actuel
SELECT 
  id, 
  balance, 
  frozen_balance,
  balance - frozen_balance as available
FROM users 
WHERE id = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

-- 2. Vérifier l'activation expirée
SELECT 
  id,
  status,
  frozen_amount,
  service_code,
  expires_at,
  created_at
FROM activations 
WHERE id = '3e6aacad-c0b1-42cf-b0dd-f2a88872dfbe';

-- 3. Appliquer le refund manuellement (en transaction)
DO $$
DECLARE
  v_user_id UUID := 'e108c02a-2012-4043-bbc2-fb09bb11f824';
  v_activation_id UUID := '3e6aacad-c0b1-42cf-b0dd-f2a88872dfbe';
  v_current_balance DECIMAL;
  v_current_frozen DECIMAL;
  v_frozen_amount DECIMAL;
BEGIN
  -- Récupérer les valeurs actuelles
  SELECT balance, frozen_balance INTO v_current_balance, v_current_frozen
  FROM users WHERE id = v_user_id;
  
  SELECT frozen_amount INTO v_frozen_amount
  FROM activations WHERE id = v_activation_id;
  
  RAISE NOTICE 'Balance actuel: %, Frozen actuel: %, Frozen activation: %', 
    v_current_balance, v_current_frozen, v_frozen_amount;
  
  -- Si l'activation a encore du frozen à rembourser
  IF v_frozen_amount IS NOT NULL AND v_frozen_amount > 0 THEN
    -- Rembourser: balance += frozen_amount, frozen -= frozen_amount
    UPDATE users 
    SET 
      balance = balance + v_frozen_amount,
      frozen_balance = frozen_balance - v_frozen_amount,
      updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Mettre à jour l'activation
    UPDATE activations 
    SET 
      status = 'expired',
      frozen_amount = 0,
      updated_at = NOW()
    WHERE id = v_activation_id;
    
    -- Log l'opération
    INSERT INTO balance_operations (
      user_id, activation_id, operation_type, amount,
      balance_before, balance_after, frozen_before, frozen_after, reason
    ) VALUES (
      v_user_id, v_activation_id, 'refund', v_frozen_amount,
      v_current_balance, v_current_balance + v_frozen_amount,
      v_current_frozen, v_current_frozen - v_frozen_amount,
      'Manual fix: expired activation refund'
    );
    
    RAISE NOTICE '✅ Refund effectué: % Ⓐ', v_frozen_amount;
  ELSE
    -- Juste mettre à jour le status
    UPDATE activations 
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_activation_id AND status = 'pending';
    
    RAISE NOTICE '⚠️ Pas de frozen à rembourser, status mis à jour';
  END IF;
END $$;

-- 4. Vérifier le résultat
SELECT 
  id, 
  balance, 
  frozen_balance,
  balance - frozen_balance as available
FROM users 
WHERE id = 'e108c02a-2012-4043-bbc2-fb09bb11f824';

-- 5. Vérifier toutes les activations pending
SELECT id, status, frozen_amount, service_code, created_at, expires_at
FROM activations 
WHERE user_id = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
  AND status IN ('pending', 'active')
ORDER BY created_at DESC;
