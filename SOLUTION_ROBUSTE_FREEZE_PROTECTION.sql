-- ===============================================================================
-- 🛡️ SOLUTION ROBUSTE: Protection contre perte de frozen_amount
-- ===============================================================================
-- 
-- PROBLÈME IDENTIFIÉ:
-- - 8 activations timeout avec frozen=0 mais AUCUN refund → PERTE DE 41 Ⓐ
-- - 28 freeze orphelins (freeze existe mais pas de refund/commit)
-- - buy-sms-activate-number peut échouer APRÈS freeze sans rollback
--
-- CAUSE ROOT:
-- - catch(error) global ligne 549 retourne erreur SANS appeler atomic_refund
-- - Si erreur après secure_freeze_balance(), frozen reste gelé à jamais
-- - Aucun système de réconciliation automatique
--
-- SOLUTION EN 3 COUCHES:
-- 1. Cron job de réconciliation (nettoie les freeze orphelins)
-- 2. View pour tracking santé frozen_balance (monitoring)
-- 3. Edge Function wrapper qui force rollback sur erreur (protection code)
-- ===============================================================================

-- ===============================================================================
-- 1️⃣ VIEW: v_frozen_balance_health_reconciliation (évite conflit avec vue existante)
-- ===============================================================================
CREATE OR REPLACE VIEW v_frozen_balance_health_reconciliation AS
WITH user_frozen_sums AS (
  -- Somme des frozen_amount pour activations ET rentals
  SELECT 
    user_id,
    COALESCE(SUM(frozen_amount), 0) AS total_frozen_activations
  FROM (
    SELECT user_id, frozen_amount FROM activations WHERE frozen_amount > 0
    UNION ALL
    SELECT user_id, frozen_amount FROM rentals WHERE frozen_amount > 0
  ) AS combined
  GROUP BY user_id
)
SELECT 
  u.id AS user_id,
  u.balance,
  u.frozen_balance AS frozen_balance_user,
  COALESCE(ufs.total_frozen_activations, 0) AS total_frozen_activations,
  (u.frozen_balance - COALESCE(ufs.total_frozen_activations, 0)) AS frozen_discrepancy,
  CASE 
    WHEN (u.frozen_balance - COALESCE(ufs.total_frozen_activations, 0)) = 0 THEN '✅ Healthy'
    WHEN (u.frozen_balance - COALESCE(ufs.total_frozen_activations, 0)) > 0 THEN '⚠️ Over-frozen'
    ELSE '🚨 Under-frozen'
  END AS health_status
FROM users u
LEFT JOIN user_frozen_sums ufs ON u.id = ufs.user_id
WHERE u.frozen_balance > 0 OR COALESCE(ufs.total_frozen_activations, 0) > 0;

COMMENT ON VIEW v_frozen_balance_health_reconciliation IS 
'Track frozen_balance consistency for reconciliation: compare users.frozen_balance with SUM(activations.frozen_amount + rentals.frozen_amount)';

-- ===============================================================================
-- 2️⃣ FUNCTION: reconcile_orphan_freezes()
-- ===============================================================================
-- Trouve et répare les freeze orphelins:
-- - Activations avec frozen_amount > 0 ET status IN (timeout, failed, cancelled)
-- - Vérifie qu'un refund existe dans balance_operations
-- - Si non, appelle atomic_refund
-- ===============================================================================
CREATE OR REPLACE FUNCTION reconcile_orphan_freezes()
RETURNS TABLE(
  activation_id uuid,
  user_id uuid,
  frozen_amount numeric,
  status text,
  refund_applied boolean,
  error text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_activation RECORD;
  v_refund_exists BOOLEAN;
  v_refund_result jsonb;
BEGIN
  -- Trouver activations suspectes
  FOR v_activation IN
    SELECT a.id, a.user_id, a.frozen_amount, a.status
    FROM activations a
    WHERE a.frozen_amount > 0
      AND a.status IN ('timeout', 'failed', 'cancelled')
      AND a.charged = false
      -- éviter les annulations toutes fraîches : laisser le flux principal traiter
      AND a.updated_at < now() - interval '3 minutes'
      -- s'assurer que le timer est réellement passé pour timeout/failed
      AND (a.expires_at IS NULL OR a.expires_at < now())
    ORDER BY a.created_at DESC
    LIMIT 50
  LOOP
    -- Vérifier si refund existe déjà
    SELECT EXISTS(
      SELECT 1 
      FROM balance_operations bo
      WHERE bo.activation_id = v_activation.id 
        AND bo.operation_type = 'refund'
    ) INTO v_refund_exists;
    
    IF NOT v_refund_exists THEN
      -- Appliquer atomic_refund avec paramètres nommés (compatible FIX_DEFINITIF)
      BEGIN
        SELECT atomic_refund(
          p_user_id := v_activation.user_id,
          p_activation_id := v_activation.id,
          p_rental_id := NULL,
          p_transaction_id := NULL,
          p_reason := 'Reconciliation: orphan freeze cleanup'
        ) INTO v_refund_result;
        
        RETURN QUERY SELECT 
          v_activation.id,
          v_activation.user_id,
          v_activation.frozen_amount,
          v_activation.status,
          true,
          NULL::text;
        
        RAISE NOTICE 'Reconciled activation %: refunded % Ⓐ', v_activation.id, v_activation.frozen_amount;
      EXCEPTION WHEN OTHERS THEN
        -- Log erreur mais continue
        RETURN QUERY SELECT 
          v_activation.id,
          v_activation.user_id,
          v_activation.frozen_amount,
          v_activation.status,
          false,
          SQLERRM;
        
        RAISE WARNING 'Failed to reconcile activation %: %', v_activation.id, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

COMMENT ON FUNCTION reconcile_orphan_freezes IS 
'Cron job function: find activations with frozen_amount > 0 but status=timeout/failed/cancelled, apply atomic_refund if no refund exists';

-- ===============================================================================
-- 3️⃣ FUNCTION: reconcile_rentals_orphan_freezes()
-- ===============================================================================
-- Même logique pour rentals
-- ===============================================================================
CREATE OR REPLACE FUNCTION reconcile_rentals_orphan_freezes()
RETURNS TABLE(
  rental_id uuid,
  user_id uuid,
  frozen_amount numeric,
  status text,
  refund_applied boolean,
  error text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_rental RECORD;
  v_refund_exists BOOLEAN;
  v_refund_result jsonb;
BEGIN
  -- Trouver rentals suspects (pas de colonne charged dans rentals)
  FOR v_rental IN
    SELECT r.id, r.user_id, r.frozen_amount, r.status
    FROM rentals r
    WHERE r.frozen_amount > 0
      AND r.status IN ('expired', 'failed', 'cancelled')
    ORDER BY r.created_at DESC
    LIMIT 50
  LOOP
    -- Vérifier si refund existe déjà
    SELECT EXISTS(
      SELECT 1 
      FROM balance_operations bo
      WHERE bo.rental_id = v_rental.id 
        AND bo.operation_type = 'refund'
    ) INTO v_refund_exists;
    
    IF NOT v_refund_exists THEN
      -- Appliquer atomic_refund avec paramètres nommés (rentals)
      BEGIN
        SELECT atomic_refund(
          p_user_id := v_rental.user_id,
          p_activation_id := NULL,
          p_rental_id := v_rental.id,
          p_transaction_id := NULL,
          p_reason := 'Reconciliation: orphan rental freeze cleanup'
        ) INTO v_refund_result;
        
        RETURN QUERY SELECT 
          v_rental.id,
          v_rental.user_id,
          v_rental.frozen_amount,
          v_rental.status,
          true,
          NULL::text;
        
        RAISE NOTICE 'Reconciled rental %: refunded % Ⓐ', v_rental.id, v_rental.frozen_amount;
      EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
          v_rental.id,
          v_rental.user_id,
          v_rental.frozen_amount,
          v_rental.status,
          false,
          SQLERRM;
        
        RAISE WARNING 'Failed to reconcile rental %: %', v_rental.id, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- ===============================================================================
-- 4️⃣ NOTE: atomic_refund() gère déjà les rentals
-- ===============================================================================
-- La fonction atomic_refund() dans FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql
-- supporte déjà p_rental_id, donc pas besoin de fonction séparée.
-- Signature: atomic_refund(p_user_id, p_activation_id, p_rental_id, p_transaction_id, p_reason)
-- ===============================================================================

-- ===============================================================================
-- 5️⃣ INSTRUCTIONS D'UTILISATION
-- ===============================================================================
-- 
-- A. CRÉER UN CRON JOB SUPABASE:
--    - Nom: reconcile-orphan-freezes
--    - Schedule: */5 * * * * (toutes les 5 minutes)
--    - SQL: SELECT reconcile_orphan_freezes(); SELECT reconcile_rentals_orphan_freezes();
--
-- B. MONITORING:
--    SELECT * FROM v_frozen_balance_health_reconciliation WHERE frozen_discrepancy != 0;
--
-- C. EDGE FUNCTION buy-sms-activate-number:
--    Wrapper la logique après freeze dans try-catch:
--    
--    let freezeApplied = false
--    try {
--      const freezeResult = await secure_freeze_balance(...)
--      freezeApplied = true
--      
--      // ... reste logique (link transaction, etc.)
--      
--    } catch (error) {
--      if (freezeApplied) {
--        // ROLLBACK OBLIGATOIRE
--        await atomic_refund(userId, activationId, price, 'Rollback after freeze')
--      }
--      throw error
--    }
--
-- ===============================================================================

-- ✅ VIEW créée
SELECT 'View v_frozen_balance_health_reconciliation créée avec frozen_discrepancy' AS status;

-- ✅ Function reconcile_orphan_freezes créée
SELECT 'Function reconcile_orphan_freezes() créée (activations)' AS status;

-- ✅ Function reconcile_rentals_orphan_freezes créée
SELECT 'Function reconcile_rentals_orphan_freezes() créée (rentals)' AS status;

-- ✅ Function atomic_refund() déjà disponible (gère activations ET rentals)
SELECT 'Function atomic_refund() utilisée pour activations ET rentals' AS status;

-- 🎯 TESTER LA RÉCONCILIATION
SELECT '🧪 Test: Trouver activations orphelines...' AS test;
SELECT * FROM reconcile_orphan_freezes() LIMIT 10;

SELECT '🧪 Test: Vérifier santé frozen_balance...' AS test;
SELECT * FROM v_frozen_balance_health_reconciliation WHERE frozen_discrepancy != 0 LIMIT 10;
