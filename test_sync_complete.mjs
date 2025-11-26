import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qepxgaozywhjbnvqkgfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcHhnYW96eXdoamJudnFrZ2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjY5MDIsImV4cCI6MjA1MTE0MjkwMn0.UQyO-YoKwxqb-3RZ9iMaVN4Zp6I11wCINUg_qLRQEG4'
)

console.log('🔍 TEST COMPLET DE SYNCHRONISATION')
console.log('=' .repeat(60))
console.log('')

// 1. État AVANT synchronisation
console.log('📊 1. ÉTAT AVANT SYNCHRONISATION')
console.log('-'.repeat(60))

const { data: servicesBefore, error: servicesBeforeError } = await supabase
  .from('services')
  .select('code, name, total_available, popularity_score, active')
  .eq('active', true)
  .order('popularity_score', { ascending: false })
  .limit(10)

if (servicesBeforeError) {
  console.error('❌ Erreur:', servicesBeforeError)
} else {
  console.log('\nTop 10 services (avant):')
  servicesBefore.forEach((s, i) => {
    console.log(`  ${i+1}. ${s.code.padEnd(8)} - ${s.name.padEnd(20)} - ${s.total_available.toString().padStart(8)} numbers - score: ${s.popularity_score}`)
  })
}

// Compter pricing_rules
const { count: pricingCount } = await supabase
  .from('pricing_rules')
  .select('*', { count: 'exact', head: true })
  .eq('provider', 'sms-activate')

console.log(`\nPricing rules SMS-Activate: ${pricingCount}`)

// 2. Lancer la synchronisation
console.log('\n\n🚀 2. LANCEMENT DE LA SYNCHRONISATION')
console.log('-'.repeat(60))

const syncStart = Date.now()
const syncResponse = await fetch('https://qepxgaozywhjbnvqkgfr.supabase.co/functions/v1/sync-sms-activate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcHhnYW96eXdoamJudnFrZ2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjY5MDIsImV4cCI6MjA1MTE0MjkwMn0.UQyO-YoKwxqb-3RZ9iMaVN4Zp6I11wCINUg_qLRQEG4`,
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcHhnYW96eXdoamJudnFrZ2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjY5MDIsImV4cCI6MjA1MTE0MjkwMn0.UQyO-YoKwxqb-3RZ9iMaVN4Zp6I11wCINUg_qLRQEG4',
    'Content-Type': 'application/json'
  }
})

const syncDuration = ((Date.now() - syncStart) / 1000).toFixed(2)

if (!syncResponse.ok) {
  console.error(`❌ Erreur HTTP: ${syncResponse.status}`)
  const errorText = await syncResponse.text()
  console.error(errorText)
  process.exit(1)
}

const syncResult = await syncResponse.json()
console.log(`\n✅ Synchronisation terminée en ${syncDuration}s`)
console.log(`   Countries: ${syncResult.data?.countries || 0}`)
console.log(`   Services: ${syncResult.data?.services || 0}`)
console.log(`   Pricing rules: ${syncResult.data?.pricing_rules || 0}`)

// 3. Attendre 2 secondes pour que la fonction RPC se termine
console.log('\n⏳ Attente de 2 secondes...')
await new Promise(resolve => setTimeout(resolve, 2000))

// 4. État APRÈS synchronisation
console.log('\n\n📊 3. ÉTAT APRÈS SYNCHRONISATION')
console.log('-'.repeat(60))

const { data: servicesAfter, error: servicesAfterError } = await supabase
  .from('services')
  .select('code, name, total_available, popularity_score, active')
  .eq('active', true)
  .order('popularity_score', { ascending: false })
  .limit(10)

if (servicesAfterError) {
  console.error('❌ Erreur:', servicesAfterError)
} else {
  console.log('\nTop 10 services (après):')
  servicesAfter.forEach((s, i) => {
    const before = servicesBefore.find(b => b.code === s.code)
    const diff = before ? s.total_available - before.total_available : s.total_available
    const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '='
    const emoji = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️'
    
    console.log(`  ${i+1}. ${s.code.padEnd(8)} - ${s.name.padEnd(20)} - ${s.total_available.toString().padStart(8)} numbers - score: ${s.popularity_score} ${emoji} ${diffStr}`)
  })
}

// Compter pricing_rules après
const { count: pricingCountAfter } = await supabase
  .from('pricing_rules')
  .select('*', { count: 'exact', head: true })
  .eq('provider', 'sms-activate')

console.log(`\nPricing rules SMS-Activate: ${pricingCountAfter} (${pricingCountAfter - pricingCount > 0 ? '+' : ''}${pricingCountAfter - pricingCount})`)

// 5. Vérifications
console.log('\n\n✅ 4. VÉRIFICATIONS')
console.log('-'.repeat(60))

let allGood = true

// Vérif 1: Services ont total_available > 0
const servicesWithZero = servicesAfter.filter(s => s.total_available === 0)
if (servicesWithZero.length > 0) {
  console.log(`❌ ${servicesWithZero.length} services ont encore total_available = 0:`)
  servicesWithZero.forEach(s => console.log(`   - ${s.code}: ${s.name}`))
  allGood = false
} else {
  console.log('✅ Tous les services ont total_available > 0')
}

// Vérif 2: Ordre correct (Instagram premier)
if (servicesAfter[0].code === 'ig') {
  console.log('✅ Instagram est le premier service (score: ' + servicesAfter[0].popularity_score + ')')
} else {
  console.log('❌ Instagram devrait être le premier service, mais on a: ' + servicesAfter[0].code)
  allGood = false
}

// Vérif 3: Ordre correct (Top 5)
const expectedOrder = ['ig', 'wa', 'tg', 'go', 'fb']
const actualOrder = servicesAfter.slice(0, 5).map(s => s.code)
let orderMatch = true
expectedOrder.forEach((code, i) => {
  if (actualOrder[i] !== code) {
    orderMatch = false
  }
})

if (orderMatch) {
  console.log('✅ Ordre correct: Instagram, WhatsApp, Telegram, Google, Facebook')
} else {
  console.log(`❌ Ordre incorrect. Attendu: ${expectedOrder.join(', ')} | Reçu: ${actualOrder.join(', ')}`)
  allGood = false
}

// Vérif 4: Pricing rules créées
if (pricingCountAfter >= 1000) {
  console.log(`✅ ${pricingCountAfter} pricing rules créées`)
} else {
  console.log(`⚠️  Seulement ${pricingCountAfter} pricing rules (attendu: ~2000+)`)
  allGood = false
}

// Résumé final
console.log('\n\n' + '='.repeat(60))
if (allGood) {
  console.log('🎉 SUCCÈS ! La synchronisation fonctionne parfaitement!')
} else {
  console.log('⚠️  PROBLÈMES DÉTECTÉS - Voir ci-dessus')
}
console.log('='.repeat(60))

// 6. Diagnostic détaillé si problème
if (!allGood) {
  console.log('\n\n🔍 5. DIAGNOSTIC DÉTAILLÉ')
  console.log('-'.repeat(60))
  
  // Vérifier si calculate_service_totals existe
  const { data: functions, error: funcError } = await supabase.rpc('calculate_service_totals')
  
  if (funcError) {
    console.log('❌ Fonction calculate_service_totals non trouvée ou erreur:')
    console.log('   ', funcError.message)
    console.log('\n   Solution: Exécuter la migration 027_optimize_service_totals.sql')
  } else {
    console.log('✅ Fonction calculate_service_totals existe et fonctionne')
  }
  
  // Vérifier le total réel dans pricing_rules
  console.log('\n📊 Total réel dans pricing_rules:')
  const { data: realTotals } = await supabase
    .from('pricing_rules')
    .select('service_code, available_count')
    .eq('provider', 'sms-activate')
    .eq('active', true)
  
  if (realTotals) {
    const totals: Record<string, number> = {}
    realTotals.forEach(r => {
      if (!totals[r.service_code]) totals[r.service_code] = 0
      totals[r.service_code] += r.available_count
    })
    
    const top5 = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    
    console.log('   Top 5 services par nombre de numéros:')
    top5.forEach(([code, total], i) => {
      const service = servicesAfter.find(s => s.code === code)
      const serviceTotal = service?.total_available || 0
      const match = serviceTotal === total ? '✅' : '❌'
      console.log(`   ${i+1}. ${code.padEnd(8)} - Réel: ${total.toString().padStart(8)} | Service: ${serviceTotal.toString().padStart(8)} ${match}`)
    })
  }
}
