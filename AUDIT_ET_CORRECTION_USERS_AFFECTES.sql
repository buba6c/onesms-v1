-- ===============================================================================
-- 🔍 AUDIT & CORRECTION: Users affectés par le bug balance
-- ===============================================================================
-- 
-- BUGS:
-- 1. atomic_freeze diminuait balance → users perdaient balance
-- 2. atomic_refund augmentait balance → users gagnaient balance gratuits
--
-- Ce script:
-- 1. Identifie tous les users affectés
-- 2. Calcule l'impact exact (balance incorrecte)
-- 3. Propose corrections SQL
-- ===============================================================================

-- ===============================================================================
-- 1️⃣ USERS QUI ONT GAGNÉ BALANCE (atomic_refund bugué)
-- ===============================================================================
SELECT 
  '🔍 Users qui ont GAGNÉ balance incorrectement (refund bugué)' AS analyse;

SELECT 
  user_id,
  COUNT(*) as refunds_incorrects,
  SUM(balance_after - balance_before) as balance_gained_total,
  ARRAY_AGG(id ORDER BY created_at DESC) as operation_ids,
  MIN(created_at) as first_incorrect_refund,
  MAX(created_at) as last_incorrect_refund
FROM balance_operations
WHERE operation_type = 'refund'
  AND balance_after > balance_before  -- ❌ refund qui AUGMENTE balance
  AND created_at > '2024-12-01'
GROUP BY user_id
ORDER BY balance_gained_total DESC;

-- ===============================================================================
-- 2️⃣ USERS QUI ONT PERDU BALANCE (atomic_freeze bugué)
-- ===============================================================================
SELECT 
  '🔍 Users qui ont PERDU balance incorrectement (freeze bugué)' AS analyse;

SELECT 
  user_id,
  COUNT(*) as freezes_incorrects,
  SUM(balance_before - balance_after) as balance_lost_total,
  ARRAY_AGG(id ORDER BY created_at DESC) as operation_ids,
  MIN(created_at) as first_incorrect_freeze,
  MAX(created_at) as last_incorrect_freeze
FROM balance_operations
WHERE operation_type = 'freeze'
  AND balance_after < balance_before  -- ❌ freeze qui DIMINUE balance
  AND created_at > '2024-12-01'
GROUP BY user_id
ORDER BY balance_lost_total DESC;

-- ===============================================================================
-- 3️⃣ DÉTAIL PAR USER: Operations problématiques
-- ===============================================================================
SELECT 
  '📋 Détail des opérations problématiques (dernières 72h)' AS detail;

SELECT 
  bo.user_id,
  bo.operation_type,
  bo.amount,
  bo.balance_before,
  bo.balance_after,
  (bo.balance_after - bo.balance_before) AS balance_change,
  bo.frozen_before,
  bo.frozen_after,
  bo.activation_id,
  bo.rental_id,
  bo.created_at,
  bo.reason
FROM balance_operations bo
WHERE 
  (
    (bo.operation_type = 'freeze' AND bo.balance_after < bo.balance_before) OR
    (bo.operation_type = 'refund' AND bo.balance_after > bo.balance_before)
  )
  AND bo.created_at > NOW() - INTERVAL '72 hours'
ORDER BY bo.created_at DESC
LIMIT 100;

-- ===============================================================================
-- 4️⃣ CALCUL IMPACT NET PAR USER
-- ===============================================================================
-- Net impact = (balance gagné via refund) - (balance perdu via freeze)
-- Si positif: user a gagné balance
-- Si négatif: user a perdu balance

SELECT 
  '💰 Impact NET par user (gain - perte)' AS impact_net;

WITH 
gains AS (
  SELECT 
    user_id,
    SUM(balance_after - balance_before) as balance_gained
  FROM balance_operations
  WHERE operation_type = 'refund'
    AND balance_after > balance_before
    AND created_at > '2024-12-01'
  GROUP BY user_id
),
losses AS (
  SELECT 
    user_id,
    SUM(balance_before - balance_after) as balance_lost
  FROM balance_operations
  WHERE operation_type = 'freeze'
    AND balance_after < balance_before
    AND created_at > '2024-12-01'
  GROUP BY user_id
)
SELECT 
  COALESCE(g.user_id, l.user_id) as user_id,
  COALESCE(g.balance_gained, 0) as balance_gained,
  COALESCE(l.balance_lost, 0) as balance_lost,
  (COALESCE(g.balance_gained, 0) - COALESCE(l.balance_lost, 0)) as net_impact,
  CASE 
    WHEN (COALESCE(g.balance_gained, 0) - COALESCE(l.balance_lost, 0)) > 0 
    THEN '✅ User a GAGNÉ balance'
    WHEN (COALESCE(g.balance_gained, 0) - COALESCE(l.balance_lost, 0)) < 0 
    THEN '❌ User a PERDU balance'
    ELSE '➖ Aucun impact'
  END as verdict,
  u.balance as current_balance,
  u.frozen_balance as current_frozen
FROM gains g
FULL OUTER JOIN losses l ON g.user_id = l.user_id
LEFT JOIN users u ON COALESCE(g.user_id, l.user_id) = u.id
WHERE (COALESCE(g.balance_gained, 0) - COALESCE(l.balance_lost, 0)) != 0
ORDER BY net_impact DESC;

-- ===============================================================================
-- 5️⃣ CORRECTION SQL (À EXÉCUTER APRÈS VALIDATION)
-- ===============================================================================
-- ⚠️  ATTENTION: Valider les montants AVANT d'exécuter!
-- ⚠️  Cette correction remet les balances à leur état correct

SELECT 
  '⚠️  CORRECTION SQL - NE PAS EXÉCUTER SANS VALIDATION!' AS warning;

/*
-- TEMPLATE CORRECTION (UN PAR USER AFFECTÉ)

-- Si user A GAGNÉ 50 Ⓐ incorrectement:
UPDATE users 
SET balance = balance - 50
WHERE id = 'user-id-here';

INSERT INTO balance_operations (
  user_id, operation_type, amount, 
  balance_before, balance_after, 
  description, reason
) VALUES (
  'user-id-here', 
  'correction', 
  -50,
  (SELECT balance + 50 FROM users WHERE id = 'user-id-here'),
  (SELECT balance FROM users WHERE id = 'user-id-here'),
  'Correction bug atomic_refund',
  'User had incorrectly gained 50 Ⓐ from buggy refund operations'
);

-- Si user B A PERDU 30 Ⓐ incorrectement:
UPDATE users 
SET balance = balance + 30
WHERE id = 'user-id-here';

INSERT INTO balance_operations (
  user_id, operation_type, amount, 
  balance_before, balance_after, 
  description, reason
) VALUES (
  'user-id-here', 
  'correction', 
  30,
  (SELECT balance - 30 FROM users WHERE id = 'user-id-here'),
  (SELECT balance FROM users WHERE id = 'user-id-here'),
  'Correction bug atomic_freeze',
  'User had incorrectly lost 30 Ⓐ from buggy freeze operations'
);
*/

-- ===============================================================================
-- 6️⃣ VÉRIFICATION POST-CORRECTION
-- ===============================================================================
SELECT 
  '✅ Vérification: balance_operations cohérentes après correction' AS verification;

-- Après correction, cette query doit retourner 0 ligne
SELECT 
  operation_type,
  COUNT(*) as incorrect_operations
FROM balance_operations
WHERE 
  (
    (operation_type = 'freeze' AND balance_after != balance_before) OR
    (operation_type = 'refund' AND balance_after != balance_before)
  )
  AND created_at > NOW() - INTERVAL '1 hour'  -- Dernière heure après fix
GROUP BY operation_type;

-- ===============================================================================
-- 7️⃣ STATISTIQUES GÉNÉRALES
-- ===============================================================================
SELECT 
  '📊 Statistiques générales des opérations' AS stats;

SELECT 
  operation_type,
  COUNT(*) as total_operations,
  SUM(CASE WHEN balance_after = balance_before THEN 1 ELSE 0 END) as balance_constant,
  SUM(CASE WHEN balance_after > balance_before THEN 1 ELSE 0 END) as balance_increased,
  SUM(CASE WHEN balance_after < balance_before THEN 1 ELSE 0 END) as balance_decreased,
  SUM(CASE WHEN frozen_after = frozen_before THEN 1 ELSE 0 END) as frozen_constant,
  SUM(CASE WHEN frozen_after > frozen_before THEN 1 ELSE 0 END) as frozen_increased,
  SUM(CASE WHEN frozen_after < frozen_before THEN 1 ELSE 0 END) as frozen_decreased
FROM balance_operations
WHERE created_at > '2024-12-01'
GROUP BY operation_type
ORDER BY total_operations DESC;

-- ===============================================================================
-- 8️⃣ INSTRUCTIONS
-- ===============================================================================
-- 
-- ÉTAPE 1: Exécuter sections 1-4 pour identifier impact
-- ÉTAPE 2: Noter tous les user_id avec net_impact != 0
-- ÉTAPE 3: Pour chaque user:
--          - Si net_impact > 0: user a gagné, retirer balance
--          - Si net_impact < 0: user a perdu, ajouter balance
-- ÉTAPE 4: Générer SQL de correction (section 5)
-- ÉTAPE 5: Valider montants avec équipe
-- ÉTAPE 6: Exécuter corrections
-- ÉTAPE 7: Vérifier avec section 6 (doit retourner 0)
-- ÉTAPE 8: Communiquer aux users affectés
-- 
-- ===============================================================================
