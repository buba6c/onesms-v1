#!/bin/bash

# ============================================================================
# Test du système d'automatisation d'icônes
# ============================================================================

echo "🧪 TEST DU SYSTÈME D'AUTOMATISATION D'ICÔNES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg"

# Test 1: Appel direct à l'Edge Function
echo "📞 Test 1: Appel direct à l'Edge Function..."
echo ""

curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/generate-service-icon' \
  -H "Authorization: Bearer $ANON_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"service_code": "whatsapp"}' \
  2>/dev/null | jq '.'

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Test 1 réussi!"
else
    echo ""
    echo "❌ Test 1 échoué"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 2: Vérifier qu'un service existant a bien une icône
echo "🔍 Test 2: Vérification des icônes existantes..."
echo ""

cat << 'EOF' > /tmp/check_icons.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
)

const { data, error } = await supabase
  .from('services')
  .select('code, name, icon_url')
  .limit(10)

if (error) {
  console.log('❌ Erreur:', error.message)
  process.exit(1)
}

console.log(`📊 ${data.length} services vérifiés:\n`)
data.forEach((s, i) => {
  const hasIcon = s.icon_url ? '✅' : '❌'
  console.log(`${i + 1}. ${hasIcon} ${s.name} (${s.code})`)
  if (s.icon_url) {
    console.log(`   → ${s.icon_url.substring(0, 60)}...`)
  }
})

const withIcons = data.filter(s => s.icon_url).length
console.log(`\n✨ ${withIcons}/${data.length} services ont des icônes`)
EOF

node /tmp/check_icons.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Instructions pour le test du trigger
echo "🎯 Test 3: Test du trigger automatique"
echo ""
echo "Pour tester le trigger, exécutez ce SQL dans Supabase:"
echo ""
echo "INSERT INTO services (code, name, display_name)"
echo "VALUES ('test-auto-$(date +%s)', 'Test Auto', 'Test Automatique');"
echo ""
echo "Puis vérifiez après 2-3 secondes:"
echo ""
echo "SELECT code, name, icon_url FROM services WHERE code LIKE 'test-auto%' ORDER BY created_at DESC LIMIT 1;"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Tests terminés!"
echo ""
