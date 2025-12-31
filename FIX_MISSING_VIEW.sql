
-- ========================================================================
-- FIX: Création de la vue manquante v_frozen_balance_health
-- Ceci est nécessaire pour que le script de nettoyage fonctionne.
-- ========================================================================

DROP VIEW IF EXISTS v_frozen_balance_health CASCADE;

CREATE VIEW v_frozen_balance_health AS
SELECT 
  u.id AS user_id,
  u.email,
  u.balance,
  u.frozen_balance,
  COALESCE(SUM(a.frozen_amount), 0) AS total_frozen_in_activations,
  COALESCE(SUM(r.frozen_amount), 0) AS total_frozen_in_rentals,
  (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0)) AS expected_frozen,
  u.frozen_balance - (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0)) AS frozen_diff,
  CASE
    WHEN u.balance < 0 THEN 'CRITICAL: Negative balance'
    WHEN u.frozen_balance > u.balance THEN 'CRITICAL: Frozen > Balance'
    WHEN ABS(u.frozen_balance - (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0))) > 0.01 
      THEN 'WARNING: Frozen mismatch'
    ELSE 'OK'
  END AS health_status,
  NOW() AS checked_at
FROM users u
LEFT JOIN activations a ON a.user_id = u.id AND a.status IN ('pending', 'waiting') AND a.frozen_amount > 0
LEFT JOIN rentals r ON r.user_id = u.id AND r.status = 'active' AND r.frozen_amount > 0
GROUP BY u.id, u.email, u.balance, u.frozen_balance
HAVING 
  u.balance < 0
  OR u.frozen_balance > u.balance
  OR ABS(u.frozen_balance - (COALESCE(SUM(a.frozen_amount), 0) + COALESCE(SUM(r.frozen_amount), 0))) > 0.01;

-- Index pour performance (optionnel mais recommandé)
CREATE INDEX IF NOT EXISTS idx_activations_frozen ON activations(user_id, status) WHERE frozen_amount > 0;
CREATE INDEX IF NOT EXISTS idx_rentals_frozen ON rentals(user_id, status) WHERE frozen_amount > 0;

-- Permissions
GRANT SELECT ON v_frozen_balance_health TO authenticated, anon, service_role;
