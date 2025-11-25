import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔬 DEEP ANALYSIS: Architecture complète Tinder/Badoo\n')
console.log('=' .repeat(70))

// ========================================
// PHASE 1: État actuel de la DB
// ========================================
console.log('\n📊 PHASE 1: ÉTAT ACTUEL DE LA BASE DE DONNÉES\n')

// 1.1 Services table
console.log('1.1 TABLE services - Services Tinder/Badoo:')
const { data: allServices } = await supabase
  .from('services')
  .select('id, code, name, icon, active, total_available, popularity_score, category, created_at')
  .or('name.ilike.%tinder%,name.ilike.%badoo%,code.eq.oi,code.eq.qv')
  .order('name')

allServices?.forEach(s => {
  console.log(`   - ${s.name} (code: ${s.code})`)
  console.log(`     Active: ${s.active}, Icon: ${s.icon}, Total: ${s.total_available}`)
  console.log(`     ID: ${s.id}`)
  console.log()
})

// 1.2 Service Icons table
console.log('1.2 TABLE service_icons - Icônes:')
const { data: icons } = await supabase
  .from('service_icons')
  .select('*')
  .in('service_code', ['oi', 'qv', 'tinder', 'badoo'])

if (icons?.length > 0) {
  icons.forEach(icon => {
    console.log(`   - ${icon.service_code}: ${icon.icon_url || 'NULL'}`)
  })
} else {
  console.log('   ⚠️  Aucune icône trouvée')
}

// 1.3 Pricing Rules
console.log('\n1.3 TABLE pricing_rules - Règles de prix:')
const { data: pricing } = await supabase
  .from('pricing_rules')
  .select('service_code, COUNT(*)')
  .in('service_code', ['oi', 'qv', 'tinder', 'badoo'])

console.log(`   ${JSON.stringify(pricing, null, 2)}`)

// 1.4 Activations actives
console.log('\n1.4 TABLE activations - Activations en cours:')
const { data: activations } = await supabase
  .from('activations')
  .select('service_code, status, COUNT(*)')
  .in('service_code', ['oi', 'qv', 'tinder', 'badoo'])
  .in('status', ['pending', 'waiting', 'received'])

console.log(`   ${JSON.stringify(activations, null, 2)}`)

// ========================================
// PHASE 2: Contraintes et dépendances
// ========================================
console.log('\n' + '='.repeat(70))
console.log('\n📋 PHASE 2: CONTRAINTES ET DÉPENDANCES\n')

// 2.1 Foreign Keys qui référencent services.code
console.log('2.1 Tables avec FK vers services.code:')
const tablesWithFK = [
  'service_icons',
  'pricing_rules',
  'activations',
  'country_service_availability'
]

for (const table of tablesWithFK) {
  try {
    const { count: tinderCount } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('service_code', 'tinder')
    
    const { count: badooCount } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('service_code', 'badoo')
    
    if (tinderCount > 0 || badooCount > 0) {
      console.log(`   ⚠️  ${table}: tinder=${tinderCount}, badoo=${badooCount}`)
    } else {
      console.log(`   ✅ ${table}: Aucune référence`)
    }
  } catch (err) {
    console.log(`   ⚠️  ${table}: Erreur accès`)
  }
}

// ========================================
// PHASE 3: Analyse du code frontend
// ========================================
console.log('\n' + '='.repeat(70))
console.log('\n💻 PHASE 3: ANALYSE CODE FRONTEND\n')

console.log('3.1 Fichier: src/lib/logo-service.ts')
console.log('   - SERVICE_DOMAINS mappé: oi → tinder.com ✅')
console.log('   - SERVICE_DOMAINS mappé: qv → badoo.com ✅')
console.log('   - getServiceIcon: oi → ❤️ ✅')
console.log('   - getServiceIcon: qv → 💙 ✅')

console.log('\n3.2 Fichier: src/pages/DashboardPage.tsx')
console.log('   - Ligne 139: .gt("total_available", 0) ⚠️  FILTRE ACTIF')
console.log('   - Impact: Services avec total_available=0 sont cachés')

console.log('\n3.3 Fichier: src/pages/MyNumbersPage.tsx')
console.log('   - Ligne 213: formatPhoneNumber() ✅ Appliqué')
console.log('   - Ligne 292: formatPhoneNumber() ✅ Appliqué')

// ========================================
// PHASE 4: Tests API SMS-Activate
// ========================================
console.log('\n' + '='.repeat(70))
console.log('\n🌐 PHASE 4: TESTS API SMS-ACTIVATE\n')

const apiKey = 'Ac19c4c1e68ec8bcAd5cbe0c42c3b56Ad'
const apiTests = [
  { code: 'oi', name: 'Tinder' },
  { code: 'qv', name: 'Badoo' }
]

for (const test of apiTests) {
  console.log(`4.${apiTests.indexOf(test) + 1} Test ${test.name} (${test.code}):`)
  
  try {
    const url = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${apiKey}&action=getNumbersStatus&country=0&service=${test.code}`
    const response = await fetch(url)
    const data = await response.text()
    
    if (data.includes('NO_NUMBERS') || data.includes('ERROR')) {
      console.log(`   ❌ Aucun numéro disponible (${data.substring(0, 50)})`)
    } else {
      const parsed = JSON.parse(data)
      const totalNumbers = Object.values(parsed).reduce((sum, val) => sum + (typeof val === 'string' ? parseInt(val.split('_')[0] || '0') : 0), 0)
      console.log(`   ✅ ${totalNumbers} numéros disponibles globalement`)
    }
  } catch (err) {
    console.log(`   ⚠️  Erreur API: ${err.message}`)
  }
}

// ========================================
// PHASE 5: Diagnostic des problèmes
// ========================================
console.log('\n' + '='.repeat(70))
console.log('\n🔴 PHASE 5: DIAGNOSTIC DES PROBLÈMES\n')

const problems = []

// Problème 1: Code "tinder" existe encore
if (allServices.some(s => s.code === 'tinder')) {
  problems.push({
    id: 'P1',
    severity: 'CRITIQUE',
    titre: 'Code "tinder" existe encore dans services',
    impact: 'API ne reconnaît pas "tinder", seulement "oi"',
    solution: 'UPDATE services SET code="oi" WHERE code="tinder"'
  })
}

// Problème 2: Code "badoo" existe et est actif
const badooBadCode = allServices.find(s => s.code === 'badoo' && s.active)
if (badooBadCode) {
  problems.push({
    id: 'P2',
    severity: 'CRITIQUE',
    titre: 'Service Badoo avec code "badoo" est actif',
    impact: 'API ne reconnaît pas "badoo", seulement "qv"',
    solution: 'UPDATE services SET active=false WHERE code="badoo"'
  })
}

// Problème 3: Service "qv" a total_available = 0
const badooQv = allServices.find(s => s.code === 'qv')
if (badooQv && badooQv.total_available === 0) {
  problems.push({
    id: 'P3',
    severity: 'HAUTE',
    titre: 'Badoo (qv) a total_available=0',
    impact: 'Filtré par .gt("total_available", 0) dans Dashboard',
    solution: 'Copier total_available depuis code "badoo"'
  })
}

// Problème 4: Service "OI" existe
const oiService = allServices.find(s => s.name === 'OI')
if (oiService) {
  problems.push({
    id: 'P4',
    severity: 'MOYENNE',
    titre: 'Service "OI" bloque le code "oi"',
    impact: 'Contrainte UNIQUE empêche UPDATE de Tinder',
    solution: 'DELETE FROM services WHERE name="OI"'
  })
}

// Problème 5: Icônes incorrectes
const tinderIcon = allServices.find(s => s.code === 'tinder' || s.code === 'oi')
if (tinderIcon && tinderIcon.icon !== '❤️') {
  problems.push({
    id: 'P5',
    severity: 'MOYENNE',
    titre: `Icône Tinder incorrecte: "${tinderIcon.icon}" au lieu de "❤️"`,
    impact: 'Affichage visuel incorrect',
    solution: 'UPDATE services SET icon="❤️" WHERE code="oi"'
  })
}

if (badooQv && badooQv.icon !== '💙') {
  problems.push({
    id: 'P6',
    severity: 'MOYENNE',
    titre: `Icône Badoo incorrecte: "${badooQv.icon}" au lieu de "💙"`,
    impact: 'Affichage visuel incorrect',
    solution: 'UPDATE services SET icon="💙" WHERE code="qv"'
  })
}

// Problème 7: References FK
const fkProblems = []
if (pricing?.some(p => p.service_code === 'tinder')) {
  fkProblems.push('pricing_rules')
}
if (icons?.some(i => i.service_code === 'tinder')) {
  fkProblems.push('service_icons')
}

if (fkProblems.length > 0) {
  problems.push({
    id: 'P7',
    severity: 'CRITIQUE',
    titre: 'Contraintes FK empêchent UPDATE',
    impact: `Tables ${fkProblems.join(', ')} référencent "tinder"`,
    solution: 'UPDATE FK AVANT de modifier services.code'
  })
}

console.log(`Total: ${problems.length} problème(s) identifié(s)\n`)
problems.forEach(p => {
  console.log(`[${p.id}] ${p.severity} - ${p.titre}`)
  console.log(`    Impact: ${p.impact}`)
  console.log(`    Solution: ${p.solution}`)
  console.log()
})

// ========================================
// PHASE 6: Plan d'action séquentiel
// ========================================
console.log('='.repeat(70))
console.log('\n✅ PHASE 6: PLAN D\'ACTION OPTIMAL\n')

console.log('ORDRE D\'EXÉCUTION (critique pour éviter les erreurs FK):')
console.log('')
console.log('Étape 1: Mettre à jour toutes les FK vers les nouveaux codes')
console.log('  1.1 UPDATE service_icons SET service_code="oi" WHERE service_code="tinder"')
console.log('  1.2 UPDATE service_icons SET service_code="qv" WHERE service_code="badoo"')
console.log('  1.3 UPDATE pricing_rules SET service_code="oi" WHERE service_code="tinder"')
console.log('  1.4 UPDATE pricing_rules SET service_code="qv" WHERE service_code="badoo"')
console.log('')
console.log('Étape 2: Libérer le code "oi"')
console.log('  2.1 DELETE FROM services WHERE name="OI" AND active=false')
console.log('')
console.log('Étape 3: Corriger Tinder')
console.log('  3.1 UPDATE services SET code="oi", icon="❤️" WHERE name="Tinder" AND code="tinder"')
console.log('')
console.log('Étape 4: Corriger Badoo')
console.log('  4.1 UPDATE services SET active=false WHERE name="Badoo" AND code="badoo"')
console.log('  4.2 UPDATE services SET active=true, icon="💙", total_available=(SELECT total_available FROM services WHERE code="badoo") WHERE code="qv"')
console.log('')
console.log('Étape 5: Vérifications')
console.log('  5.1 SELECT * FROM services WHERE name IN ("Tinder", "Badoo")')
console.log('  5.2 Test frontend: Rafraîchir et vérifier affichage')
console.log('')
console.log('⚠️  CRITIQUE: Ne PAS inverser l\'ordre, sinon erreurs FK garanties!')
console.log('')
console.log('=' .repeat(70))
