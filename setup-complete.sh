#!/bin/bash

echo "🚀 Configuration complète de One SMS"
echo "====================================="
echo ""

SUPABASE_URL="https://htfqmamvmhdoixqcbbbw.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg"

echo "📝 Étape 1: Vérification de la connexion à Supabase..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/")

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "404" ]; then
  echo "✅ Connexion à Supabase réussie"
else
  echo "❌ Erreur de connexion à Supabase (Code: $RESPONSE)"
  exit 1
fi

echo ""
echo "⚠️  IMPORTANT: Vous devez exécuter les migrations SQL manuellement"
echo ""
echo "📋 Instructions pour compléter la configuration:"
echo ""
echo "1. Ouvrez votre navigateur et allez sur:"
echo "   https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql"
echo ""
echo "2. Dans le SQL Editor, créez une nouvelle query et exécutez le contenu de:"
echo "   📄 supabase/migrations/001_init_schema.sql"
echo ""
echo "3. Cela va créer:"
echo "   ✓ Toutes les tables (users, virtual_numbers, transactions, etc.)"
echo "   ✓ Les indexes pour les performances"
echo "   ✓ Les triggers pour updated_at"
echo "   ✓ Les policies RLS pour la sécurité"
echo "   ✓ Les paramètres système avec vos credentials"
echo "   ✓ Le rôle admin pour admin@onesms.com"
echo ""
echo "4. Une fois les migrations exécutées, connectez-vous sur:"
echo "   http://localhost:3000/login"
echo ""
echo "   📧 Email: admin@onesms.com"
echo "   🔑 Mot de passe: Admin123!"
echo ""
echo "5. Vous aurez accès au panel admin:"
echo "   http://localhost:3000/admin"
echo ""
echo "📌 Note: Les migrations ne peuvent pas être exécutées via l'API REST"
echo "   car elles nécessitent des privilèges postgres (CREATE TABLE, etc.)"
echo ""
echo "✨ L'application est déjà configurée et tourne sur http://localhost:3000"
echo ""
