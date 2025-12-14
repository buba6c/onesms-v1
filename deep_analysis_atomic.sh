#!/bin/bash

# 🔍 DEEP ANALYSIS - Vérification complète du système atomic

export DATABASE_URL='postgresql://postgres.htfqmamvmhdoixqcbbbw:Workeverytime%404%23%23@aws-1-eu-central-2.pooler.supabase.com:5432/postgres'

echo "════════════════════════════════════════════════════════════════"
echo "🔍 DEEP ANALYSIS - SYSTÈME ATOMIC COMPLET"
echo "════════════════════════════════════════════════════════════════"
echo ""

# TEST 1: Fonctions atomiques existent
echo "📋 TEST 1/10: Vérifier que les fonctions atomiques existent"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  proname as function_name,
  pronargs as param_count,
  provolatile as volatility,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname IN ('atomic_freeze', 'atomic_commit', 'atomic_refund')
ORDER BY proname;
SQL

# TEST 2: Trigger de protection
echo ""
echo "📋 TEST 2/10: Vérifier le trigger de protection frozen_amount"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname LIKE '%frozen%'
ORDER BY tgname;
SQL

# TEST 3: La fonction du trigger utilise current_user
echo ""
echo "📋 TEST 3/10: Vérifier que prevent_direct_frozen_amount_update utilise current_user"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%current_user%' THEN '✅ Utilise current_user (CORRECT)'
    WHEN pg_get_functiondef(oid) LIKE '%session_user%' THEN '❌ Utilise session_user (INCORRECT)'
    ELSE '⚠️  Inconnu'
  END as status
FROM pg_proc 
WHERE proname = 'prevent_direct_frozen_amount_update';
SQL

# TEST 4: Test atomic_freeze en conditions réelles
echo ""
echo "📋 TEST 4/10: Test atomic_freeze avec utilisateur réel"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
DO $$
DECLARE
  v_user_id UUID := 'e108c02a-2012-4043-bbc2-fb09bb11f824';
  v_test_amount DECIMAL := 1.00;
  v_transaction_id UUID := gen_random_uuid();
  v_result JSON;
  v_balance_before DECIMAL;
  v_frozen_before DECIMAL;
  v_balance_after DECIMAL;
  v_frozen_after DECIMAL;
BEGIN
  -- État avant
  SELECT balance, frozen_balance INTO v_balance_before, v_frozen_before
  FROM users WHERE id = v_user_id;
  
  -- Test freeze
  SELECT atomic_freeze(v_user_id, v_test_amount, v_transaction_id, NULL, NULL, 'Deep test freeze')
  INTO v_result;
  
  -- État après
  SELECT balance, frozen_balance INTO v_balance_after, v_frozen_after
  FROM users WHERE id = v_user_id;
  
  -- Vérifications
  IF v_balance_before = v_balance_after THEN
    RAISE NOTICE '✅ Balance constant (Model A): % = %', v_balance_before, v_balance_after;
  ELSE
    RAISE EXCEPTION '❌ Balance modifié: % -> %', v_balance_before, v_balance_after;
  END IF;
  
  IF v_frozen_after = v_frozen_before + v_test_amount THEN
    RAISE NOTICE '✅ Frozen augmenté correctement: % -> %', v_frozen_before, v_frozen_after;
  ELSE
    RAISE EXCEPTION '❌ Frozen incorrect: % -> % (attendu %)', v_frozen_before, v_frozen_after, v_frozen_before + v_test_amount;
  END IF;
  
  -- Cleanup
  UPDATE users SET frozen_balance = v_frozen_before WHERE id = v_user_id;
  RAISE NOTICE '✅ Test freeze réussi - cleanup effectué';
END $$;
SQL

# TEST 5: Test atomic_commit
echo ""
echo "📋 TEST 5/10: Test atomic_commit"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
DO $$
DECLARE
  v_user_id UUID := 'e108c02a-2012-4043-bbc2-fb09bb11f824';
  v_test_amount DECIMAL := 1.00;
  v_transaction_id UUID := gen_random_uuid();
  v_result JSON;
  v_balance_before DECIMAL;
  v_frozen_before DECIMAL;
  v_balance_after DECIMAL;
  v_frozen_after DECIMAL;
BEGIN
  -- Setup: freeze d'abord
  SELECT atomic_freeze(v_user_id, v_test_amount, v_transaction_id, NULL, NULL, 'Deep test setup')
  INTO v_result;
  
  -- État avant commit
  SELECT balance, frozen_balance INTO v_balance_before, v_frozen_before
  FROM users WHERE id = v_user_id;
  
  -- Test commit
  SELECT atomic_commit(v_user_id, v_test_amount, v_transaction_id, NULL, NULL, 'Deep test commit')
  INTO v_result;
  
  -- État après
  SELECT balance, frozen_balance INTO v_balance_after, v_frozen_after
  FROM users WHERE id = v_user_id;
  
  -- Vérifications
  IF v_balance_after = v_balance_before - v_test_amount AND 
     v_frozen_after = v_frozen_before - v_test_amount THEN
    RAISE NOTICE '✅ Commit correct: balance % -> %, frozen % -> %', 
      v_balance_before, v_balance_after, v_frozen_before, v_frozen_after;
  ELSE
    RAISE EXCEPTION '❌ Commit incorrect: balance % -> %, frozen % -> %', 
      v_balance_before, v_balance_after, v_frozen_before, v_frozen_after;
  END IF;
  
  -- Cleanup (remettre le solde)
  UPDATE users SET balance = v_balance_before + v_test_amount WHERE id = v_user_id;
  RAISE NOTICE '✅ Test commit réussi - cleanup effectué';
END $$;
SQL

# TEST 6: Test atomic_refund
echo ""
echo "📋 TEST 6/10: Test atomic_refund"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
DO $$
DECLARE
  v_user_id UUID := 'e108c02a-2012-4043-bbc2-fb09bb11f824';
  v_test_amount DECIMAL := 1.00;
  v_transaction_id UUID := gen_random_uuid();
  v_result JSON;
  v_balance_before DECIMAL;
  v_frozen_before DECIMAL;
  v_balance_after DECIMAL;
  v_frozen_after DECIMAL;
BEGIN
  -- Setup: freeze d'abord
  SELECT atomic_freeze(v_user_id, v_test_amount, v_transaction_id, NULL, NULL, 'Deep test setup')
  INTO v_result;
  
  -- État avant refund
  SELECT balance, frozen_balance INTO v_balance_before, v_frozen_before
  FROM users WHERE id = v_user_id;
  
  -- Test refund
  SELECT atomic_refund(v_user_id, NULL, NULL, v_transaction_id, 'Deep test refund')
  INTO v_result;
  
  -- État après
  SELECT balance, frozen_balance INTO v_balance_after, v_frozen_after
  FROM users WHERE id = v_user_id;
  
  -- Vérifications
  IF v_balance_after = v_balance_before AND 
     v_frozen_after = v_frozen_before - v_test_amount THEN
    RAISE NOTICE '✅ Refund correct (Model A): balance constant %, frozen % -> %', 
      v_balance_before, v_frozen_before, v_frozen_after;
  ELSE
    RAISE EXCEPTION '❌ Refund incorrect: balance % -> %, frozen % -> %', 
      v_balance_before, v_balance_after, v_frozen_before, v_frozen_after;
  END IF;
  
  RAISE NOTICE '✅ Test refund réussi';
END $$;
SQL

# TEST 7: Vérifier les orphelins actuels
echo ""
echo "📋 TEST 7/10: État des orphelins"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  'Activations' as type,
  COUNT(*) as orphans_count,
  COALESCE(SUM(frozen_amount), 0) as total_frozen
FROM activations 
WHERE frozen_amount > 0 
  AND status IN ('timeout','failed','cancelled') 
  AND charged = false
UNION ALL
SELECT 
  'Rentals' as type,
  COUNT(*) as orphans_count,
  COALESCE(SUM(frozen_amount), 0) as total_frozen
FROM rentals 
WHERE frozen_amount > 0 
  AND status IN ('expired','failed','cancelled');
SQL

# TEST 8: Vérifier les indexes
echo ""
echo "📋 TEST 8/10: Performance des indexes"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as rows_read,
  idx_tup_fetch as rows_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE indexrelname IN ('idx_activations_reconcile', 'idx_rentals_reconcile')
ORDER BY indexrelname;
SQL

# TEST 9: Vérifier les Cron Jobs
echo ""
echo "📋 TEST 9/10: État des Cron Jobs"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname IN ('reconcile_orphan_freezes', 'reconcile_rentals_orphan_freezes')
ORDER BY jobname;
SQL

# TEST 10: Santé globale des balances
echo ""
echo "📋 TEST 10/10: Santé globale du système"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
  (SELECT COUNT(*) FROM users WHERE balance < 0) as balance_negatif,
  (SELECT COUNT(*) FROM users WHERE frozen_balance < 0) as frozen_negatif,
  (SELECT COUNT(*) FROM users WHERE frozen_balance > balance) as frozen_sup_balance,
  (SELECT COUNT(*) FROM activations WHERE frozen_amount > 0 AND status IN ('timeout','failed','cancelled') AND charged = false) as orphans_activations,
  (SELECT COUNT(*) FROM rentals WHERE frozen_amount > 0 AND status IN ('expired','failed','cancelled')) as orphans_rentals,
  (SELECT COUNT(*) FROM balance_operations WHERE operation_type = 'refund' AND reason LIKE 'Reconciliation:%') as auto_reconciliations;
SQL

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ DEEP ANALYSIS TERMINÉE"
echo "════════════════════════════════════════════════════════════════"
