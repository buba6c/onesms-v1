#!/bin/bash

# Script de déploiement automatique des Edge Functions sur Coolify
# Date: 8 décembre 2025

echo "🚀 DÉPLOIEMENT DES EDGE FUNCTIONS SUR COOLIFY"
echo "=============================================="
echo ""

SERVER="root@46.202.171.108"
PASSWORD="Bouba@2307##"

# Fonctions critiques (priorité 1)
CRITICAL_FUNCTIONS=(
  # Paiements
  "paydunya-create-payment"
  "paydunya-verify-payment"
  "paydunya-webhook"
  "init-moneyfusion-payment"
  "moneyfusion-webhook"
  "init-moneroo-payment"
  "moneroo-webhook"
  "verify-moneroo-payment"
  "paytech-ipn"
  
  # SMS Core
  "buy-sms-activate-number"
  "check-sms-activate-status"
  "get-sms-activate-inbox"
  "finish-sms-activate"
  "cancel-sms-activate-order"
  
  # Webhooks
  "webhook-sms-activate"
  "sms-webhook"
  
  # Services essentiels
  "get-providers-status"
  "sync-services-unified"
)

echo "📦 Fonctions critiques à déployer: ${#CRITICAL_FUNCTIONS[@]}"
echo ""

# Créer une archive de toutes les fonctions
echo "📁 Création de l'archive des fonctions..."
tar -czf edge-functions.tar.gz supabase/functions/

echo "📤 Transfert vers le serveur Coolify..."
sshpass -p "$PASSWORD" scp edge-functions.tar.gz $SERVER:/tmp/

echo "🔧 Déploiement sur le serveur..."
sshpass -p "$PASSWORD" ssh $SERVER << 'ENDSSH'
  cd /tmp
  tar -xzf edge-functions.tar.gz
  
  echo "📂 Fonctions extraites"
  ls -la supabase/functions/ | head -10
  
  # Pour Coolify/Supabase self-hosted, les Edge Functions doivent être
  # déployées via le dashboard ou via l'API Supabase
  
  echo ""
  echo "⚠️  IMPORTANT: Supabase Coolify nécessite un déploiement manuel"
  echo "   des Edge Functions via:"
  echo ""
  echo "   1. Dashboard Supabase → Edge Functions"
  echo "   2. Créer chaque fonction manuellement"
  echo "   3. Copier le code depuis supabase/functions/<nom>/index.ts"
  echo ""
  echo "   OU"
  echo ""
  echo "   1. Utiliser Supabase CLI configuré pour pointer vers Coolify"
  echo "   2. supabase functions deploy --project-ref default"
  echo ""
  
  # Nettoyer
  rm -rf supabase edge-functions.tar.gz
ENDSSH

echo ""
echo "✅ Transfert terminé!"
echo ""
echo "📋 FONCTIONS PRIORITAIRES À DÉPLOYER:"
echo ""

for func in "${CRITICAL_FUNCTIONS[@]}"; do
  echo "   🔴 $func"
done

echo ""
echo "🎯 GUIDE DE DÉPLOIEMENT MANUEL:"
echo ""
echo "Pour chaque fonction critique ci-dessus:"
echo "   1. Ouvrez: http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io"
echo "   2. Allez dans: Edge Functions"
echo "   3. Cliquez: New Function"
echo "   4. Nom: [nom de la fonction]"
echo "   5. Copiez le contenu de: supabase/functions/[nom]/index.ts"
echo "   6. Cliquez: Deploy"
echo ""

# Alternative: Configuration Supabase CLI
echo "📌 ALTERNATIVE - Déploiement via Supabase CLI:"
echo ""
echo "   1. Configurer le CLI pour Coolify:"
echo "      export SUPABASE_URL=http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io"
echo "      export SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAi..."
echo ""
echo "   2. Déployer toutes les fonctions:"
echo "      supabase functions deploy --all"
echo ""
echo "   3. Ou déployer une par une:"
for func in "${CRITICAL_FUNCTIONS[@]}"; do
  echo "      supabase functions deploy $func"
done

echo ""
echo "✅ Script terminé!"

# Nettoyer l'archive locale
rm -f edge-functions.tar.gz
