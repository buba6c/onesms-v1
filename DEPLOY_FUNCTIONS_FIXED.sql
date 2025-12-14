-- ============================================================================
-- DÉPLOIEMENT DES FONCTIONS SQL MANQUANTES - VERSION CORRIGÉE
-- Date: 2025-12-03
-- But: Corriger le bug des activations fantômes (227 Ⓐ perdus)
-- Compatible avec PostgreSQL strict (RAISE EXCEPTION, colonnes NOT NULL)
-- ============================================================================

-- ============================================================================
-- PARTIE 1: SYSTÈME SECURE FROZEN BALANCE
-- ============================================================================

-- DROP des anciennes versions si elles existent
DROP FUNCTION IF EXISTS secure_freeze_balance CASCADE;
DROP FUNCTION IF EXISTS secure_unfreeze_balance CASCADE;
DROP FUNCTION IF EXISTS atomic_refund CASCADE;
DROP FUNCTION IF EXISTS atomic_commit CASCADE;
DROP FUNCTION IF EXISTS process_expired_activations CASCADE;

-- 1. Fonction: secure_freeze_balance
CREATE OR REPLACE FUNCTION secure_freeze_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Balance freeze'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_available DECIMAL;
BEGIN
  SELECT id, balance, frozen_balance INTO v_user
  FROM users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  v_available := v_user.balance - COALESCE(v_user.frozen_balance, 0);

  IF v_available < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE users
  SET frozen_balance = frozen_balance + p_amount, updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO balance_operations (
    user_id, activation_id, rental_id, operation_type, amount,
    balance_before, balance_after, frozen_before, frozen_after, reason
  ) VALUES (
    p_user_id, p_activation_id, p_rental_id, 'freeze', p_amount,
    v_user.balance, v_user.balance,
    v_user.frozen_balance, v_user.frozen_balance + p_amount, p_reason
  );

  IF p_activation_id IS NOT NULL THEN
    UPDATE activations SET frozen_amount = p_amount WHERE id = p_activation_id;
  END IF;

  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals SET frozen_amount = p_amount WHERE id = p_rental_id;
  END IF;

  RETURN json_build_object('success', true, 'frozen', p_amount);
END;
$$;


-- 2. Fonction: secure_unfreeze_balance
CREATE OR REPLACE FUNCTION secure_unfreeze_balance(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_refund_to_balance BOOLEAN DEFAULT FALSE,
  p_refund_reason TEXT DEFAULT 'Refund'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_frozen_amount DECIMAL := 0;
  v_operation_type TEXT;
BEGIN
  SELECT id, balance, frozen_balance INTO v_user
  FROM users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM activations
    WHERE id = p_activation_id AND user_id = p_user_id FOR UPDATE;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM rentals
    WHERE id = p_rental_id AND user_id = p_user_id FOR UPDATE;
  END IF;

  v_frozen_amount := COALESCE(v_frozen_amount, 0);

  IF v_frozen_amount <= 0 THEN
    RETURN json_build_object('success', true, 'idempotent', true);
  END IF;

  v_operation_type := CASE WHEN p_refund_to_balance THEN 'refund' ELSE 'unfreeze' END;

  UPDATE users
  SET frozen_balance = GREATEST(0, frozen_balance - v_frozen_amount), updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO balance_operations (
    user_id, activation_id, rental_id, operation_type, amount,
    balance_before, balance_after, frozen_before, frozen_after, reason
  ) VALUES (
    p_user_id, p_activation_id, p_rental_id, v_operation_type, v_frozen_amount,
    v_user.balance, v_user.balance,
    v_user.frozen_balance, GREATEST(0, v_user.frozen_balance - v_frozen_amount),
    p_refund_reason
  );

  IF p_activation_id IS NOT NULL THEN
    UPDATE activations SET frozen_amount = 0, updated_at = NOW() WHERE id = p_activation_id;
  END IF;

  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals SET frozen_amount = 0, updated_at = NOW() WHERE id = p_rental_id;
  END IF;

  RETURN json_build_object('success', true, 'unfrozen', v_frozen_amount);
END;
$$;


-- 3. Fonction: atomic_refund
CREATE OR REPLACE FUNCTION atomic_refund(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Refund'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  v_result := secure_unfreeze_balance(
    p_user_id, p_activation_id, p_rental_id, TRUE, p_reason
  );

  IF (v_result->>'success')::boolean THEN
    IF p_activation_id IS NOT NULL THEN
      UPDATE activations
      SET status = CASE 
          WHEN status = 'pending' THEN 'timeout'
          WHEN status = 'waiting' THEN 'cancelled'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = p_activation_id
        AND status NOT IN ('received', 'completed', 'refunded');
    END IF;

    IF p_rental_id IS NOT NULL THEN
      UPDATE rentals
      SET status = 'refunded', updated_at = NOW()
      WHERE id = p_rental_id
        AND status NOT IN ('completed', 'refunded');
    END IF;
  END IF;

  RETURN json_build_object(
    'success', (v_result->>'success')::boolean,
    'refunded', COALESCE((v_result->>'unfrozen')::decimal, 0),
    'idempotent', COALESCE((v_result->>'idempotent')::boolean, false)
  );
END;
$$;


-- 4. Fonction: atomic_commit
CREATE OR REPLACE FUNCTION atomic_commit(
  p_user_id UUID,
  p_activation_id UUID DEFAULT NULL,
  p_rental_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Service completed'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_frozen_amount DECIMAL := 0;
BEGIN
  SELECT id, balance, frozen_balance INTO v_user
  FROM users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF p_activation_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM activations
    WHERE id = p_activation_id AND user_id = p_user_id FOR UPDATE;
  ELSIF p_rental_id IS NOT NULL THEN
    SELECT frozen_amount INTO v_frozen_amount
    FROM rentals
    WHERE id = p_rental_id AND user_id = p_user_id FOR UPDATE;
  END IF;

  v_frozen_amount := COALESCE(v_frozen_amount, 0);

  IF v_frozen_amount <= 0 THEN
    RETURN json_build_object('success', true, 'idempotent', true);
  END IF;

  -- ✅ COMMIT = CHARGE: Diminuer balance ET frozen_balance
  UPDATE users
  SET 
    balance = GREATEST(0, balance - v_frozen_amount),
    frozen_balance = GREATEST(0, frozen_balance - v_frozen_amount),
    updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO balance_operations (
    user_id, activation_id, rental_id, operation_type, amount,
    balance_before, balance_after, frozen_before, frozen_after, reason
  ) VALUES (
    p_user_id, p_activation_id, p_rental_id, 'commit', v_frozen_amount,
    v_user.balance, GREATEST(0, v_user.balance - v_frozen_amount),
    v_user.frozen_balance, GREATEST(0, v_user.frozen_balance - v_frozen_amount),
    p_reason
  );

  IF p_activation_id IS NOT NULL THEN
    UPDATE activations
    SET frozen_amount = 0, charged = true, updated_at = NOW()
    WHERE id = p_activation_id;
  END IF;

  IF p_rental_id IS NOT NULL THEN
    UPDATE rentals
    SET frozen_amount = 0, charged = true, updated_at = NOW()
    WHERE id = p_rental_id;
  END IF;

  RETURN json_build_object('success', true, 'committed', v_frozen_amount);
END;
$$;


-- ============================================================================
-- PARTIE 2: PROCESS EXPIRED ACTIVATIONS (CORRIGÉ - RAISE EXCEPTION)
-- ============================================================================

CREATE OR REPLACE FUNCTION process_expired_activations()
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_activation RECORD;
  v_user RECORD;
  v_processed_count INTEGER := 0;
  v_refunded_total DECIMAL := 0;
  v_errors INTEGER := 0;
  v_result JSON;
BEGIN
  RAISE NOTICE 'Starting expired activations processing at %', NOW();
  
  FOR v_activation IN
    SELECT id, user_id, price, frozen_amount, order_id, service_code, expires_at
    FROM activations 
    WHERE status IN ('pending', 'waiting') 
      AND expires_at < NOW()
      AND frozen_amount > 0
    ORDER BY expires_at ASC
    LIMIT 50
  LOOP
    BEGIN
      UPDATE activations 
      SET status = 'timeout', frozen_amount = 0, charged = false, updated_at = NOW()
      WHERE id = v_activation.id 
        AND status IN ('pending', 'waiting')
        AND frozen_amount > 0;
      
      IF NOT FOUND THEN
        CONTINUE;
      END IF;
      
      SELECT balance, frozen_balance INTO v_user
      FROM users WHERE id = v_activation.user_id FOR UPDATE;
      
      UPDATE users
      SET frozen_balance = GREATEST(0, frozen_balance - v_activation.frozen_amount),
          updated_at = NOW()
      WHERE id = v_activation.user_id;
      
      INSERT INTO balance_operations (
        user_id, activation_id, operation_type, amount,
        balance_before, balance_after, frozen_before, frozen_after, reason
      ) VALUES (
        v_activation.user_id, v_activation.id, 'refund', v_activation.frozen_amount,
        v_user.balance, v_user.balance,
        v_user.frozen_balance, GREATEST(0, v_user.frozen_balance - v_activation.frozen_amount),
        'Automatic timeout refund'
      );
      
      v_processed_count := v_processed_count + 1;
      v_refunded_total := v_refunded_total + v_activation.frozen_amount;
      
      RAISE NOTICE 'PROCESSED: % (%) - %Ⓐ refunded', 
        v_activation.id, v_activation.service_code, v_activation.frozen_amount;
        
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors + 1;
        RAISE WARNING 'ERROR processing activation %: %', v_activation.id, SQLERRM;
    END;
  END LOOP;
  
  v_result := json_build_object(
    'success', true,
    'processed', v_processed_count,
    'refunded_total', v_refunded_total,
    'errors', v_errors,
    'timestamp', NOW()::text
  );
  
  RAISE NOTICE 'COMPLETED: % processed, %Ⓐ refunded, % errors', 
    v_processed_count, v_refunded_total, v_errors;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- CORRIGÉ: RAISE EXCEPTION au lieu de RAISE ERROR
    RAISE EXCEPTION 'FATAL ERROR in process_expired_activations: %', SQLERRM;
END;
$$;


-- ============================================================================
-- PARTIE 3: VUE DE MONITORING
-- ============================================================================

-- DROP la vue existante si elle existe
DROP VIEW IF EXISTS v_frozen_balance_health CASCADE;

CREATE VIEW v_frozen_balance_health AS
SELECT
  (SELECT COALESCE(SUM(frozen_amount), 0) FROM activations 
   WHERE status IN ('pending', 'waiting') AND frozen_amount > 0) +
  (SELECT COALESCE(SUM(frozen_amount), 0) FROM rentals 
   WHERE status = 'active' AND frozen_amount > 0) 
    AS total_frozen_activations,
  
  (SELECT COALESCE(SUM(frozen_balance), 0) FROM users) AS total_user_frozen,
  
  (SELECT COALESCE(SUM(frozen_balance), 0) FROM users) - 
  ((SELECT COALESCE(SUM(frozen_amount), 0) FROM activations 
    WHERE status IN ('pending', 'waiting') AND frozen_amount > 0) +
   (SELECT COALESCE(SUM(frozen_amount), 0) FROM rentals 
    WHERE status = 'active' AND frozen_amount > 0))
    AS total_discrepancy,
    
  (SELECT COUNT(*) FROM activations 
   WHERE status IN ('pending', 'waiting') AND frozen_amount > 0) AS active_activations,
  (SELECT COUNT(*) FROM rentals 
   WHERE status = 'active' AND frozen_amount > 0) AS active_rentals;


-- ============================================================================
-- PARTIE 4: PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION secure_freeze_balance TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION secure_unfreeze_balance TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION atomic_refund TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION atomic_commit TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION process_expired_activations TO service_role, authenticated;

GRANT SELECT ON v_frozen_balance_health TO service_role, authenticated;


-- ============================================================================
-- VÉRIFICATION POST-DÉPLOIEMENT
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Vérification des fonctions déployées...';
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'secure_freeze_balance') THEN
    RAISE NOTICE '✅ secure_freeze_balance déployée';
  ELSE
    RAISE EXCEPTION '❌ secure_freeze_balance manquante';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'secure_unfreeze_balance') THEN
    RAISE NOTICE '✅ secure_unfreeze_balance déployée';
  ELSE
    RAISE EXCEPTION '❌ secure_unfreeze_balance manquante';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'atomic_refund') THEN
    RAISE NOTICE '✅ atomic_refund déployée';
  ELSE
    RAISE EXCEPTION '❌ atomic_refund manquante';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'atomic_commit') THEN
    RAISE NOTICE '✅ atomic_commit déployée';
  ELSE
    RAISE EXCEPTION '❌ atomic_commit manquante';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_expired_activations') THEN
    RAISE NOTICE '✅ process_expired_activations déployée';
  ELSE
    RAISE EXCEPTION '❌ process_expired_activations manquante';
  END IF;
  
  RAISE NOTICE '🎉 TOUTES LES FONCTIONS SONT DÉPLOYÉES!';
END $$;

-- Afficher l'état de santé
SELECT * FROM v_frozen_balance_health;
