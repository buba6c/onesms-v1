#!/bin/bash

# ============================================================================
# 🚀 IMPORTATION AUTOMATIQUE COMPLÈTE VIA SSH
# ============================================================================

set -e  # Arrêter en cas d'erreur

BACKUP_DIR="/Users/mac/Desktop/ONE SMS V1"
COOLIFY_HOST="46.202.171.108"
SSH_USER="root"
DB_CONTAINER="supabase-h888cc0ck4w4o0kgw4kg84ks"

echo "🔄 Importation automatique vers Supabase Coolify"
echo ""

# Vérifier les backups
if [ ! -f "$BACKUP_DIR/backup_onesms_20251208.sql" ]; then
    echo "❌ Backup principal introuvable!"
    exit 1
fi
if [ ! -f "$BACKUP_DIR/backup_auth_20251208.sql" ]; then
    echo "❌ Backup auth introuvable!"
    exit 1
fi
echo "✅ Backups trouvés"
echo ""

echo "📤 Étape 1/4: Transfert des backups vers le serveur..."
scp -o StrictHostKeyChecking=no \
    "$BACKUP_DIR/backup_onesms_20251208.sql" \
    "$BACKUP_DIR/backup_auth_20251208.sql" \
    "$SSH_USER@$COOLIFY_HOST:/tmp/" || {
    echo "❌ Erreur lors du transfert"
    echo "💡 Assure-toi que:"
    echo "   - Le serveur est accessible"
    echo "   - Ta clé SSH est configurée"
    exit 1
}
echo "✅ Backups transférés"
echo ""

echo "📥 Étape 2/4: Importation de la base de données principale..."
ssh "$SSH_USER@$COOLIFY_HOST" "docker exec -i $DB_CONTAINER psql -U postgres postgres < /tmp/backup_onesms_20251208.sql" || {
    echo "❌ Erreur lors de l'import principal"
    exit 1
}
echo "✅ Base de données principale importée"
echo ""

echo "📥 Étape 3/4: Importation du schéma Auth..."
ssh "$SSH_USER@$COOLIFY_HOST" "docker exec -i $DB_CONTAINER psql -U postgres postgres < /tmp/backup_auth_20251208.sql" || {
    echo "❌ Erreur lors de l'import auth"
    exit 1
}
echo "✅ Schéma Auth importé"
echo ""

echo "🧹 Étape 4/4: Nettoyage..."
ssh "$SSH_USER@$COOLIFY_HOST" "rm /tmp/backup_*.sql"
echo "✅ Nettoyage terminé"
echo ""

echo "🔍 Vérification de l'importation..."
ssh "$SSH_USER@$COOLIFY_HOST" "docker exec $DB_CONTAINER psql -U postgres postgres -c 'SELECT COUNT(*) as total_users FROM users;'"
ssh "$SSH_USER@$COOLIFY_HOST" "docker exec $DB_CONTAINER psql -U postgres postgres -c 'SELECT COUNT(*) as total_services FROM services;'"
echo ""

echo "🎉 IMPORTATION RÉUSSIE!"
echo ""
echo "📝 Prochaines étapes:"
echo ""
echo "1. Applique la nouvelle configuration:"
echo "   cp .env .env.backup && cp .env.coolify .env"
echo ""
echo "2. Vérifie les clés API dans .env.coolify"
echo ""
echo "3. Déploie les Edge Functions:"
echo "   supabase link --project-ref default"
echo "   supabase functions deploy"
echo ""
echo "4. Test et déploiement:"
echo "   npm run dev  # Teste en local"
echo "   npm run build && netlify deploy --prod"
echo ""
