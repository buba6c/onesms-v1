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
