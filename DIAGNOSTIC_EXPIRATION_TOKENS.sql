-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 DIAGNOSTIC COMPLET: POURQUOI LES TOKENS NE SONT PAS LIBÉRÉS À L'EXPIRATION
-- ═══════════════════════════════════════════════════════════════════════════
-- Date: 2025-12-03
-- Analyse intelligente et approfondie du système d'expiration
-- ═══════════════════════════════════════════════════════════════════════════

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '📊 PARTIE 1: ÉTAT ACTUEL DES ACTIVATIONS EXPIRÉES'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- 1.1 Activations expirées avec frozen_balance > 0 (PROBLÈME PRINCIPAL)
\echo '🔴 PROBLÈME: Activations expirées avec fonds ENCORE gelés:'
SELECT 
  id,
  user_id,
  order_id,
  service_code,
  status,
  price,
  frozen_amount,
  charged,
  expires_at,
  NOW() - expires_at as "Expiré depuis",
  created_at,
  updated_at
FROM activations
WHERE expires_at < NOW()
  AND frozen_amount > 0
  AND status NOT IN ('received', 'completed', 'refunded')
ORDER BY expires_at DESC
LIMIT 20;

\echo ''
\echo '📈 Statistiques des activations expirées problématiques:'
SELECT 
  status,
  COUNT(*) as count,
  SUM(frozen_amount) as "Total gelé (Ⓐ)",
  AVG(frozen_amount) as "Moyenne gelée",
  MIN(expires_at) as "Plus ancienne expiration",
  MAX(expires_at) as "Plus récente expiration"
FROM activations
WHERE expires_at < NOW()
  AND frozen_amount > 0
  AND status NOT IN ('received', 'completed', 'refunded')
GROUP BY status
ORDER BY count DESC;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '🔧 PARTIE 2: VÉRIFICATION DES MÉCANISMES D''EXPIRATION'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- 2.1 Vérifier si les CRON jobs existent
\echo '⏰ CRON JOBS CONFIGURÉS:'
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as statut
FROM cron.job
WHERE jobname LIKE '%expired%' OR jobname LIKE '%cleanup%' OR jobname LIKE '%pending%'
ORDER BY jobname;

\echo ''
\echo '📅 DERNIÈRES EXÉCUTIONS DES CRON JOBS:'
SELECT 
  j.jobname,
  r.start_time as "Dernière exécution",
  r.status,
  r.return_message,
  CASE 
    WHEN r.status = 'succeeded' THEN '✅'
    WHEN r.status = 'failed' THEN '❌'
    ELSE '⚠️'
  END as icone
FROM cron.job_run_details r
JOIN cron.job j ON r.jobid = j.jobid
WHERE j.jobname LIKE '%expired%' OR j.jobname LIKE '%cleanup%' OR j.jobname LIKE '%pending%'
ORDER BY r.start_time DESC
LIMIT 10;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '🧪 PARTIE 3: TEST DES FONCTIONS D''EXPIRATION'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- 3.1 Vérifier si atomic_refund existe et fonctionne
\echo '🔍 Fonction atomic_refund:'
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ Existe'
    ELSE '❌ N''existe pas'
  END as statut
FROM information_schema.routines
WHERE routine_name = 'atomic_refund'
  AND routine_schema = 'public';

-- 3.2 Vérifier si secure_unfreeze_balance existe
\echo ''
\echo '🔍 Fonction secure_unfreeze_balance:'
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ Existe'
    ELSE '❌ N''existe pas'
  END as statut
FROM information_schema.routines
WHERE routine_name = 'secure_unfreeze_balance'
  AND routine_schema = 'public';

-- 3.3 Vérifier si process_expired_activations existe
\echo ''
\echo '🔍 Fonction process_expired_activations:'
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ Existe'
    ELSE '❌ N''existe pas'
  END as statut
FROM information_schema.routines
WHERE routine_name = 'process_expired_activations'
  AND routine_schema = 'public';

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '🔬 PARTIE 4: ANALYSE DES BALANCE_OPERATIONS'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- 4.1 Vérifier les opérations de freeze sans refund correspondant
\echo '⚠️ Opérations FREEZE sans REFUND correspondant:'
SELECT 
  bo_freeze.id as freeze_id,
  bo_freeze.user_id,
  bo_freeze.activation_id,
  bo_freeze.amount as "Montant gelé",
  bo_freeze.created_at as "Date freeze",
  a.expires_at as "Date expiration",
  a.status as "Status activation",
  a.frozen_amount as "Frozen actuel",
  CASE 
    WHEN a.expires_at < NOW() THEN '🔴 EXPIRÉ - PAS DE REFUND'
    ELSE '🟢 Non expiré'
  END as probleme
FROM balance_operations bo_freeze
LEFT JOIN activations a ON bo_freeze.activation_id = a.id
WHERE bo_freeze.operation_type = 'freeze'
  AND a.expires_at < NOW()
  AND a.frozen_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM balance_operations bo_refund
    WHERE bo_refund.activation_id = bo_freeze.activation_id
      AND bo_refund.operation_type = 'refund'
  )
ORDER BY bo_freeze.created_at DESC
LIMIT 20;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '💡 PARTIE 5: DIAGNOSTIC DES CAUSES RACINES'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- 5.1 Problème potentiel #1: CRON non configuré
\echo '🔍 Cause #1: CRON jobs manquants ou inactifs?'
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 
      '❌ PROBLÈME MAJEUR: Aucun CRON job configuré pour l''expiration!'
    WHEN COUNT(*) FILTER (WHERE NOT active) > 0 THEN
      '⚠️ PROBLÈME: Des CRON jobs existent mais sont INACTIFS'
    ELSE
      '✅ CRON jobs configurés et actifs'
  END as diagnostic
FROM cron.job
WHERE jobname IN ('cleanup-expired-activations', 'cleanup-expired-rentals', 'cron-check-pending-sms');

-- 5.2 Problème potentiel #2: Edge Function ne fonctionne pas
\echo ''
\echo '🔍 Cause #2: Edge Function cleanup-expired-activations échoue?'
SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'failed') > COUNT(*) FILTER (WHERE status = 'succeeded') THEN
      '❌ PROBLÈME: La fonction échoue plus souvent qu''elle ne réussit'
    WHEN COUNT(*) FILTER (WHERE status = 'succeeded') = 0 THEN
      '❌ PROBLÈME MAJEUR: Aucune exécution réussie récente'
    ELSE
      '✅ La fonction s''exécute avec succès'
  END as diagnostic,
  COUNT(*) FILTER (WHERE status = 'succeeded') as executions_reussies,
  COUNT(*) FILTER (WHERE status = 'failed') as executions_echouees
FROM cron.job_run_details r
JOIN cron.job j ON r.jobid = j.jobid
WHERE j.jobname = 'cleanup-expired-activations'
  AND r.start_time > NOW() - INTERVAL '24 hours';

-- 5.3 Problème potentiel #3: atomic_refund échoue
\echo ''
\echo '🔍 Cause #3: La fonction atomic_refund a-t-elle des erreurs?'
SELECT 
  bo.operation_type,
  bo.reason,
  COUNT(*) as count,
  SUM(bo.amount) as total_amount
FROM balance_operations bo
WHERE bo.operation_type IN ('freeze', 'refund')
  AND bo.created_at > NOW() - INTERVAL '24 hours'
GROUP BY bo.operation_type, bo.reason
ORDER BY bo.created_at DESC;

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '🎯 PARTIE 6: SOLUTION RECOMMANDÉE'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- 6.1 Comptabiliser le problème
SELECT 
  '🔴 PROBLÈME IDENTIFIÉ:' as titre,
  COUNT(*) as "Activations concernées",
  SUM(frozen_amount) as "Total à libérer (Ⓐ)",
  CASE 
    WHEN COUNT(*) > 0 THEN
      'Les tokens ne sont PAS libérés automatiquement à l''expiration'
    ELSE
      'Aucun problème détecté'
  END as conclusion
FROM activations
WHERE expires_at < NOW()
  AND frozen_amount > 0
  AND status NOT IN ('received', 'completed', 'refunded');

\echo ''
\echo '💡 SOLUTIONS POSSIBLES:'
\echo ''
\echo '1. Si CRON jobs manquants → Exécuter SETUP_CRON_JOBS.sql'
\echo '2. Si CRON jobs inactifs → SELECT cron.schedule(...) pour les activer'
\echo '3. Si atomic_refund manque → Déployer secure_frozen_balance_system.sql'
\echo '4. Si problème de logique → Exécuter process_expired_activations() manuellement'
\echo '5. SOLUTION IMMÉDIATE → Exécuter le script de fix ci-dessous'
\echo ''

\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '🚀 PARTIE 7: FIX IMMÉDIAT (MANUEL)'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''
\echo 'Pour libérer MAINTENANT tous les tokens bloqués, exécutez:'
\echo ''
\echo 'SELECT process_expired_activations();'
\echo ''
\echo 'OU si la fonction n''existe pas:'
\echo ''
\echo '-- Libérer manuellement les fonds gelés sur activations expirées'
\echo 'DO $$'
\echo 'DECLARE'
\echo '  v_activation RECORD;'
\echo 'BEGIN'
\echo '  FOR v_activation IN'
\echo '    SELECT id, user_id, frozen_amount'
\echo '    FROM activations'
\echo '    WHERE expires_at < NOW()'
\echo '      AND frozen_amount > 0'
\echo '      AND status NOT IN (''received'', ''completed'', ''refunded'')'
\echo '  LOOP'
\echo '    -- Utiliser secure_unfreeze_balance si disponible'
\echo '    PERFORM secure_unfreeze_balance('
\echo '      v_activation.user_id,'
\echo '      v_activation.id,'
\echo '      true, -- refund_to_balance = true'
\echo '      ''Manual fix: Expired activation'''
\echo '    );'
\echo '  END LOOP;'
\echo 'END $$;'
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
