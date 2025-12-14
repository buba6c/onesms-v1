-- 🔧 Script de réconciliation ponctuelle du frozen_balance
-- À exécuter si frozen_balance devient incohérent avec activations/rentals

DO $$
DECLARE
  v_user RECORD;
  v_frozen_activations DECIMAL;
  v_frozen_rentals DECIMAL;
  v_frozen_correct DECIMAL;
  v_corrections INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Réconciliation du frozen_balance pour tous les utilisateurs...';
  
  FOR v_user IN 
    SELECT id, balance, frozen_balance 
    FROM users 
    WHERE balance > 0 OR frozen_balance > 0
  LOOP
    -- Calculer le frozen correct
    SELECT COALESCE(SUM(frozen_amount), 0) INTO v_frozen_activations
    FROM activations
    WHERE user_id = v_user.id
      AND status IN ('pending', 'waiting')
      AND charged = false;
    
    SELECT COALESCE(SUM(frozen_amount), 0) INTO v_frozen_rentals
    FROM rentals
    WHERE user_id = v_user.id
      AND status IN ('pending', 'active');
    
    v_frozen_correct := v_frozen_activations + v_frozen_rentals;
    
    -- Corriger si écart
    IF v_user.frozen_balance != v_frozen_correct THEN
      UPDATE users
      SET frozen_balance = v_frozen_correct,
          updated_at = NOW()
      WHERE id = v_user.id;
      
      v_corrections := v_corrections + 1;
      
      RAISE NOTICE '✅ User %: % -> % (écart: %)',
        LEFT(v_user.id::text, 8),
        v_user.frozen_balance,
        v_frozen_correct,
        v_user.frozen_balance - v_frozen_correct;
    END IF;
  END LOOP;
  
  IF v_corrections = 0 THEN
    RAISE NOTICE '✅ Aucune correction nécessaire - Tous les frozen_balance sont cohérents';
  ELSE
    RAISE NOTICE '🎉 Réconciliation terminée: % utilisateurs corrigés', v_corrections;
  END IF;
END $$;
