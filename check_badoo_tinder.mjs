import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Vérification Badoo et Tinder\n')

async function checkServices() {
  // Chercher par code
  const { data: badoo } = await supabase
    .from('services')
    .select('*')
    .eq('code', 'qv')
    .single()
  
  const { data: tinder } = await supabase
    .from('services')
    .select('*')
    .eq('code', 'oi')
    .single()
  
  console.log('📱 BADOO (code: qv)')
  if (badoo) {
    console.log(`   Name: ${badoo.name}`)
    console.log(`   Active: ${badoo.active}`)
    console.log(`   Total Available: ${badoo.total_available}`)
    console.log(`   Category: ${badoo.category}`)
  } else {
    console.log('   ❌ INTROUVABLE dans la DB')
  }
  
  console.log('\n🔥 TINDER (code: oi)')
  if (tinder) {
    console.log(`   Name: ${tinder.name}`)
    console.log(`   Active: ${tinder.active}`)
    console.log(`   Total Available: ${tinder.total_available}`)
    console.log(`   Category: ${tinder.category}`)
  } else {
    console.log('   ❌ INTROUVABLE dans la DB')
  }
  
  // Chercher aussi par nom
  console.log('\n🔍 Recherche par nom...\n')
  
  const { data: badooByName } = await supabase
    .from('services')
    .select('code, name, active, total_available')
    .ilike('name', '%badoo%')
  
  const { data: tinderByName } = await supabase
    .from('services')
    .select('code, name, active, total_available')
    .ilike('name', '%tinder%')
  
  if (badooByName && badooByName.length > 0) {
    console.log('📱 Services contenant "badoo":')
    badooByName.forEach(s => {
      console.log(`   ${s.code}: ${s.name} - active=${s.active}, available=${s.total_available}`)
    })
  } else {
    console.log('📱 Aucun service "badoo" trouvé')
  }
  
  if (tinderByName && tinderByName.length > 0) {
    console.log('\n🔥 Services contenant "tinder":')
    tinderByName.forEach(s => {
      console.log(`   ${s.code}: ${s.name} - active=${s.active}, available=${s.total_available}`)
    })
  } else {
    console.log('\n🔥 Aucun service "tinder" trouvé')
  }
  
  // Tester le filtre du Dashboard
  console.log('\n📊 TEST: Services qui apparaissent dans le Dashboard')
  console.log('    Filtre: active=true AND total_available>0\n')
  
  const { data: dashboardServices } = await supabase
    .from('services')
    .select('code, name, total_available')
    .eq('active', true)
    .gt('total_available', 0)
    .in('code', ['qv', 'oi'])
  
  if (dashboardServices && dashboardServices.length > 0) {
    dashboardServices.forEach(s => {
      console.log(`   ✅ ${s.name} (${s.code}): ${s.total_available} disponibles`)
    })
  } else {
    console.log('   ❌ Ni Badoo ni Tinder ne passent le filtre')
  }
}

checkServices().catch(console.error)
