-- ============================================================
-- DÉPLOIEMENT URGENT: Fonctions SQL Manquantes
-- Date: 2025-12-03
-- Fix pour: 33 activations fantômes (227 Ⓐ perdus)
-- ============================================================


-- ============================================================
-- Fichier: migrations/secure_frozen_balance_system.sql
-- ============================================================

-- ============================================================================
-- SYSTÈME DE GESTION SÉCURISÉ DES BALANCES GELÉES
-- ONE SMS - 30 Novembre 2025
-- ============================================================================
-- 
-- PROBLÈME ACTUEL:
-- ----------------
-- - frozen_balance est un nombre agrégé sur la table users
-- - Quand une activation est annulée, on fait: frozen_balance - activation.price
-- - MAIS si le calcul est incorrect ou si plusieurs activations partagent le même frozen_balance,
--   on peut dégeler PLUS que prévu = RISQUE FINANCIER MAJEUR
--
-- SOLUTION: 
-- ---------
-- 1. Ajouter un champ 'frozen_amount' sur chaque activation pour tracer le montant gelé
-- 2. Calculer frozen_balance dynamiquement à partir des activations actives
-- 3. Utiliser des transactions atomiques pour les opérations financières
-- 4. Ajouter des contrôles de cohérence
-- ============================================================================

-- ÉTAPE 1: Ajouter la colonne frozen_amount à la table activations
-- ================================================================
-- Cette colonne stocke le montant EXACT gelé pour CETTE activation
ALTER TABLE activations 
ADD COLUMN IF NOT EXISTS frozen_amount DECIMAL(10,2) DEFAULT 0;

-- Commenter la colonne
COMMENT ON COLUMN activations.frozen_amount IS 'Montant gelé pour cette activation spécifique. Utilisé pour le dégel sécurisé.';

-- Ajouter aussi frozen_amount aux rentals pour cohérence
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS frozen_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN rentals.frozen_amount IS 'Montant gelé pour cette location spécifique. Utilisé pour le dégel sécurisé.';

-- ÉTAPE 2: Migrer les données existantes
-- ======================================
-- Pour les activations pending/waiting existantes, frozen_amount = price
UPDATE activations 
SET frozen_amount = price 
WHERE status IN ('pending', 'waiting') 
AND (frozen_amount = 0 OR frozen_amount IS NULL);

-- Pour les activations terminées, frozen_amount = 0 (déjà dégelé)
UPDATE activations 
SET frozen_amount = 0 
WHERE status NOT IN ('pending', 'waiting');

-- Pour les rentals actives, frozen_amount = total_cost
UPDATE rentals 
SET frozen_amount = total_cost 
WHERE status = 'active'
AND (frozen_amount = 0 OR frozen_amount IS NULL);

-- Pour les rentals terminées, frozen_amount = 0
UPDATE rentals 
SET frozen_amount = 0 
WHERE status != 'active';

-- ÉTAPE 3: Créer une table d'audit des opérations de gel/dégel
-- ============================================================
CREATE TABLE IF NOT EXISTS balance_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    activation_id UUID REFERENCES activations(id),
    rental_id UUID, -- Pour les locations futures
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('freeze', 'unfreeze', 'charge', 'refund', 'correction')),
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    frozen_before DECIMAL(10,2) NOT NULL,
    frozen_after DECIMAL(10,2) NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_balance_ops_user ON balance_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_ops_activation ON balance_operations(activation_id);
CREATE INDEX IF NOT EXISTS idx_balance_ops_created ON balance_operations(created_at);

COMMENT ON TABLE balance_operations IS 'Audit trail de toutes les opérations de gel/dégel de balance. Pour la traçabilité et réconciliation.';

-- ÉTAPE 4: Créer une fonction de réconciliation
-- =============================================
-- Cette fonction recalcule frozen_balance à partir des activations ET rentals actives
CREATE OR REPLACE FUNCTION reconcile_frozen_balance(p_user_id UUID)
RETURNS TABLE(
    calculated_frozen DECIMAL(10,2),
    actual_frozen DECIMAL(10,2),
    difference DECIMAL(10,2),
    needs_correction BOOLEAN
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_calculated DECIMAL(10,2);
    v_actual DECIMAL(10,2);
    v_activation_frozen DECIMAL(10,2);
    v_rental_frozen DECIMAL(10,2);
BEGIN
    -- Calculer la somme des frozen_amount pour les activations actives
    SELECT COALESCE(SUM(frozen_amount), 0)
    INTO v_activation_frozen
    FROM activations
    WHERE user_id = p_user_id
    AND status IN ('pending', 'waiting')
    AND frozen_amount > 0;
    
    -- Calculer la somme des frozen_amount pour les rentals actives
    SELECT COALESCE(SUM(frozen_amount), 0)
    INTO v_rental_frozen
    FROM rentals
    WHERE user_id = p_user_id
    AND status = 'active'
    AND frozen_amount > 0;
    
    -- Total calculé
    v_calculated := v_activation_frozen + v_rental_frozen;
    
    -- Récupérer le frozen_balance actuel
    SELECT COALESCE(frozen_balance, 0)
    INTO v_actual
    FROM users
    WHERE id = p_user_id;
    
    RETURN QUERY SELECT 
        v_calculated,
        v_actual,
        v_actual - v_calculated,
        ABS(v_actual - v_calculated) > 0.01;
END;
$$;

-- ÉTAPE 5: Fonction sécurisée de GEL (freeze)
-- ==========================================
CREATE OR REPLACE FUNCTION secure_freeze_balance(
    p_user_id UUID,
    p_activation_id UUID,
    p_amount DECIMAL(10,2),
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_balance DECIMAL(10,2);
    v_frozen DECIMAL(10,2);
    v_new_frozen DECIMAL(10,2);
    v_result JSONB;
BEGIN
    -- Verrouiller la ligne user pour éviter les race conditions
    SELECT balance, COALESCE(frozen_balance, 0)
    INTO v_balance, v_frozen
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Vérifier le solde disponible (balance - frozen)
    IF (v_balance - v_frozen) < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_BALANCE',
            'available', v_balance - v_frozen,
            'required', p_amount
        );
    END IF;
    
    -- Calculer le nouveau frozen
    v_new_frozen := v_frozen + p_amount;
    
    -- Mettre à jour frozen_balance
    UPDATE users
    SET frozen_balance = v_new_frozen
    WHERE id = p_user_id;
    
    -- Mettre à jour frozen_amount sur l'activation
    UPDATE activations
    SET frozen_amount = p_amount
    WHERE id = p_activation_id;
    
    -- Logger l'opération
    INSERT INTO balance_operations (
        user_id, activation_id, operation_type, amount,
        balance_before, balance_after,
        frozen_before, frozen_after,
        reason, metadata
    ) VALUES (
        p_user_id, p_activation_id, 'freeze', p_amount,
        v_balance, v_balance,
        v_frozen, v_new_frozen,
        p_reason,
        jsonb_build_object('activation_id', p_activation_id)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'frozen_amount', p_amount,
        'new_frozen_balance', v_new_frozen,
        'available_balance', v_balance - v_new_frozen
    );
END;
$$;

-- ÉTAPE 6: Fonction sécurisée de DÉGEL (unfreeze)
-- ===============================================
CREATE OR REPLACE FUNCTION secure_unfreeze_balance(
    p_user_id UUID,
    p_activation_id UUID,
    p_refund_to_balance BOOLEAN DEFAULT false, -- true = annulation (rembourser), false = charge (débit définitif)
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_balance DECIMAL(10,2);
    v_frozen DECIMAL(10,2);
    v_frozen_amount DECIMAL(10,2);
    v_new_frozen DECIMAL(10,2);
    v_new_balance DECIMAL(10,2);
    v_operation_type VARCHAR(20);
BEGIN
    -- Récupérer le frozen_amount de l'activation
    SELECT frozen_amount
    INTO v_frozen_amount
    FROM activations
    WHERE id = p_activation_id
    FOR UPDATE;
    
    IF v_frozen_amount IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ACTIVATION_NOT_FOUND'
        );
    END IF;
    
    IF v_frozen_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'NO_FROZEN_AMOUNT',
            'message', 'Cette activation n''a pas de montant gelé'
        );
    END IF;
    
    -- Verrouiller la ligne user
    SELECT balance, COALESCE(frozen_balance, 0)
    INTO v_balance, v_frozen
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- S'assurer qu'on ne dégèle pas plus que ce qui est gelé
    IF v_frozen < v_frozen_amount THEN
        -- Anomalie détectée - utiliser le minimum
        v_frozen_amount := v_frozen;
    END IF;
    
    -- Calculer les nouvelles valeurs
    v_new_frozen := GREATEST(0, v_frozen - v_frozen_amount);
    
    IF p_refund_to_balance THEN
        -- ANNULATION: rembourser au solde disponible
        v_new_balance := v_balance + v_frozen_amount;
        v_operation_type := 'refund';
    ELSE
        -- CHARGE: le montant est définitivement débité (déjà retiré du balance lors de l'achat)
        v_new_balance := v_balance;
        v_operation_type := 'charge';
    END IF;
    
    -- Mettre à jour l'utilisateur
    UPDATE users
    SET balance = v_new_balance,
        frozen_balance = v_new_frozen
    WHERE id = p_user_id;
    
    -- Remettre frozen_amount à 0 sur l'activation
    UPDATE activations
    SET frozen_amount = 0
    WHERE id = p_activation_id;
    
    -- Logger l'opération
    INSERT INTO balance_operations (
        user_id, activation_id, operation_type, amount,
        balance_before, balance_after,
        frozen_before, frozen_after,
        reason, metadata
    ) VALUES (
        p_user_id, p_activation_id, v_operation_type, v_frozen_amount,
        v_balance, v_new_balance,
        v_frozen, v_new_frozen,
        p_reason,
        jsonb_build_object(
            'activation_id', p_activation_id,
            'refunded', p_refund_to_balance
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'unfrozen_amount', v_frozen_amount,
        'refunded', p_refund_to_balance,
        'new_balance', v_new_balance,
        'new_frozen_balance', v_new_frozen,
        'operation', v_operation_type
    );
END;
$$;

-- ÉTAPE 7: Fonction de correction automatique
-- ===========================================
CREATE OR REPLACE FUNCTION fix_frozen_balance_discrepancy(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_calculated DECIMAL(10,2);
    v_actual DECIMAL(10,2);
    v_balance DECIMAL(10,2);
    v_activation_frozen DECIMAL(10,2);
    v_rental_frozen DECIMAL(10,2);
BEGIN
    -- Calculer ce que frozen_balance DEVRAIT être (activations)
    SELECT COALESCE(SUM(frozen_amount), 0)
    INTO v_activation_frozen
    FROM activations
    WHERE user_id = p_user_id
    AND status IN ('pending', 'waiting')
    AND frozen_amount > 0;
    
    -- Calculer ce que frozen_balance DEVRAIT être (rentals)
    SELECT COALESCE(SUM(frozen_amount), 0)
    INTO v_rental_frozen
    FROM rentals
    WHERE user_id = p_user_id
    AND status = 'active'
    AND frozen_amount > 0;
    
    -- Total
    v_calculated := v_activation_frozen + v_rental_frozen;
    
    -- Récupérer les valeurs actuelles
    SELECT balance, COALESCE(frozen_balance, 0)
    INTO v_balance, v_actual
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Si pas de différence significative, retourner
    IF ABS(v_actual - v_calculated) < 0.01 THEN
        RETURN jsonb_build_object(
            'success', true,
            'correction_needed', false,
            'frozen_balance', v_actual,
            'activation_frozen', v_activation_frozen,
            'rental_frozen', v_rental_frozen
        );
    END IF;
    
    -- Corriger
    UPDATE users
    SET frozen_balance = v_calculated
    WHERE id = p_user_id;
    
    -- Logger la correction
    INSERT INTO balance_operations (
        user_id, activation_id, operation_type, amount,
        balance_before, balance_after,
        frozen_before, frozen_after,
        reason, metadata
    ) VALUES (
        p_user_id, NULL, 'correction', v_actual - v_calculated,
        v_balance, v_balance,
        v_actual, v_calculated,
        'Automatic frozen balance reconciliation',
        jsonb_build_object(
            'old_frozen', v_actual,
            'new_frozen', v_calculated,
            'difference', v_actual - v_calculated,
            'activation_frozen', v_activation_frozen,
            'rental_frozen', v_rental_frozen
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'correction_needed', true,
        'old_frozen', v_actual,
        'new_frozen', v_calculated,
        'difference', v_actual - v_calculated,
        'activation_frozen', v_activation_frozen,
        'rental_frozen', v_rental_frozen
    );
END;
$$;

-- ÉTAPE 8: Vue pour monitoring en temps réel
-- ==========================================
CREATE OR REPLACE VIEW v_frozen_balance_health AS
WITH user_frozen AS (
    SELECT 
        user_id,
        SUM(frozen_amount) as activation_frozen,
        COUNT(*) as activation_count
    FROM activations
    WHERE status IN ('pending', 'waiting') AND frozen_amount > 0
    GROUP BY user_id
),
rental_frozen AS (
    SELECT 
        user_id,
        SUM(frozen_amount) as rental_frozen,
        COUNT(*) as rental_count
    FROM rentals
    WHERE status = 'active' AND frozen_amount > 0
    GROUP BY user_id
)
SELECT 
    u.id as user_id,
    u.email,
    u.balance,
    u.frozen_balance as stored_frozen,
    COALESCE(af.activation_frozen, 0) + COALESCE(rf.rental_frozen, 0) as calculated_frozen,
    u.frozen_balance - (COALESCE(af.activation_frozen, 0) + COALESCE(rf.rental_frozen, 0)) as discrepancy,
    COALESCE(af.activation_count, 0) as active_activations,
    COALESCE(rf.rental_count, 0) as active_rentals,
    CASE 
        WHEN ABS(u.frozen_balance - (COALESCE(af.activation_frozen, 0) + COALESCE(rf.rental_frozen, 0))) > 0.01 THEN 'ANOMALY'
        WHEN u.frozen_balance > u.balance THEN 'OVER_FROZEN'
        ELSE 'OK'
    END as health_status
FROM users u
LEFT JOIN user_frozen af ON af.user_id = u.id
LEFT JOIN rental_frozen rf ON rf.user_id = u.id
WHERE u.frozen_balance > 0 
   OR af.activation_count > 0 
   OR rf.rental_count > 0;

COMMENT ON VIEW v_frozen_balance_health IS 'Vue de monitoring pour détecter les anomalies de frozen_balance (activations + rentals)';

-- ============================================================================
-- UTILISATION
-- ============================================================================
-- 
-- 1. ACHAT D'UN NUMÉRO:
--    SELECT secure_freeze_balance(user_id, activation_id, price, 'Achat activation');
--
-- 2. ANNULATION (remboursement):
--    SELECT secure_unfreeze_balance(user_id, activation_id, true, 'Annulation par utilisateur');
--
-- 3. SUCCÈS (SMS reçu - charge définitive):
--    SELECT secure_unfreeze_balance(user_id, activation_id, false, 'SMS reçu');
--
-- 4. TIMEOUT (remboursement automatique):
--    SELECT secure_unfreeze_balance(user_id, activation_id, true, 'Timeout automatique');
--
-- 5. VÉRIFICATION SANTÉ:
--    SELECT * FROM v_frozen_balance_health WHERE health_status != 'OK';
--
-- 6. CORRECTION MANUELLE:
--    SELECT fix_frozen_balance_discrepancy(user_id);
-- ============================================================================



-- ============================================================
-- Fichier: supabase/migrations/20251203_create_atomic_timeout_processor.sql
-- ============================================================

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

