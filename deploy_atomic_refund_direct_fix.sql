-- DÉPLOIEMENT DIRECT DE LA FONCTION ATOMIC_REFUND_DIRECT CORRIGÉE
-- Utilisez ce script SQL directement dans Supabase SQL Editor

-- ÉTAPE 1: FONCTION ATOMIC_REFUND_DIRECT CORRIGÉE
CREATE OR REPLACE FUNCTION atomic_refund_direct(p_user_id uuid, p_amount numeric)
RETURNS jsonb AS $$
DECLARE
    current_frozen numeric;
    current_balance numeric;
    activations_cleaned integer := 0;
    rentals_cleaned integer := 0;
    total_cleaned_amount numeric := 0;
    cleanup_details jsonb := '[]'::jsonb;
    result jsonb;
BEGIN
    -- Lock user row pour transaction atomique
    SELECT balance, frozen_balance 
    INTO current_balance, current_frozen
    FROM users 
    WHERE id = p_user_id 
    FOR UPDATE;
    
    -- Vérifications
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    IF current_frozen < p_amount THEN
        RAISE EXCEPTION 'Insufficient frozen balance: % < %', current_frozen, p_amount;
    END IF;
    
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid amount: %', p_amount;
    END IF;
    
    -- Libérer le frozen_balance (comportement existant)
    UPDATE users 
    SET frozen_balance = frozen_balance - p_amount 
    WHERE id = p_user_id;
    
    -- **NOUVEAU: Nettoyer les frozen_amount orphelins dans activations**
    WITH cleaned_activations AS (
        UPDATE activations 
        SET frozen_amount = 0 
        WHERE user_id = p_user_id 
          AND frozen_amount > 0 
          AND status IN ('timeout', 'cancelled', 'refunded')
        RETURNING id, frozen_amount, status, service_code
    )
    SELECT 
        COUNT(*), 
        COALESCE(SUM(frozen_amount), 0),
        json_agg(json_build_object('type', 'activation', 'id', id, 'amount', frozen_amount, 'status', status, 'service', service_code))
    INTO activations_cleaned, total_cleaned_amount, cleanup_details
    FROM cleaned_activations;
    
    -- **NOUVEAU: Nettoyer les frozen_amount orphelins dans rentals**  
    WITH cleaned_rentals AS (
        UPDATE rentals 
        SET frozen_amount = 0 
        WHERE user_id = p_user_id 
          AND frozen_amount > 0 
          AND status IN ('cancelled')
        RETURNING id, frozen_amount, status, service_name
    ), rental_cleanup AS (
        SELECT 
            COUNT(*) as rental_count,
            COALESCE(SUM(frozen_amount), 0) as rental_amount
        FROM cleaned_rentals
    )
    SELECT 
        rental_count,
        total_cleaned_amount + rental_amount
    INTO rentals_cleaned, total_cleaned_amount
    FROM rental_cleanup;
    
    -- Logger l'opération de refund
    INSERT INTO balance_operations (user_id, operation_type, amount, description, metadata)
    VALUES (
        p_user_id, 
        'refund', 
        p_amount, 
        'atomic_refund_direct with automatic cleanup',
        json_build_object(
            'cleaned_activations', activations_cleaned,
            'cleaned_rentals', rentals_cleaned,
            'total_cleaned_amount', total_cleaned_amount,
            'cleanup_details', cleanup_details
        )
    );
    
    -- Logger le nettoyage si des éléments ont été nettoyés
    IF activations_cleaned > 0 OR rentals_cleaned > 0 THEN
        INSERT INTO balance_operations (user_id, operation_type, amount, description, metadata)
        VALUES (
            p_user_id, 
            'cleanup', 
            total_cleaned_amount, 
            'Automatic frozen_amount cleanup',
            json_build_object(
                'activations_cleaned', activations_cleaned,
                'rentals_cleaned', rentals_cleaned,
                'details', cleanup_details
            )
        );
    END IF;
    
    -- Construire le résultat
    result := json_build_object(
        'success', true,
        'refunded_amount', p_amount,
        'user_id', p_user_id,
        'cleanup_performed', activations_cleaned > 0 OR rentals_cleaned > 0,
        'activations_cleaned', activations_cleaned,
        'rentals_cleaned', rentals_cleaned,
        'total_cleaned_amount', total_cleaned_amount,
        'new_frozen_balance', current_frozen - p_amount,
        'cleanup_details', cleanup_details
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Logger l'erreur
        INSERT INTO balance_operations (user_id, operation_type, amount, description, metadata)
        VALUES (
            p_user_id, 
            'error', 
            p_amount, 
            'atomic_refund_direct failed: ' || SQLERRM,
            json_build_object('error', SQLERRM, 'sqlstate', SQLSTATE)
        );
        
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION atomic_refund_direct(uuid, numeric) TO authenticated, service_role;

-- ÉTAPE 2: VUE DE HEALTH CHECK POUR MONITORING
CREATE OR REPLACE VIEW v_frozen_balance_health AS
SELECT 
    u.id as user_id,
    u.email,
    u.balance,
    u.frozen_balance as actual_frozen,
    COALESCE(a.activation_frozen, 0) as activation_frozen_amount,
    COALESCE(r.rental_frozen, 0) as rental_frozen_amount,
    COALESCE(a.activation_frozen, 0) + COALESCE(r.rental_frozen, 0) as expected_frozen,
    u.frozen_balance - (COALESCE(a.activation_frozen, 0) + COALESCE(r.rental_frozen, 0)) as discrepancy,
    CASE 
        WHEN u.frozen_balance - (COALESCE(a.activation_frozen, 0) + COALESCE(r.rental_frozen, 0)) > 1 THEN 'PHANTOM_FROZEN'
        WHEN u.frozen_balance - (COALESCE(a.activation_frozen, 0) + COALESCE(r.rental_frozen, 0)) < -1 THEN 'INSUFFICIENT_FROZEN'
        ELSE 'HEALTHY'
    END as health_status,
    u.updated_at as last_balance_update
FROM users u
LEFT JOIN (
    SELECT 
        user_id, 
        SUM(frozen_amount) as activation_frozen,
        COUNT(*) as active_activations_count
    FROM activations 
    WHERE frozen_amount > 0 
    GROUP BY user_id
) a ON u.id = a.user_id
LEFT JOIN (
    SELECT 
        user_id, 
        SUM(frozen_amount) as rental_frozen,
        COUNT(*) as active_rentals_count
    FROM rentals 
    WHERE frozen_amount > 0 
    GROUP BY user_id
) r ON u.id = r.user_id
WHERE 
    u.frozen_balance > 0 
    OR COALESCE(a.activation_frozen, 0) > 0 
    OR COALESCE(r.rental_frozen, 0) > 0
ORDER BY ABS(u.frozen_balance - (COALESCE(a.activation_frozen, 0) + COALESCE(r.rental_frozen, 0))) DESC;

-- Permissions sur la vue
GRANT SELECT ON v_frozen_balance_health TO authenticated, service_role;

-- ÉTAPE 3: CORRECTION MANUELLE DU PHANTOM EXISTANT (BUBA6C)
UPDATE users 
SET frozen_balance = 5  -- Correction de 15 vers 5 (enlève 10Ⓐ phantom)
WHERE email = 'buba6c@gmail.com' 
AND frozen_balance = 15;

-- Logger la correction manuelle
INSERT INTO balance_operations (user_id, operation_type, amount, description, metadata)
SELECT 
    id,
    'correction',
    10,
    'Manual phantom frozen balance cleanup - from analysis',
    json_build_object(
        'previous_frozen', 15,
        'new_frozen', 5,
        'phantom_cleaned', 10,
        'correction_timestamp', NOW(),
        'correction_reason', 'atomic_refund_direct enhancement deployment'
    )
FROM users 
WHERE email = 'buba6c@gmail.com';

-- COMMENTAIRES DE DOCUMENTATION
COMMENT ON FUNCTION atomic_refund_direct(uuid, numeric) IS 
'Enhanced atomic_refund_direct with automatic cleanup of orphaned frozen_amount values. 
Liberates frozen_balance AND cleans up corresponding frozen_amount in activations/rentals when status indicates failure.
Returns detailed JSON with cleanup information.';

COMMENT ON VIEW v_frozen_balance_health IS 
'Health monitoring view for frozen balance consistency. Shows discrepancies between user frozen_balance and sum of item frozen_amounts.
Use for ongoing monitoring of phantom frozen balance issues.';

-- VALIDATION QUERIES POUR TESTER LE DÉPLOIEMENT
-- 1. Vérifier que la fonction existe
SELECT proname, prosrc IS NOT NULL as has_source
FROM pg_proc 
WHERE proname = 'atomic_refund_direct';

-- 2. Tester la vue de health
SELECT * FROM v_frozen_balance_health WHERE email = 'buba6c@gmail.com';

-- 3. Vérifier l'état général
SELECT health_status, COUNT(*) as count
FROM v_frozen_balance_health 
GROUP BY health_status;