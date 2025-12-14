#!/bin/bash

# 🔍 Script de monitoring du fix balance/frozen
# À lancer après déploiement pour vérifier que tout fonctionne

echo "════════════════════════════════════════════════════════════════"
echo "🔍 MONITORING DU FIX BALANCE/FROZEN"
echo "════════════════════════════════════════════════════════════════"
echo ""

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erreur: DATABASE_URL n'est pas défini"
    exit 1
fi

echo "📊 1. État des orphelins"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
    'Activations' as type,
    COUNT(*) as orphans_count
FROM activations 
WHERE frozen_amount > 0 
  AND status IN ('timeout','failed','cancelled') 
  AND charged = false
UNION ALL
SELECT 
    'Rentals' as type,
    COUNT(*) as orphans_count
FROM rentals 
WHERE frozen_amount > 0 
  AND status IN ('expired','failed','cancelled');
SQL

echo ""
echo "📈 2. Usage des indexes"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
    indexrelname as indexname,
    idx_scan as scans_count,
    idx_tup_read as rows_read,
    idx_tup_fetch as rows_fetched
FROM pg_stat_user_indexes 
WHERE indexrelname IN ('idx_activations_reconcile', 'idx_rentals_reconcile')
ORDER BY indexrelname;
SQL

echo ""
echo "⚡ 3. Performance des réconciliations (dernière heure)"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
    COUNT(*) as reconciliations_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (created_at - created_at)) * 1000)::numeric, 2) as avg_duration_ms,
    MIN(created_at) as first_reconciliation,
    MAX(created_at) as last_reconciliation
FROM balance_operations 
WHERE operation_type = 'refund' 
  AND reason LIKE 'Reconciliation:%' 
  AND created_at > NOW() - INTERVAL '1 hour';
SQL

echo ""
echo "🔄 4. Réconciliations par type (dernières 24h)"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
    CASE 
        WHEN reason LIKE '%orphan freeze cleanup%' THEN 'Activations'
        WHEN reason LIKE '%rental%' THEN 'Rentals'
        ELSE 'Autre'
    END as type,
    COUNT(*) as count
FROM balance_operations 
WHERE operation_type = 'refund' 
  AND reason LIKE 'Reconciliation:%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY type
ORDER BY count DESC;
SQL

echo ""
echo "💰 5. Santé globale des balances"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT * FROM v_frozen_balance_health_reconciliation
ORDER BY frozen_discrepancy ASC
LIMIT 10;
SQL

echo ""
echo "⚠️  6. Anomalies potentielles"
echo "────────────────────────────────────────────────────────────────"
psql $DATABASE_URL << 'SQL'
SELECT 
    'Balance négatif' as anomaly_type,
    COUNT(*) as count
FROM users 
WHERE balance < 0
UNION ALL
SELECT 
    'Frozen négatif' as anomaly_type,
    COUNT(*) as count
FROM users 
WHERE frozen_balance < 0
UNION ALL
SELECT 
    'Frozen > Balance' as anomaly_type,
    COUNT(*) as count
FROM users 
WHERE frozen_balance > balance;
SQL

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ MONITORING TERMINÉ"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 CRITÈRES DE SUCCÈS:"
echo "  ✓ Orphelins = 0"
echo "  ✓ Index scans > 50"
echo "  ✓ Anomalies = 0"
echo ""
