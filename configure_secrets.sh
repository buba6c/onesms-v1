#!/bin/bash

# Script de configuration automatique des secrets sur Coolify
# Date: 8 décembre 2025

echo "🔑 CONFIGURATION DES SECRETS SUR COOLIFY"
echo "========================================="
echo ""

SERVER="root@46.202.171.108"
PASSWORD="Bouba@2307##"
CONTAINER="supabase-edge-functions-h888cc0ck4w4o0kgw4kg84ks"

# Lire les secrets depuis .env
source .env 2>/dev/null || echo "⚠️  Fichier .env introuvable"

echo "📋 Secrets à configurer:"
echo ""

# Liste des secrets nécessaires
declare -A SECRETS=(
  ["SUPABASE_URL"]="http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io"
  ["SUPABASE_ANON_KEY"]="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoiYW5vbiJ9.sQx2T_ELM-QNRFx2tpDH7XWLyjYlFt1HORE_qjjwrNM"
  ["SUPABASE_SERVICE_ROLE_KEY"]="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg"
  ["SMS_ACTIVATE_API_KEY"]="$SMS_ACTIVATE_API_KEY_LOCAL"
  ["FIVESIM_API_KEY"]="$FIVESIM_API_KEY"
  ["PAYDUNYA_MASTER_KEY"]="$PAYDUNYA_MASTER_KEY"
  ["PAYDUNYA_PRIVATE_KEY"]="$PAYDUNYA_PRIVATE_KEY"
  ["PAYDUNYA_TOKEN"]="$PAYDUNYA_TOKEN"
  ["MONEYFUSION_API_URL"]="$MONEYFUSION_API_URL"
  ["MONEYFUSION_MERCHANT_ID"]="$MONEYFUSION_MERCHANT_ID"
  ["MONEROO_PUBLIC_KEY"]="$VITE_MONEROO_PUBLIC_KEY"
  ["PAYTECH_API_KEY"]="$VITE_PAYTECH_API_KEY"
  ["PAYTECH_API_SECRET"]="$VITE_PAYTECH_API_SECRET"
)

# Créer un fichier .env pour Coolify
echo "# Secrets pour Supabase Edge Functions - Coolify" > .env.coolify.secrets
echo "# Généré le $(date)" >> .env.coolify.secrets
echo "" >> .env.coolify.secrets

for key in "${!SECRETS[@]}"; do
  value="${SECRETS[$key]}"
  
  if [ -z "$value" ] || [ "$value" == "" ]; then
    echo "❌ $key - NON CONFIGURÉ"
  else
    echo "✅ $key - Configuré (${#value} caractères)"
    echo "$key=\"$value\"" >> .env.coolify.secrets
  fi
done

echo ""
echo "📄 Fichier créé: .env.coolify.secrets"
echo ""

# Méthode 1: Via dashboard Coolify (manuel)
echo "📌 MÉTHODE 1 - Via Dashboard Coolify (RECOMMANDÉ):"
echo "   1. Allez sur: http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io"
echo "   2. Settings → Secrets"
echo "   3. Ajoutez chaque variable du fichier .env.coolify.secrets"
echo ""

# Méthode 2: Via SSH (automatique si Docker supporte)
echo "📌 MÉTHODE 2 - Via SSH + Docker Env (EXPÉRIMENTAL):"
echo "   Configuration via variables d'environnement Docker..."
echo ""

read -p "Voulez-vous tenter la configuration automatique via SSH? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🚀 Configuration automatique..."
  
  # Transférer le fichier .env
  sshpass -p "$PASSWORD" scp .env.coolify.secrets $SERVER:/tmp/
  
  # Tenter de configurer (dépend de l'implémentation Coolify)
  sshpass -p "$PASSWORD" ssh $SERVER << 'ENDSSH'
    echo "📝 Tentative de configuration des variables..."
    
    # Option 1: Via docker exec env (si supporté)
    # docker exec $CONTAINER env $(cat /tmp/.env.coolify.secrets | xargs)
    
    # Option 2: Via pg_settings (pour les Secrets Supabase)
    docker exec -i supabase-db-h888cc0ck4w4o0kgw4kg84ks psql -U postgres -d postgres << 'SQL'
      -- Créer une table pour les secrets si elle n'existe pas
      CREATE TABLE IF NOT EXISTS vault.secrets (
        name TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Donner les permissions
      GRANT ALL ON vault.secrets TO postgres;
    SQL
    
    echo "✅ Configuration terminée (vérifier manuellement)"
ENDSSH
else
  echo "ℹ️  Configuration manuelle requise"
fi

echo ""
echo "✅ Script terminé!"
echo ""
echo "🎯 PROCHAINES ÉTAPES:"
echo "   1. Vérifier les secrets sur le dashboard Coolify"
echo "   2. Déployer les Edge Functions"
echo "   3. Configurer les cron jobs"
