-- ===================================================================
-- NETTOYAGE DES ACTIVATIONS OBSOLÈTES (Frozen Balance = 181 Ⓐ)
-- ===================================================================
-- Ce script identifie et corrige les activations en statut 'pending' 
-- ou 'waiting' qui sont expirées mais n'ont pas été mises à jour.
--
-- ÉTAPE 1 : Afficher les activations problématiques
-- ÉTAPE 2 : Marquer comme 'timeout' les activations expirées
-- ÉTAPE 3 : Rembourser les utilisateurs
-- ===================================================================

-- ===================================================================
-- ÉTAPE 1 : DIAGNOSTIC - Afficher les activations gelées
-- ===================================================================
SELECT 
  id,
  user_id,
  order_id,
  phone,
  service_code,
  country_code,
  price,
  status,
  charged,
  expires_at,
  created_at,
  CASE 
    WHEN expires_at < NOW() THEN '⏰ EXPIRÉ'
    WHEN status IN ('pending', 'waiting') AND charged = false THEN '❄️ GELÉ'
    ELSE '✅ OK'
  END as state,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_since_creation
FROM activations
WHERE status IN ('pending', 'waiting') 
  AND charged = false
ORDER BY created_at DESC;

-- Total gelé actuellement
SELECT 
  COUNT(*) as total_frozen_activations,
  SUM(price) as total_frozen_amount
FROM activations
WHERE status IN ('pending', 'waiting') 
  AND charged = false;

-- ===================================================================
-- ÉTAPE 2 : CORRIGER - Marquer les activations expirées comme 'timeout'
-- ===================================================================
UPDATE activations
SET 
  status = 'timeout',
  cancelled_at = NOW()
WHERE status IN ('pending', 'waiting')
  AND charged = false
  AND (
    expires_at < NOW() -- Déjà expiré
    OR created_at < NOW() - INTERVAL '20 minutes' -- Créé il y a plus de 20 min
  );

-- Afficher combien d'activations ont été mises à jour
SELECT 
  COUNT(*) as updated_activations,
  SUM(price) as total_to_refund
FROM activations
WHERE status = 'timeout'
  AND charged = false
  AND cancelled_at > NOW() - INTERVAL '1 minute';

-- ===================================================================
-- ÉTAPE 3 : REMBOURSER - Ajouter les montants gelés au solde
-- ===================================================================
-- ATTENTION : Cette requête va modifier les soldes des utilisateurs !
-- Vérifiez d'abord les résultats de l'ÉTAPE 2 avant d'exécuter.
-- ===================================================================

-- Calculer les remboursements par utilisateur
WITH refunds AS (
  SELECT 
    user_id,
    SUM(price) as refund_amount
  FROM activations
  WHERE status = 'timeout'
    AND charged = false
  GROUP BY user_id
)
SELECT 
  r.user_id,
  u.email,
  u.balance as current_balance,
  r.refund_amount,
  u.balance + r.refund_amount as new_balance
FROM refunds r
JOIN users u ON u.id = r.user_id;

-- DÉCOMMENTER CETTE LIGNE POUR APPLIQUER LES REMBOURSEMENTS :
-- UPDATE users
-- SET balance = balance + (
--   SELECT COALESCE(SUM(price), 0) 
--   FROM activations 
--   WHERE activations.user_id = users.id 
--     AND activations.status = 'timeout'
--     AND activations.charged = false
-- )
-- WHERE id IN (
--   SELECT DISTINCT user_id 
--   FROM activations 
--   WHERE status = 'timeout' 
--     AND charged = false
-- );

-- ===================================================================
-- ÉTAPE 4 : VÉRIFICATION FINALE - Nouveau solde gelé
-- ===================================================================
SELECT 
  COUNT(*) as remaining_frozen_activations,
  SUM(price) as remaining_frozen_amount
FROM activations
WHERE status IN ('pending', 'waiting') 
  AND charged = false;

-- ===================================================================
-- NOTES :
-- - Si remaining_frozen_amount = 0, le problème est résolu ✅
-- - Si remaining_frozen_amount > 0, il y a encore des activations actives
-- - Pensez à créer des transactions 'refunded' pour tracer les remboursements
-- ===================================================================
