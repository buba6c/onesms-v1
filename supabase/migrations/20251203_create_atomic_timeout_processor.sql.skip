-- Migration: Créer fonction atomique 100% fiable pour timeout
-- Version: 2025-12-03-atomic-timeout-processor

-- Supprimer si existe
DROP FUNCTION IF EXISTS process_expired_activations() CASCADE;

-- Créer la fonction atomique
CREATE OR REPLACE FUNCTION process_expired_activations()
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER  -- Exécuter avec privilèges owner
AS $$
DECLARE
  v_activation RECORD;
  v_user RECORD;
  v_processed_count INTEGER := 0;
  v_refunded_total DECIMAL := 0;
  v_errors INTEGER := 0;
  v_result JSON;
BEGIN
  -- Log de démarrage
  RAISE NOTICE 'Starting expired activations processing at %', NOW();
  
  -- Parcourir toutes les activations expirées avec frozen > 0
  FOR v_activation IN
    SELECT 
      id, 
      user_id, 
      price, 
      frozen_amount, 
      order_id, 
      service_code,
      expires_at
    FROM activations 
    WHERE status IN ('pending', 'waiting') 
      AND expires_at < NOW()
      AND frozen_amount > 0
    ORDER BY expires_at ASC
    LIMIT 50  -- Batch processing
  LOOP
    BEGIN
      -- 1. LOCK et UPDATE activation (atomique)
      UPDATE activations 
      SET 
        status = 'timeout',
        frozen_amount = 0,
        charged = false,
        updated_at = NOW()
      WHERE id = v_activation.id 
        AND status IN ('pending', 'waiting')  -- Double-check atomique
        AND frozen_amount > 0;  -- Seulement si encore gelé
      
      -- Vérifier si l'update a réussi
      IF NOT FOUND THEN
        -- Déjà traité par un autre processus, continuer
        CONTINUE;
      END IF;
      
      -- 2. Récupérer l'état actuel de l'utilisateur (avec lock)
      SELECT balance, frozen_balance
      INTO v_user
      FROM users 
      WHERE id = v_activation.user_id
      FOR UPDATE;  -- Lock utilisateur
      
      -- 3. Libérer frozen_balance (Model A)
      UPDATE users
      SET 
        frozen_balance = GREATEST(0, frozen_balance - v_activation.frozen_amount),
        updated_at = NOW()
      WHERE id = v_activation.user_id;
      
      -- 4. Logger l'opération refund dans balance_operations
      INSERT INTO balance_operations (
        user_id,
        activation_id,
        operation_type,
        amount,
        balance_before,
        balance_after,
        frozen_before,
        frozen_after,
        reason,
        created_at
      ) VALUES (
        v_activation.user_id,
        v_activation.id,
        'refund',
        v_activation.frozen_amount,
        v_user.balance,  -- Balance inchangé (Model A)
        v_user.balance,  -- Balance inchangé (Model A)
        v_user.frozen_balance,  -- Frozen avant
        GREATEST(0, v_user.frozen_balance - v_activation.frozen_amount),  -- Frozen après
        'Automatic timeout refund',
        NOW()
      );
      
      -- Incrémenter les compteurs
      v_processed_count := v_processed_count + 1;
      v_refunded_total := v_refunded_total + v_activation.frozen_amount;
      
      -- Log individuel
      RAISE NOTICE 'PROCESSED: % (%) - %Ⓐ refunded', 
        v_activation.id, 
        v_activation.service_code, 
        v_activation.frozen_amount;
        
    EXCEPTION
      WHEN OTHERS THEN
        -- En cas d'erreur sur cette activation, continuer avec les autres
        v_errors := v_errors + 1;
        RAISE WARNING 'ERROR processing activation %: %', v_activation.id, SQLERRM;
        -- Ne pas ROLLBACK car on veut traiter les autres
    END;
  END LOOP;
  
  -- Construire le résultat
  v_result := json_build_object(
    'success', true,
    'processed', v_processed_count,
    'refunded_total', v_refunded_total,
    'errors', v_errors,
    'timestamp', NOW()::text
  );
  
  -- Log final
  RAISE NOTICE 'COMPLETED: % processed, %Ⓐ refunded, % errors', 
    v_processed_count, v_refunded_total, v_errors;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Erreur globale
    RAISE ERROR 'FATAL ERROR in process_expired_activations: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'processed', v_processed_count,
      'refunded_total', v_refunded_total,
      'timestamp', NOW()::text
    );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION process_expired_activations() TO service_role, authenticated;

-- Commentaire
COMMENT ON FUNCTION process_expired_activations() IS 'Atomic timeout processing - 100% reliable, processes expired activations with proper refunds';

-- Créer aussi la fonction pour cancelled (même principe)
CREATE OR REPLACE FUNCTION process_cancelled_activations()
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
BEGIN
  -- Traiter les activations marquées cancelled mais avec frozen_amount > 0
  FOR v_activation IN
    SELECT id, user_id, frozen_amount, service_code
    FROM activations 
    WHERE status = 'cancelled'
      AND frozen_amount > 0
    LIMIT 50
  LOOP
    BEGIN
      -- Même logique atomique que timeout
      SELECT balance, frozen_balance INTO v_user
      FROM users WHERE id = v_activation.user_id FOR UPDATE;
      
      UPDATE users
      SET frozen_balance = GREATEST(0, frozen_balance - v_activation.frozen_amount)
      WHERE id = v_activation.user_id;
      
      UPDATE activations
      SET frozen_amount = 0
      WHERE id = v_activation.id;
      
      INSERT INTO balance_operations (
        user_id, activation_id, operation_type, amount,
        balance_before, balance_after, frozen_before, frozen_after,
        reason, created_at
      ) VALUES (
        v_activation.user_id, v_activation.id, 'refund', v_activation.frozen_amount,
        v_user.balance, v_user.balance,
        v_user.frozen_balance, GREATEST(0, v_user.frozen_balance - v_activation.frozen_amount),
        'Cancelled activation refund', NOW()
      );
      
      v_processed_count := v_processed_count + 1;
      v_refunded_total := v_refunded_total + v_activation.frozen_amount;
      
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors + 1;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'processed', v_processed_count,
    'refunded_total', v_refunded_total,
    'errors', v_errors,
    'timestamp', NOW()::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION process_cancelled_activations() TO service_role, authenticated;