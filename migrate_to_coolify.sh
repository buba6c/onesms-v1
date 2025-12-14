#!/bin/bash

# ============================================================================
# 🚀 SCRIPT D'IMPORTATION SUPABASE CLOUD → SUPABASE SELF-HOSTED (COOLIFY)
# ============================================================================

echo "🔄 Migration Supabase vers Coolify"
echo ""

# Configuration
BACKUP_DIR="/Users/mac/Desktop/ONE SMS V1"
DB_BACKUP="$BACKUP_DIR/backup_onesms_20251208.sql"
AUTH_BACKUP="$BACKUP_DIR/backup_auth_20251208.sql"

# Informations Coolify Supabase
COOLIFY_HOST="46.202.171.108"
SUPABASE_DOMAIN="supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io"

echo "📋 Étape 1: Vérification des fichiers de backup"
if [ ! -f "$DB_BACKUP" ]; then
    echo "❌ Fichier $DB_BACKUP introuvable!"
    exit 1
fi
if [ ! -f "$AUTH_BACKUP" ]; then
    echo "❌ Fichier $AUTH_BACKUP introuvable!"
    exit 1
fi
echo "✅ Backups trouvés"
echo ""

echo "📋 Étape 2: Récupération du mot de passe PostgreSQL"
echo "Va dans Coolify → Supabase → Environment Variables"
echo "Copie la valeur de SERVICE_PASSWORD_POSTGRES"
read -sp "Entre le mot de passe PostgreSQL: " POSTGRES_PASSWORD
echo ""
echo ""

echo "📋 Étape 3: Récupération du nom du container PostgreSQL"
echo "Entre le nom du container Supabase DB (généralement 'supabase-db' ou similaire)"
read -p "Nom du container DB [supabase-db]: " DB_CONTAINER
DB_CONTAINER=${DB_CONTAINER:-supabase-db}
echo ""

echo "🔄 Étape 4: Importation de la base de données"
echo "Méthode 1: Si tu as accès SSH au serveur Coolify"
echo ""
echo "Exécute ces commandes sur ton serveur:"
echo ""
echo "# 1. Transférer les backups"
echo "scp $DB_BACKUP root@$COOLIFY_HOST:/tmp/"
echo "scp $AUTH_BACKUP root@$COOLIFY_HOST:/tmp/"
echo ""
echo "# 2. Importer dans PostgreSQL"
echo "docker exec -i $DB_CONTAINER psql -U postgres -d postgres < /tmp/backup_onesms_20251208.sql"
echo "docker exec -i $DB_CONTAINER psql -U postgres -d postgres < /tmp/backup_auth_20251208.sql"
echo ""
echo "# 3. Nettoyer"
echo "rm /tmp/backup_*.sql"
echo ""
echo "──────────────────────────────────────────────────────────"
echo ""
echo "Méthode 2: Via pgAdmin ou interface Supabase"
echo "1. Va sur: http://$SUPABASE_DOMAIN/project/default"
echo "2. Clique sur 'SQL Editor'"
echo "3. Copie/colle le contenu de backup_onesms_20251208.sql"
echo "4. Exécute"
echo "5. Répète avec backup_auth_20251208.sql"
echo ""

read -p "Appuie sur Entrée une fois l'importation terminée..."

echo ""
echo "📋 Étape 5: Récupération des clés API Supabase"
echo "Va sur: http://$SUPABASE_DOMAIN/project/default/settings/api"
echo ""
read -p "Entre ANON_KEY: " ANON_KEY
read -p "Entre SERVICE_ROLE_KEY: " SERVICE_ROLE_KEY
echo ""

echo "📋 Étape 6: Création du fichier .env.coolify"
cat > "$BACKUP_DIR/.env.coolify" << EOF
# Supabase Self-Hosted sur Coolify
VITE_SUPABASE_URL=http://$SUPABASE_DOMAIN
VITE_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# Base de données
DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@$COOLIFY_HOST:5432/postgres
EOF

echo "✅ Fichier .env.coolify créé!"
echo ""

echo "🎉 MIGRATION TERMINÉE!"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Remplace ton .env par .env.coolify:"
echo "   cp .env .env.backup && cp .env.coolify .env"
echo ""
echo "2. Déploie les Edge Functions:"
echo "   supabase link --project-ref default"
echo "   supabase functions deploy"
echo ""
echo "3. Rebuild et déploie ton frontend:"
echo "   npm run build"
echo "   netlify deploy --prod"
echo ""
echo "✅ Ton projet utilisera maintenant Supabase self-hosted sur Coolify!"
