#!/bin/bash

# 🎯 RAPPORT FINAL - Deep Analysis Complète

export DATABASE_URL='postgresql://postgres.htfqmamvmhdoixqcbbbw:Workeverytime%404%23%23@aws-1-eu-central-2.pooler.supabase.com:5432/postgres'

echo "════════════════════════════════════════════════════════════════"
echo "📊 RAPPORT FINAL - DEEP ANALYSIS SYSTÈME ATOMIC"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 1. ÉTAT DES FONCTIONS ATOMIQUES
echo "✅ 1. FONCTIONS ATOMIQUES"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  proname as fonction,
  pronargs as params,
  prosecdef as security_definer,
  CASE 
    WHEN prosecdef THEN '✅ SECURITY DEFINER'
    ELSE '❌ Non sécurisé'
  END as status
FROM pg_proc 
WHERE proname IN ('atomic_freeze', 'atomic_commit', 'atomic_refund')
ORDER BY proname, pronargs;
SQL

# 2. TRIGGER DE PROTECTION
echo ""
echo "✅ 2. TRIGGER DE PROTECTION frozen_amount"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%current_user%' THEN '✅ Trigger corrigé (current_user)'
    WHEN pg_get_functiondef(oid) LIKE '%session_user%' THEN '❌ Trigger incorrect (session_user)'
    ELSE '⚠️  Inconnu'
  END as trigger_status
FROM pg_proc 
WHERE proname = 'prevent_direct_frozen_amount_update';
SQL

# 3. ACTIVATIONS/RENTALS EN COURS
echo ""
echo "✅ 3. ACTIVATIONS/RENTALS EN COURS"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  'Activations' as type,
  COUNT(*) as count,
  COALESCE(SUM(frozen_amount), 0) as total_frozen
FROM activations 
WHERE status IN ('pending', 'waiting') AND charged = false
UNION ALL
SELECT 
  'Rentals' as type,
  COUNT(*) as count,
  COALESCE(SUM(frozen_amount), 0) as total_frozen
FROM rentals 
WHERE status IN ('pending', 'active');
SQL

# 4. ORPHELINS (frozen mais status terminal)
echo ""
echo "✅ 4. ORPHELINS À NETTOYER"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  'Activations' as type,
  COUNT(*) as orphans_count,
  COALESCE(SUM(frozen_amount), 0) as total_frozen_orphelin
FROM activations 
WHERE frozen_amount > 0 
  AND status IN ('timeout','failed','cancelled') 
  AND charged = false
UNION ALL
SELECT 
  'Rentals' as type,
  COUNT(*) as orphans_count,
  COALESCE(SUM(frozen_amount), 0) as total_frozen_orphelin
FROM rentals 
WHERE frozen_amount > 0 
  AND status IN ('expired','failed','cancelled');
SQL

# 5. SANTÉ DES BALANCES
echo ""
echo "✅ 5. SANTÉ GLOBALE DES BALANCES"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  (SELECT COUNT(*) FROM users WHERE balance < 0) as balance_negatif,
  (SELECT COUNT(*) FROM users WHERE frozen_balance < 0) as frozen_negatif,
  (SELECT COUNT(*) FROM users WHERE frozen_balance > balance) as frozen_sup_balance,
  (SELECT COUNT(*) FROM users WHERE frozen_balance > 0) as users_with_frozen;
SQL

# 6. COHÉRENCE frozen_balance vs activations/rentals
echo ""
echo "✅ 6. COHÉRENCE frozen_balance"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  u.id,
  u.frozen_balance as frozen_user,
  COALESCE(act.frozen, 0) as frozen_activations,
  COALESCE(rent.frozen, 0) as frozen_rentals,
  u.frozen_balance - COALESCE(act.frozen, 0) - COALESCE(rent.frozen, 0) as discrepancy,
  CASE 
    WHEN u.frozen_balance = COALESCE(act.frozen, 0) + COALESCE(rent.frozen, 0) THEN '✅ Cohérent'
    ELSE '❌ Incohérent'
  END as status
FROM users u
LEFT JOIN (
  SELECT user_id, SUM(frozen_amount) as frozen
  FROM activations
  WHERE status IN ('pending','waiting') AND charged = false
  GROUP BY user_id
) act ON u.id = act.user_id
LEFT JOIN (
  SELECT user_id, SUM(frozen_amount) as frozen
  FROM rentals
  WHERE status IN ('pending','active')
  GROUP BY user_id
) rent ON u.id = rent.user_id
WHERE u.frozen_balance > 0 
   OR act.frozen > 0 
   OR rent.frozen > 0
ORDER BY discrepancy DESC
LIMIT 10;
SQL

# 7. STATISTIQUES balance_operations (dernières 24h)
echo ""
echo "✅ 7. STATISTIQUES OPÉRATIONS (24h)"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  operation_type,
  COUNT(*) as count,
  COALESCE(SUM(amount), 0) as total_amount,
  ROUND(AVG(amount), 2) as avg_amount
FROM balance_operations
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY operation_type
ORDER BY count DESC;
SQL

# 8. CRON JOBS
echo ""
echo "✅ 8. CRON JOBS ACTIFS"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✅ Actif'
    ELSE '❌ Inactif'
  END as status
FROM cron.job 
WHERE jobname IN ('reconcile_orphan_freezes', 'reconcile_rentals_orphan_freezes')
ORDER BY jobname;
SQL

# 9. INDEXES PERFORMANCE
echo ""
echo "✅ 9. PERFORMANCE DES INDEXES"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  indexrelname as index_name,
  idx_scan as scans,
  idx_tup_read as rows_read,
  idx_tup_fetch as rows_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE indexrelname IN ('idx_activations_reconcile', 'idx_rentals_reconcile')
ORDER BY indexrelname;
SQL

# 10. EDGE FUNCTIONS DÉPLOYÉES
echo ""
echo "✅ 10. EDGE FUNCTIONS"
echo "────────────────────────────────────────────────────────────────"
echo "Les edge functions suivantes utilisent les fonctions atomiques :"
echo "  - buy-sms-activate-number (atomic_freeze, atomic_commit, atomic_refund)"
echo "  - buy-sms-activate-rent (atomic_freeze, atomic_commit, atomic_refund)"
echo "  - atomic-timeout-processor (atomic_refund)"
echo "  - cron-check-pending-sms (atomic_refund)"
echo "  - cancel-sms-activate-order (atomic_refund)"
echo ""

# RÉSUMÉ FINAL
echo "════════════════════════════════════════════════════════════════"
echo "🎯 RÉSUMÉ FINAL"
echo "════════════════════════════════════════════════════════════════"
psql $DATABASE_URL << 'SQL'
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM users WHERE balance < 0 OR frozen_balance < 0 OR frozen_balance > balance) = 0
     AND (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('atomic_freeze', 'atomic_commit', 'atomic_refund') AND prosecdef) = 5
     AND (SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'prevent_direct_frozen_amount_update') LIKE '%current_user%'
     AND (SELECT COUNT(*) FROM cron.job WHERE jobname IN ('reconcile_orphan_freezes', 'reconcile_rentals_orphan_freezes') AND active) = 2
    THEN '✅ SYSTÈME 100% OPÉRATIONNEL'
    ELSE '⚠️  SYSTÈME PARTIELLEMENT OPÉRATIONNEL'
  END as status_global;
SQL

echo ""
echo "📋 ACTIONS À SUIVRE:"
echo "  1. Surveiller les orphelins avec: ./monitor_fix.sh"
echo "  2. Si incohérence frozen_balance: psql \$DATABASE_URL -f reconcile_frozen_balance.sql"
echo "  3. Vérifier les Cron Jobs toutes les 5 minutes"
echo ""
echo "════════════════════════════════════════════════════════════════"
