-- ANALYSE INTELLIGENTE - ÉCHEC CRÉDIT PAYDUNYA
-- Récupérer les 5 dernières transactions
SELECT 
  id,
  user_id,
  amount,
  status,
  type,
  provider,
  external_id,
  created_at,
  metadata
FROM transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- Vérifier les balances des utilisateurs concernés
SELECT 
  u.id,
  u.email,
  u.balance,
  u.updated_at
FROM users u
WHERE u.id IN (
  SELECT DISTINCT user_id 
  FROM transactions 
  WHERE created_at > NOW() - INTERVAL '24 hours'
  AND user_id IS NOT NULL
);

-- Analyser les transactions avec webhook reçu
SELECT 
  id,
  status,
  created_at,
  metadata->>'webhook_received' as webhook_received,
  metadata->>'webhook_timestamp' as webhook_timestamp,
  metadata->>'paydunya_token' as paydunya_token,
  metadata->>'activations' as activations_expected,
  metadata->>'error' as error_message
FROM transactions 
WHERE created_at > NOW() - INTERVAL '24 hours'
AND provider = 'paydunya'
ORDER BY created_at DESC;

-- Rechercher les erreurs de crédit
SELECT 
  id,
  status,
  created_at,
  metadata->>'error' as error_type,
  metadata->>'error_detail' as error_detail
FROM transactions 
WHERE status = 'pending_credit_error'
OR (metadata->>'error' IS NOT NULL)
ORDER BY created_at DESC
LIMIT 10;
