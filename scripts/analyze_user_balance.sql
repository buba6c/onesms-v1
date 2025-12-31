-- ============================================================================
-- ANALYSE COMPLÈTE DU SOLDE DE mbayefaye176@gmail.com
-- ============================================================================

-- ÉTAPE 1: État actuel du compte
-- ============================================================================
SELECT 
  email,
  balance as solde_disponible,
  frozen_balance as solde_gele,
  balance + frozen_balance as solde_total,
  created_at as date_inscription
FROM users 
WHERE email = 'mbayefaye176@gmail.com';

-- ============================================================================
-- ÉTAPE 2: Historique des dépôts (recharges)
-- ============================================================================
SELECT 
  id,
  amount as montant_fcfa,
  credits as credits_ajoutes,
  payment_method as methode,
  status,
  created_at as date_depot
FROM deposits
WHERE user_id = (SELECT id FROM users WHERE email = 'mbayefaye176@gmail.com')
ORDER BY created_at DESC;

-- ============================================================================
-- ÉTAPE 3: Historique des transactions (achats de numéros)
-- ============================================================================
SELECT 
  id,
  type,
  amount as montant,
  description,
  balance_before as solde_avant,
  balance_after as solde_apres,
  created_at as date_transaction
FROM transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'mbayefaye176@gmail.com')
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================
-- ÉTAPE 4: Opérations sur le solde (ledger complet)
-- ============================================================================
SELECT 
  id,
  operation_type as type_operation,
  amount as montant,
  balance_before as solde_avant,
  balance_after as solde_apres,
  frozen_before as gele_avant,
  frozen_after as gele_apres,
  reference_type as ref_type,
  reference_id as ref_id,
  description,
  created_at as date_operation
FROM balance_operations
WHERE user_id = (SELECT id FROM users WHERE email = 'mbayefaye176@gmail.com')
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- ÉTAPE 5: Récapitulatif des activations
-- ============================================================================
SELECT 
  status,
  COUNT(*) as nombre,
  SUM(price) as total_prix,
  SUM(frozen_amount) as total_gele
FROM activations
WHERE user_id = (SELECT id FROM users WHERE email = 'mbayefaye176@gmail.com')
GROUP BY status
ORDER BY status;

-- ============================================================================
-- ÉTAPE 6: Calcul théorique du solde
-- ============================================================================
WITH deposits_total AS (
  SELECT COALESCE(SUM(credits), 0) as total_credits
  FROM deposits
  WHERE user_id = (SELECT id FROM users WHERE email = 'mbayefaye176@gmail.com')
    AND status = 'completed'
),
spent_total AS (
  SELECT COALESCE(SUM(price), 0) as total_depense
  FROM activations
  WHERE user_id = (SELECT id FROM users WHERE email = 'mbayefaye176@gmail.com')
    AND charged = true
),
current_frozen AS (
  SELECT COALESCE(SUM(frozen_amount), 0) as total_gele
  FROM activations
  WHERE user_id = (SELECT id FROM users WHERE email = 'mbayefaye176@gmail.com')
    AND status IN ('pending', 'waiting')
)
SELECT 
  d.total_credits as credits_recus,
  s.total_depense as credits_depenses,
  d.total_credits - s.total_depense as solde_theorique,
  f.total_gele as gele_theorique,
  (SELECT balance FROM users WHERE email = 'mbayefaye176@gmail.com') as solde_reel,
  (SELECT frozen_balance FROM users WHERE email = 'mbayefaye176@gmail.com') as gele_reel
FROM deposits_total d, spent_total s, current_frozen f;
