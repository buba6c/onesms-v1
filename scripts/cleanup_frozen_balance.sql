-- ============================================================================
-- Script de nettoyage des montants gelés orphelins
-- ============================================================================
-- Ce script identifie et corrige les utilisateurs avec frozen_balance > 0
-- mais sans transactions actives correspondantes
-- ============================================================================

-- ÉTAPE 1: Identifier les utilisateurs avec frozen_balance orphelin
-- ============================================================================
WITH active_freezes AS (
  -- Montants gelés par les activations actives
  SELECT 
    user_id,
    SUM(COALESCE(frozen_amount, 0)) as total_frozen_activations
  FROM activations
  WHERE status IN ('pending', 'waiting')
  GROUP BY user_id

  UNION ALL

  -- Montants gelés par les locations actives
  SELECT 
    user_id,
    SUM(COALESCE(frozen_amount, 0)) as total_frozen_rentals
  FROM rentals
  WHERE status = 'active'
  GROUP BY user_id
),
user_freezes AS (
  SELECT 
    user_id,
    SUM(total_frozen_activations) as expected_frozen
  FROM active_freezes
  GROUP BY user_id
)
SELECT 
  u.id,
  u.email,
  u.balance,
  u.frozen_balance as current_frozen,
  COALESCE(uf.expected_frozen, 0) as expected_frozen,
  u.frozen_balance - COALESCE(uf.expected_frozen, 0) as orphan_amount
FROM users u
LEFT JOIN user_freezes uf ON u.id = uf.user_id
WHERE u.frozen_balance > 0
  AND u.frozen_balance != COALESCE(uf.expected_frozen, 0)
ORDER BY orphan_amount DESC;

-- ============================================================================
-- ÉTAPE 2: Corriger automatiquement (DÉCOMMENTER POUR EXÉCUTER)
-- ============================================================================
-- ATTENTION: Cette requête modifie les données. Vérifiez d'abord l'étape 1.
-- ============================================================================

/*
WITH active_freezes AS (
  SELECT 
    user_id,
    SUM(COALESCE(frozen_amount, 0)) as total_frozen_activations
  FROM activations
  WHERE status IN ('pending', 'waiting')
  GROUP BY user_id

  UNION ALL

  SELECT 
    user_id,
    SUM(COALESCE(frozen_amount, 0)) as total_frozen_rentals
  FROM rentals
  WHERE status = 'active'
  GROUP BY user_id
),
user_freezes AS (
  SELECT 
    user_id,
    SUM(total_frozen_activations) as expected_frozen
  FROM active_freezes
  GROUP BY user_id
)
UPDATE users u
SET 
  balance = u.balance + (u.frozen_balance - COALESCE(uf.expected_frozen, 0)),
  frozen_balance = COALESCE(uf.expected_frozen, 0)
FROM user_freezes uf
WHERE u.id = uf.user_id
  AND u.frozen_balance > 0
  AND u.frozen_balance != COALESCE(uf.expected_frozen, 0);
*/

-- ============================================================================
-- ÉTAPE 3: Vérification finale
-- ============================================================================
-- Exécuter après la correction pour confirmer
-- ============================================================================

/*
SELECT 
  COUNT(*) as users_with_frozen,
  SUM(frozen_balance) as total_frozen
FROM users
WHERE frozen_balance > 0;
*/
