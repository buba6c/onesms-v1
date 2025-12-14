#!/bin/bash

echo "🚀 DÉPLOIEMENT DES EDGE FUNCTIONS SUR COOLIFY"
echo "=============================================="

# Configuration
COOLIFY_URL="http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io"
SERVICE_ROLE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg"

# Fonctions critiques à déployer en priorité
CRITICAL_FUNCTIONS=(
  "paydunya-create-payment"
  "paydunya-verify-payment"
  "paydunya-webhook"
  "init-moneyfusion-payment"
  "moneyfusion-webhook"
  "buy-sms-activate-number"
  "check-sms-activate-status"
  "get-sms-activate-inbox"
  "sync-services-unified"
  "get-providers-status"
)

echo ""
echo "📦 Déploiement des fonctions critiques..."

for func in "${CRITICAL_FUNCTIONS[@]}"; do
  echo ""
  echo "⚡ Déploiement: $func"
  
  # Utiliser SSH pour déployer via Docker
  sshpass -p 'Bouba@2307##' ssh root@46.202.171.108 <<EOF
    # Créer le dossier de la fonction si nécessaire
    mkdir -p /tmp/functions/$func
    
    # Le déploiement réel se fera via Supabase CLI ou manuellement
    echo "  ✅ Préparé: $func"
EOF
done

echo ""
echo "⚠️  IMPORTANT: Les Edge Functions doivent être déployées manuellement via:"
echo "   1. Dashboard Coolify Supabase"
echo "   2. Ou via supabase CLI après configuration complète"
echo ""
echo "✅ Script terminé"
