#!/bin/bash

# Test de la fonction sync-sms-activate-activations
# Ce script appelle l'Edge Function pour récupérer les SMS manqués

echo "🔄 Appel de sync-sms-activate-activations..."
echo ""

# Remplacez par votre vraie clé anon
SUPABASE_URL="https://htfqmamvmhdoixqcbbbw.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwNDU0NDYsImV4cCI6MjA0NzYyMTQ0Nn0.xxx"

# Appel de la fonction
curl -X POST "${SUPABASE_URL}/functions/v1/sync-sms-activate-activations" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json"

echo ""
echo ""
echo "✅ Fait! Vérifiez maintenant dans la DB:"
echo "SELECT phone, status, sms_code, sms_text FROM activations WHERE phone = '6283187992496';"
