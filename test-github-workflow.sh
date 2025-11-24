#!/bin/bash

# Test du workflow GitHub Actions localement
# Ce script simule ce que fera le cron job

echo "🧪 Test du workflow GitHub Actions (Sync Service Counts)"
echo "=========================================================="
echo ""

SUPABASE_URL="https://htfqmamvmhdoixqcbbbw.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.i31PDBp-K02RqZs35gfqEUQp9OHtxEQ6FqwfBV33wac"

echo "📡 Appel de l'Edge Function: sync-service-counts"
echo "URL: ${SUPABASE_URL}/functions/v1/sync-service-counts"
echo ""

response=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/functions/v1/sync-service-counts" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}')

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

echo "📊 Résultat:"
echo "HTTP Status: $http_code"
echo ""
echo "Response Body:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"
echo ""

if [ "$http_code" -eq 200 ]; then
  echo "✅ SUCCESS: Le workflow fonctionne correctement!"
  echo ""
  echo "🎯 Prochaines étapes:"
  echo "1. Configure le secret GitHub: SUPABASE_SERVICE_ROLE_KEY"
  echo "2. Va sur: https://github.com/buba6c/onesms-v1/actions"
  echo "3. Lance manuellement le workflow pour tester"
  echo "4. Le cron automatique s'exécutera toutes les 5 minutes"
else
  echo "❌ ERREUR: Le workflow a échoué avec le code $http_code"
  echo ""
  echo "🔧 Debug:"
  echo "- Vérifie que l'Edge Function est déployée"
  echo "- Vérifie les logs Supabase"
  echo "- Le service_role_key est peut-être invalide"
fi
