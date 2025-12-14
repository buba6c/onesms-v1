#!/bin/bash

# Script pour appliquer la migration wallet atomique
# Utilise l'API REST Supabase pour exécuter le SQL

set -e

echo "🔒 Application de la migration wallet atomique..."

# Charger les variables d'environnement
source .env

# Extraire l'URL et la clé service role
SUPABASE_URL="${VITE_SUPABASE_URL}"
SERVICE_ROLE_KEY="${VITE_SUPABASE_SERVICE_ROLE_KEY}"

# Lire le fichier SQL
SQL_FILE="supabase/migrations/999_wallet_atomic_functions.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Fichier $SQL_FILE introuvable"
    exit 1
fi

echo "📄 Lecture du fichier SQL..."
SQL_CONTENT=$(cat "$SQL_FILE")

# Créer un fichier temporaire avec le SQL
TEMP_SQL=$(mktemp)
echo "$SQL_CONTENT" > "$TEMP_SQL"

echo "🚀 Exécution du SQL..."

# Utiliser curl pour exécuter via l'API REST
# Note: Ceci nécessite que le SQL soit compatible avec l'API REST
# Alternative: utiliser psql si DATABASE_URL est disponible

if [ -n "$DATABASE_URL" ]; then
    echo "📡 Utilisation de psql..."
    psql "$DATABASE_URL" -f "$TEMP_SQL"
else
    echo "⚠️  DATABASE_URL non défini"
    echo ""
    echo "Option 1: Définir DATABASE_URL dans .env"
    echo "Option 2: Copier le SQL dans Supabase Dashboard > SQL Editor"
    echo ""
    echo "Le SQL a été copié dans le presse-papier."
    echo "Collez-le dans Supabase Dashboard > SQL Editor et exécutez."
    
    # Copier dans le presse-papier
    cat "$TEMP_SQL" | pbcopy
    
    # Ouvrir le dashboard Supabase
    SUPABASE_PROJECT_ID=$(echo "$SUPABASE_URL" | sed -n 's/.*\/\/\([^.]*\).*/\1/p')
    open "https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID/sql/new"
fi

# Nettoyer
rm -f "$TEMP_SQL"

echo "✅ Terminé"
