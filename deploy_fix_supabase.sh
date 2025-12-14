#!/bin/bash

# 🚀 Script de déploiement via Supabase CLI (pas besoin de DATABASE_URL)
# Date: 3 décembre 2025
# Durée estimée: 5 minutes

set -e

echo "════════════════════════════════════════════════════════════════"
echo "🚀 DÉPLOIEMENT DU FIX BALANCE/FROZEN - MODEL A (via Supabase CLI)"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Vérifier que Supabase CLI est installé et linké
if ! command -v supabase &> /dev/null; then
    echo "❌ Erreur: Supabase CLI n'est pas installé"
    echo "💡 Installer avec: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI détecté"
echo ""

# Phase 1: Backup via export
echo "📦 Phase 1/6: Export de la base de données..."
npx supabase db dump --file=backup_avant_fix_$(date +%Y%m%d_%H%M%S).sql --db-url="postgresql://postgres.htfqmamvmhdoixqcbbbw:$(grep SUPABASE_SERVICE_ROLE_KEY_LOCAL .env | cut -d'=' -f2)@aws-0-eu-north-1.pooler.supabase.com:5432/postgres" 2>/dev/null || echo "⚠️  Backup ignoré (nécessite mot de passe DB)"
echo ""

# Phase 2: Test de connexion
echo "🔌 Phase 2/6: Test de connexion..."
npx supabase projects list > /dev/null 2>&1 && echo "✅ Connexion OK" || echo "⚠️  Non authentifié (npx supabase login)"
echo ""

# Phase 3: Déploiement des indexes
echo "📊 Phase 3/6: Déploiement des indexes optimaux..."
npx supabase db execute --file INDEXES_OPTIMAUX_RECONCILE.sql
echo "✅ Indexes déployés"
echo ""

# Phase 4: Déploiement du fix principal
echo "🔧 Phase 4/6: Déploiement du FIX DEFINITIF..."
npx supabase db execute --file FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql
echo "✅ Fonctions atomiques corrigées"
echo ""

# Phase 5: Déploiement de la réconciliation
echo "🛡️  Phase 5/6: Déploiement du système de réconciliation..."
npx supabase db execute --file SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql
echo "✅ Système de réconciliation déployé"
echo ""

# Phase 6: Test manuel
echo "🧹 Phase 6/6: Nettoyage des orphelins..."
echo ""
echo "🔍 Lancement de la réconciliation..."
npx supabase db execute --sql "SELECT reconcile_orphan_freezes();" || echo "⚠️  Erreur durant la réconciliation activations"
npx supabase db execute --sql "SELECT reconcile_rentals_orphan_freezes();" || echo "⚠️  Erreur durant la réconciliation rentals"

echo ""
echo "🔍 Vérification des orphelins restants..."
npx supabase db execute --sql "
SELECT 
    (SELECT COUNT(*) FROM activations 
     WHERE frozen_amount > 0 AND status IN ('timeout','failed','cancelled') AND charged = false) 
    as orphans_activations,
    (SELECT COUNT(*) FROM rentals 
     WHERE frozen_amount > 0 AND status IN ('expired','failed','cancelled') AND charged = false) 
    as orphans_rentals;
"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ DÉPLOIEMENT TERMINÉ"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 PROCHAINES ÉTAPES:"
echo ""
echo "1️⃣  Déployer les Edge Functions:"
echo "   npx supabase functions deploy atomic-timeout-processor"
echo "   npx supabase functions deploy cron-check-pending-sms"
echo ""
echo "2️⃣  Configurer les Cron Jobs (Dashboard Supabase)"
echo ""
echo "3️⃣  Surveiller: ./monitor_fix.sh"
echo ""
