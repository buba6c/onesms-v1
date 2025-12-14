#!/bin/bash

# ============================================================================
# 🚀 IMPORTATION AUTOMATIQUE DES BACKUPS VIA SSH
# ============================================================================

echo "🔄 Importation automatique vers Coolify"
echo ""

BACKUP_DIR="/Users/mac/Desktop/ONE SMS V1"
COOLIFY_HOST="46.202.171.108"
DB_CONTAINER="supabase-h888cc0ck4w4o0kgw4kg84ks"

echo "📋 Configuration SSH"
read -p "Utilisateur SSH [root]: " SSH_USER
SSH_USER=${SSH_USER:-root}

echo ""
echo "🔑 Test de connexion SSH..."
if ! ssh -o ConnectTimeout=5 "$SSH_USER@$COOLIFY_HOST" "echo '✅ Connexion réussie!'" 2>/dev/null; then
    echo "❌ Impossible de se connecter en SSH"
    echo ""
    echo "Assure-toi que:"
    echo "1. SSH est activé sur ton serveur"
    echo "2. Ta clé SSH est configurée (ssh-copy-id $SSH_USER@$COOLIFY_HOST)"
    echo "3. Le port SSH est ouvert (22)"
    echo ""
    read -p "Veux-tu continuer avec la méthode manuelle? (y/n): " manual
    if [ "$manual" != "y" ]; then
        exit 1
    fi
    
    echo ""
    echo "📋 MÉTHODE MANUELLE"
    echo ""
    echo "1. Copie les fichiers sur ton serveur:"
    echo "   scp $BACKUP_DIR/backup_onesms_20251208.sql $SSH_USER@$COOLIFY_HOST:/tmp/"
    echo "   scp $BACKUP_DIR/backup_auth_20251208.sql $SSH_USER@$COOLIFY_HOST:/tmp/"
    echo ""
    echo "2. Connecte-toi en SSH:"
    echo "   ssh $SSH_USER@$COOLIFY_HOST"
    echo ""
    echo "3. Importe les backups:"
    echo "   docker exec -i $DB_CONTAINER psql -U postgres postgres < /tmp/backup_onesms_20251208.sql"
    echo "   docker exec -i $DB_CONTAINER psql -U postgres postgres < /tmp/backup_auth_20251208.sql"
    echo ""
    echo "4. Nettoie:"
    echo "   rm /tmp/backup_*.sql"
    echo ""
    exit 0
fi

echo ""
echo "📤 Transfert des backups..."
scp "$BACKUP_DIR/backup_onesms_20251208.sql" "$SSH_USER@$COOLIFY_HOST:/tmp/" || {
    echo "❌ Erreur lors du transfert de backup_onesms"
    exit 1
}
scp "$BACKUP_DIR/backup_auth_20251208.sql" "$SSH_USER@$COOLIFY_HOST:/tmp/" || {
    echo "❌ Erreur lors du transfert de backup_auth"
    exit 1
}
echo "✅ Backups transférés"

echo ""
echo "📥 Importation dans PostgreSQL..."
ssh "$SSH_USER@$COOLIFY_HOST" << 'ENDSSH'
echo "🔄 Import de la base de données principale..."
docker exec -i supabase-h888cc0ck4w4o0kgw4kg84ks psql -U postgres postgres < /tmp/backup_onesms_20251208.sql 2>&1 | tail -5

echo "🔄 Import du schéma Auth..."
docker exec -i supabase-h888cc0ck4w4o0kgw4kg84ks psql -U postgres postgres < /tmp/backup_auth_20251208.sql 2>&1 | tail -5

echo "🧹 Nettoyage..."
rm /tmp/backup_*.sql

echo "✅ Importation terminée!"
ENDSSH

echo ""
echo "🎉 MIGRATION RÉUSSIE!"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Applique la nouvelle config:"
echo "   cp .env .env.backup && cp .env.coolify .env"
echo ""
echo "2. Teste la connexion:"
echo "   node test_coolify_connection.mjs"
echo ""
