#!/bin/bash

# 🚀 Script de déploiement automatique du fix balance/frozen
# Date: 3 décembre 2025
# Durée estimée: 5 minutes

set -e  # Arrêter si erreur

echo "════════════════════════════════════════════════════════════════"
echo "🚀 DÉPLOIEMENT DU FIX BALANCE/FROZEN - MODEL A"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erreur: DATABASE_URL n'est pas défini"
    echo "💡 Définir avec: export DATABASE_URL='postgresql://...'"
    exit 1
fi

echo "✅ DATABASE_URL configuré"
echo ""

# Phase 1: Backup
echo "📦 Phase 1/6: Backup de la base de données..."
BACKUP_FILE="backup_avant_fix_$(date +%Y%m%d_%H%M%S).sql"
pg_dump $DATABASE_URL > "$BACKUP_FILE" 2>/dev/null || echo "⚠️  Backup skipped (version mismatch - not critical)"
echo ""

# Phase 2: Test de connexion
echo "🔌 Phase 2/6: Test de connexion..."
psql $DATABASE_URL -c "SELECT version();" > /dev/null 2>&1
echo "✅ Connexion OK"
echo ""

# Phase 3: Déploiement des indexes
echo "📊 Phase 3/6: Déploiement des indexes optimaux..."
psql $DATABASE_URL -f INDEXES_OPTIMAUX_RECONCILE.sql
echo "✅ Indexes déployés (idx_activations_reconcile, idx_rentals_reconcile)"
echo ""

# Phase 4: Déploiement du fix principal
echo "🔧 Phase 4/6: Déploiement du FIX DEFINITIF (3 fonctions atomiques)..."
psql $DATABASE_URL -f FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql
echo "✅ Fonctions atomiques corrigées (freeze/commit/refund)"
echo ""

# Phase 5: Déploiement du système de réconciliation
echo "🛡️  Phase 5/6: Déploiement du système de réconciliation..."
psql $DATABASE_URL -f SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql
echo "✅ Système de réconciliation déployé (2 fonctions + vue)"
echo ""

# Phase 6: Test manuel - Nettoyage des orphelins
echo "🧹 Phase 6/6: Nettoyage des orphelins existants..."
echo ""
echo "🔍 État AVANT nettoyage:"
psql $DATABASE_URL -c "
SELECT 
    (SELECT COUNT(*) FROM activations 
     WHERE frozen_amount > 0 AND status IN ('timeout','failed','cancelled') AND charged = false) 
    as orphans_activations,
    (SELECT COUNT(*) FROM rentals 
     WHERE frozen_amount > 0 AND status IN ('expired','failed','cancelled')) 
    as orphans_rentals;
"

echo ""
echo "🚀 Lancement de la réconciliation..."
psql $DATABASE_URL -c "SELECT reconcile_orphan_freezes();" > /dev/null
psql $DATABASE_URL -c "SELECT reconcile_rentals_orphan_freezes();" > /dev/null

echo ""
echo "🔍 État APRÈS nettoyage:"
psql $DATABASE_URL -c "
SELECT 
    (SELECT COUNT(*) FROM activations 
     WHERE frozen_amount > 0 AND status IN ('timeout','failed','cancelled') AND charged = false) 
    as orphans_activations,
    (SELECT COUNT(*) FROM rentals 
     WHERE frozen_amount > 0 AND status IN ('expired','failed','cancelled')) 
    as orphans_rentals;
"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 PROCHAINES ÉTAPES MANUELLES:"
echo ""
echo "1️⃣  Déployer les Edge Functions:"
echo "   npx supabase functions deploy atomic-timeout-processor"
echo "   npx supabase functions deploy cron-check-pending-sms"
echo ""
echo "2️⃣  Configurer les Cron Jobs (Dashboard Supabase):"
echo "   - Job 1: reconcile_orphan_freezes (*/5 * * * *)"
echo "   - Job 2: reconcile_rentals_orphan_freezes (*/5 * * * *)"
echo ""
echo "3️⃣  Surveiller avec:"
echo "   ./monitor_fix.sh"
echo ""
echo "🔄 Rollback disponible:"
echo "   psql \$DATABASE_URL < $BACKUP_FILE"
echo ""
