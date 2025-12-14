#!/bin/bash

# 🔄 DÉPLOIEMENT INTELLIGENT DES MIGRATIONS SQL

echo "🔄 DÉPLOIEMENT DES MIGRATIONS SQL SUR COOLIFY"
echo "=============================================="
echo ""

SERVER="root@46.202.171.108"
CONTAINER="supabase-db-h888cc0ck4w4o0kgw4kg84ks"
MIGRATIONS_DIR="supabase/migrations"

# Créer le dossier temporaire sur le serveur
echo "📁 Création du dossier temporaire..."
ssh $SERVER "mkdir -p /tmp/migrations"

# Transférer toutes les migrations
echo "📤 Transfert des migrations..."
scp -r $MIGRATIONS_DIR/*.sql $SERVER:/tmp/migrations/

# Appliquer les migrations dans l'ordre
echo ""
echo "⚡ Application des migrations..."
echo ""

MIGRATIONS=($(ls -1 $MIGRATIONS_DIR/*.sql | sort))
SUCCESS=0
FAILED=0

for migration in "${MIGRATIONS[@]}"; do
    filename=$(basename "$migration")
    echo -n "   📝 $filename ... "
    
    result=$(ssh $SERVER "docker exec -i $CONTAINER psql -U postgres -d postgres < /tmp/migrations/$filename 2>&1")
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✅"
        ((SUCCESS++))
    else
        # Vérifier si c'est juste des warnings
        if echo "$result" | grep -q "ERROR"; then
            echo "⚠️  (avec erreurs)"
            ((FAILED++))
        else
            echo "✅ (warnings)"
            ((SUCCESS++))
        fi
    fi
done

echo ""
echo "📊 Résultat: $SUCCESS réussies, $FAILED échouées"

# Nettoyer
echo ""
echo "🧹 Nettoyage..."
ssh $SERVER "rm -rf /tmp/migrations"

echo ""
echo "✅ Migrations terminées !"
