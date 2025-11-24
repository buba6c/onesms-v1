#!/bin/bash

# Configuration automatique des secrets Supabase Edge Functions
# Ce script configure les variables d'environnement nécessaires

echo "🔧 Configuration des secrets Supabase Edge Functions"
echo "======================================================"
echo ""

PROJECT_REF="htfqmamvmhdoixqcbbbw"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.i31PDBp-K02RqZs35gfqEUQp9OHtxEQ6FqwfBV33wac"
SMS_ACTIVATE_KEY="d29edd5e1d04c3127d5253d5eAe70de8"

echo "📝 Les secrets suivants seront configurés:"
echo "  1. SMS_ACTIVATE_API_KEY"
echo "  2. SERVICE_ROLE_KEY"
echo ""
echo "⚠️  IMPORTANT: Configuration manuelle requise"
echo ""
echo "Supabase ne permet pas la configuration automatique des secrets via CLI."
echo "Tu dois les configurer manuellement dans le Dashboard:"
echo ""
echo "🔗 Lien direct: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo ""
echo "Clique sur \"Add new secret\" et ajoute:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Secret 1:"
echo "  Name:  SMS_ACTIVATE_API_KEY"
echo "  Value: $SMS_ACTIVATE_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Secret 2:"
echo "  Name:  SERVICE_ROLE_KEY"
echo "  Value: $SERVICE_ROLE_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏱️  Temps estimé: 2 minutes"
echo ""
read -p "Appuie sur ENTER une fois les secrets configurés..." 

echo ""
echo "🧪 Test de l'Edge Function..."
echo ""

response=$(curl -s -w "\n%{http_code}" -X POST \
  "https://${PROJECT_REF}.supabase.co/functions/v1/sync-service-counts" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}')

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

echo "📊 Résultat du test:"
echo "HTTP Status: $http_code"
echo ""

if [ "$http_code" -eq 200 ]; then
  echo "✅ SUCCESS! L'Edge Function fonctionne correctement!"
  echo ""
  echo "Response:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  echo ""
  echo "🎯 Prochaines étapes:"
  echo "  1. Configure le secret GitHub: SUPABASE_SERVICE_ROLE_KEY"
  echo "     → https://github.com/buba6c/onesms-v1/settings/secrets/actions"
  echo ""
  echo "  2. Lance le workflow manuellement pour tester"
  echo "     → https://github.com/buba6c/onesms-v1/actions"
  echo ""
  echo "  3. Le cron automatique s'exécutera toutes les 5 minutes! 🚀"
else
  echo "❌ ERREUR: HTTP $http_code"
  echo ""
  echo "Response:"
  echo "$body"
  echo ""
  echo "🔧 Solutions possibles:"
  echo "  - Vérifie que les secrets sont bien configurés dans Supabase"
  echo "  - Attends 30 secondes et réessaie (les secrets mettent du temps à se propager)"
  echo "  - Vérifie les logs: https://supabase.com/dashboard/project/$PROJECT_REF/logs/edge-functions"
fi
