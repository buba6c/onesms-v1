#!/bin/bash

##############################################################################
# SCRIPT DE MIGRATION STORAGE + AUTH.USERS
# Ce script migre:
# 1. Le bucket Storage "public-assets" avec tous les fichiers
# 2. La table auth.users (credentials de connexion)
##############################################################################

set -e  # Arrêter si erreur

echo "🔧 MIGRATION STORAGE + AUTH.USERS"
echo "=================================================================="

# Configuration
SSH_HOST="46.202.171.108"
SSH_USER="root"
SSH_PASS="Bouba@2307##"
PG_CONTAINER="supabase-db-h888cc0ck4w4o0kgw4kg84ks"
CLOUD_PROJECT="htfqmamvmhdoixqcbbbw"

# ============================================================================
# 1. MIGRATION DU STORAGE BUCKET
# ============================================================================
echo ""
echo "📦 1. MIGRATION DU BUCKET STORAGE public-assets"
echo "----------------------------------------------------------------"

# Créer dossier temporaire
mkdir -p storage_backup/public-assets

# Télécharger tous les fichiers du bucket (via Supabase CLI)
echo "📥 Téléchargement des fichiers depuis Supabase Cloud..."
if command -v supabase &> /dev/null; then
    echo "   Tentative via Supabase CLI..."
    supabase storage download public-assets --recursive --output ./storage_backup/public-assets/ 2>&1 || {
        echo "   ⚠️  Supabase CLI non disponible ou non connecté"
        echo "   ℹ️  Les fichiers Storage doivent être migrés manuellement via dashboard"
        echo "   URL: https://supabase.com/dashboard/project/$CLOUD_PROJECT/storage/buckets/public-assets"
    }
else
    echo "   ⚠️  Supabase CLI non installé"
    echo "   Installation: brew install supabase/tap/supabase"
fi

# Créer le bucket sur Coolify via SSH + psql
echo ""
echo "📦 Création du bucket sur Coolify..."
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SSH_HOST << 'ENDSSH'
docker exec -i supabase-db-h888cc0ck4w4o0kgw4kg84ks psql -U postgres -d postgres << 'ENDPSQL'
-- Créer le bucket storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  52428800,  -- 50MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

SELECT * FROM storage.buckets WHERE name = 'public-assets';
ENDPSQL
ENDSSH

echo "✅ Bucket créé (ou existe déjà)"

# ============================================================================
# 2. EXPORT DE LA TABLE auth.users
# ============================================================================
echo ""
echo "🔐 2. EXPORT DE LA TABLE auth.users"
echo "----------------------------------------------------------------"

# Note: La table auth.users contient les credentials de connexion
# Elle doit être exportée depuis Supabase Cloud et importée sur Coolify

echo "📋 Informations importantes:"
echo "   - auth.users contient les emails, mots de passe hashés, et tokens"
echo "   - Cette table n'est PAS accessible via l'API normale"
echo "   - Elle doit être exportée via pg_dump depuis Supabase Cloud"
echo ""
echo "⚠️  OPTIONS POUR MIGRER auth.users:"
echo ""
echo "OPTION A: Via Supabase CLI (si connecté au projet Cloud)"
echo "   $ supabase db dump --linked -f backup_auth_users.sql --schema auth"
echo ""
echo "OPTION B: Via pg_dump direct (nécessite accès DB Cloud)"
echo "   $ pg_dump -h db.${CLOUD_PROJECT}.supabase.co \\"
echo "     -U postgres -d postgres \\"
echo "     --schema=auth --table=users \\"
echo "     --data-only \\"
echo "     -f backup_auth_users.sql"
echo ""
echo "OPTION C: Depuis le dashboard Supabase Cloud"
echo "   1. Aller sur: https://supabase.com/dashboard/project/$CLOUD_PROJECT/sql"
echo "   2. Exécuter: SELECT * FROM auth.users;"
echo "   3. Copier les résultats"
echo "   4. Créer un script SQL d'insertion"
echo ""
echo "OPTION D: Recréer les users manuellement (pour petit nombre)"
echo "   - Demander aux users de se réinscrire sur Coolify"
echo "   - Importer seulement les données de la table public.users"
echo ""

# Essayer d'exporter via SQL si possible
echo "🔍 Tentative d'export via requête SQL..."
cat > export_auth_users.sql << 'EOFEXPORT'
-- Script pour exporter auth.users (à exécuter sur Cloud)
-- Copier le résultat de cette requête

SELECT 
    'INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, role, aud) VALUES (' ||
    quote_literal(id::text) || ', ' ||
    quote_literal(email) || ', ' ||
    quote_literal(encrypted_password) || ', ' ||
    quote_nullable(email_confirmed_at) || ', ' ||
    quote_nullable(created_at) || ', ' ||
    quote_nullable(updated_at) || ', ' ||
    quote_literal(raw_user_meta_data::text) || ', ' ||
    quote_literal(role) || ', ' ||
    quote_literal(aud) ||
    ') ON CONFLICT (id) DO NOTHING;'
FROM auth.users;
EOFEXPORT

echo "✅ Script créé: export_auth_users.sql"
echo "   Exécutez ce script sur Supabase Cloud pour générer les INSERT statements"

# ============================================================================
# 3. VÉRIFICATION DES USERS ACTUELS
# ============================================================================
echo ""
echo "📊 3. VÉRIFICATION DES USERS"
echo "----------------------------------------------------------------"

echo "Vérification sur Coolify..."
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SSH_HOST << 'ENDSSH'
docker exec -i supabase-db-h888cc0ck4w4o0kgw4kg84ks psql -U postgres -d postgres << 'ENDPSQL'
-- Compter les users auth
SELECT 
    'auth.users' as table_name,
    COUNT(*) as count
FROM auth.users

UNION ALL

SELECT 
    'public.users' as table_name,
    COUNT(*) as count
FROM public.users;
ENDPSQL
ENDSSH

# ============================================================================
# RÉSUMÉ ET PROCHAINES ÉTAPES
# ============================================================================
echo ""
echo "=================================================================="
echo "📋 RÉSUMÉ"
echo "=================================================================="
echo ""
echo "✅ Bucket Storage public-assets créé sur Coolify"
echo "⏳ Fichiers à uploader manuellement (1 fichier, ~0 MB)"
echo "⏳ Table auth.users à exporter depuis Cloud"
echo ""
echo "📝 PROCHAINES ÉTAPES:"
echo ""
echo "1. Migrer les fichiers Storage:"
echo "   a) Dashboard Cloud → Storage → public-assets → Télécharger"
echo "   b) Dashboard Coolify → Storage → public-assets → Upload"
echo ""
echo "2. Exporter auth.users depuis Cloud:"
echo "   a) Dashboard Cloud → SQL Editor"
echo "   b) Exécuter: SELECT * FROM auth.users;"
echo "   c) Sauvegarder le résultat"
echo ""
echo "3. Importer auth.users sur Coolify:"
echo "   Exécuter: node import_auth_users.mjs"
echo ""
echo "=================================================================="
