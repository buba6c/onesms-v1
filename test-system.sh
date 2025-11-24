#!/bin/bash
# 🧪 Script de test pour ONE SMS V1
# Usage: ./test-system.sh

echo "🧪 TEST DU SYSTÈME ONE SMS V1"
echo "================================"
echo ""

# Test 1: API 5sim
echo "📡 Test 1: API 5sim..."
RESPONSE=$(curl -s -w "\n%{http_code}" 'https://5sim.net/v1/guest/prices?country=france&product=google' | tail -n1)
if [ "$RESPONSE" = "200" ]; then
  echo "✅ API 5sim: OK (200)"
else
  echo "❌ API 5sim: ERREUR ($RESPONSE)"
fi
echo ""

# Test 2: Edge Function
echo "⚡ Test 2: Edge Function sync-5sim..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X OPTIONS 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-5sim' | tail -n1)
if [ "$RESPONSE" = "200" ]; then
  echo "✅ Edge Function: DÉPLOYÉE (200)"
else
  echo "❌ Edge Function: ERREUR ($RESPONSE)"
fi
echo ""

# Test 3: Database - Countries
echo "🗄️  Test 3: Database - Countries..."
RESPONSE=$(curl -s -w "\n%{http_code}" 'https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/countries?select=code&limit=1' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg" | tail -n1)
if [ "$RESPONSE" = "200" ]; then
  echo "✅ Table Countries: ACCESSIBLE"
else
  echo "❌ Table Countries: ERREUR ($RESPONSE)"
fi
echo ""

# Test 4: Database - Pricing Rules (delivery_rate)
echo "📊 Test 4: Column delivery_rate..."
RESPONSE=$(curl -s 'https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/pricing_rules?select=delivery_rate&limit=1' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg")
if [[ "$RESPONSE" == *"delivery_rate"* ]]; then
  echo "✅ Column delivery_rate: EXISTE"
else
  echo "❌ Column delivery_rate: MANQUANTE"
fi
echo ""

# Test 5: Derniers sync logs
echo "📝 Test 5: Derniers sync logs..."
SYNC_STATUS=$(curl -s 'https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/sync_logs?select=status,started_at&order=started_at.desc&limit=1' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg")

if [[ "$SYNC_STATUS" == *'"status":"success"'* ]]; then
  echo "✅ Dernier sync: SUCCÈS"
  echo "$SYNC_STATUS" | grep -o '"started_at":"[^"]*"' | cut -d'"' -f4
elif [[ "$SYNC_STATUS" == *'"status":"error"'* ]]; then
  echo "❌ Dernier sync: ERREUR"
  echo "$SYNC_STATUS" | grep -o '"started_at":"[^"]*"' | cut -d'"' -f4
else
  echo "⚠️  Aucun sync trouvé"
fi
echo ""

# Test 6: Frontend PM2
echo "🌐 Test 6: Frontend PM2..."
PM2_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"onesms-frontend"')
if [ -n "$PM2_STATUS" ]; then
  echo "✅ Frontend PM2: RUNNING"
  pm2 list | grep onesms-frontend
else
  echo "⚠️  Frontend PM2: NON DÉTECTÉ"
fi
echo ""

# Résumé
echo "================================"
echo "📋 RÉSUMÉ"
echo "================================"
echo ""
echo "✅ = Fonctionne"
echo "❌ = Erreur"
echo "⚠️  = Attention"
echo ""
echo "🎯 PROCHAINE ÉTAPE:"
echo "1. Ajouter FIVE_SIM_API_KEY dans Supabase Dashboard"
echo "2. Lancer un sync depuis /admin/services"
echo "3. Relancer ce test avec: ./test-system.sh"
echo ""
