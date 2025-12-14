#!/bin/bash

# 🚀 Script de déploiement ULTRA SIMPLE (pas besoin de DATABASE_URL)
# Utilise les fichiers SQL directement via l'interface REST

set -e

echo "════════════════════════════════════════════════════════════════"
echo "🚀 DÉPLOIEMENT MANUEL DU FIX (copier-coller dans Supabase SQL Editor)"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "📋 ÉTAPE 1 : Ouvrir le SQL Editor Supabase"
echo "   https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new"
echo ""

echo "📋 ÉTAPE 2 : Copier-coller INDEXES_OPTIMAUX_RECONCILE.sql"
echo "   Fichier prêt : ./INDEXES_OPTIMAUX_RECONCILE.sql"
read -p "   ✅ Appuie sur ENTRÉE quand c'est fait..."
echo ""

echo "📋 ÉTAPE 3 : Copier-coller FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql"
echo "   Fichier prêt : ./FIX_DEFINITIF_MODEL_A_ATOMIC_FUNCTIONS.sql"
read -p "   ✅ Appuie sur ENTRÉE quand c'est fait..."
echo ""

echo "📋 ÉTAPE 4 : Copier-coller SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql"
echo "   Fichier prêt : ./SOLUTION_ROBUSTE_FREEZE_PROTECTION.sql"
read -p "   ✅ Appuie sur ENTRÉE quand c'est fait..."
echo ""

echo "📋 ÉTAPE 5 : Tester la réconciliation"
echo "   Execute dans SQL Editor :"
echo "   SELECT reconcile_orphan_freezes();"
echo ""
read -p "   ✅ Appuie sur ENTRÉE quand c'est fait..."

echo ""
echo "📋 ÉTAPE 6 : Vérifier les orphelins"
echo "   Execute dans SQL Editor :"
echo "   SELECT COUNT(*) FROM activations WHERE frozen_amount > 0 AND status IN ('timeout','failed','cancelled') AND charged = false;"
echo ""
read -p "   ✅ Appuie sur ENTRÉE quand c'est fait..."

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ DÉPLOIEMENT MANUEL TERMINÉ"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 PROCHAINES ÉTAPES:"
echo ""
echo "1️⃣  Déployer les Edge Functions:"
echo "   npx supabase functions deploy atomic-timeout-processor"
echo "   npx supabase functions deploy cron-check-pending-sms"
echo ""
echo "2️⃣  Configurer les Cron Jobs dans le Dashboard Supabase"
echo ""
