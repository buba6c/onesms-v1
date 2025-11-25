import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 TEST: Simulation exacte du Dashboard\n')
console.log('Filtre: active=true AND total_available>0')
console.log('Tri: popularity_score DESC, total_available DESC\n')

async function testDashboardQuery() {
  const { data: dbServices, error } = await supabase
    .from('services')
    .select('code, name, display_name, icon, total_available, category, popularity_score')
    .eq('active', true)
    .gt('total_available', 0)
    .order('popularity_score', { ascending: false })
    .order('total_available', { ascending: false })
  
  if (error) {
    console.error('❌ Erreur:', error)
    return
  }
  
  console.log(`✅ Total services chargés: ${dbServices.length}\n`)
  
  // Chercher Badoo et Tinder
  const badoo = dbServices.find(s => s.code === 'badoo' || s.name?.toLowerCase().includes('badoo'))
  const tinder = dbServices.find(s => s.code === 'tinder' || s.name?.toLowerCase().includes('tinder'))
  
  console.log('🔍 Recherche "badoo":')
  if (badoo) {
    console.log(`   ✅ TROUVÉ: ${badoo.name} (code: ${badoo.code})`)
    console.log(`      - Total: ${badoo.total_available}`)
    console.log(`      - Category: ${badoo.category}`)
    console.log(`      - Popularity: ${badoo.popularity_score}`)
  } else {
    console.log('   ❌ INTROUVABLE')
  }
  
  console.log('\n🔍 Recherche "tinder":')
  if (tinder) {
    console.log(`   ✅ TROUVÉ: ${tinder.name} (code: ${tinder.code})`)
    console.log(`      - Total: ${tinder.total_available}`)
    console.log(`      - Category: ${tinder.category}`)
    console.log(`      - Popularity: ${tinder.popularity_score}`)
  } else {
    console.log('   ❌ INTROUVABLE')
  }
  
  // Afficher Top 10
  console.log('\n📊 TOP 10 services:')
  dbServices.slice(0, 10).forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.name} (${s.code}): ${s.total_available} - pop=${s.popularity_score}`)
  })
  
  // Filtrer par catégorie dating
  const datingServices = dbServices.filter(s => s.category === 'dating')
  console.log(`\n💕 Services catégorie "dating": ${datingServices.length}`)
  datingServices.slice(0, 5).forEach(s => {
    console.log(`   - ${s.name} (${s.code}): ${s.total_available}`)
  })
}

testDashboardQuery().catch(console.error)
