import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Vérification Tinder & Badoo dans la DB\n')

// Récupérer Tinder et Badoo
const { data: services } = await supabase
  .from('services')
  .select('*')
  .in('name', ['Tinder', 'Badoo'])

if (!services || services.length === 0) {
  console.log('❌ Tinder/Badoo introuvables dans la DB')
  process.exit(1)
}

services.forEach(s => {
  console.log(`\n📱 ${s.name}`)
  console.log(`   Code SMS-Activate: ${s.code}`)
  console.log(`   Catégorie: ${s.category}`)
  console.log(`   Actif: ${s.active}`)
  console.log(`   Popularité: ${s.popularity_score}`)
  console.log(`   Total disponible: ${s.total_available}`)
})

// Test appel Edge Function avec les bons codes
console.log('\n\n🧪 Test Edge Function avec codes corrects:\n')

for (const service of services) {
  console.log(`📱 ${service.name} (code: ${service.code})`)
  
  try {
    const { data, error } = await supabase.functions.invoke('get-top-countries-by-service', {
      body: { service: service.code }
    })
    
    if (error) {
      console.log(`   ❌ Erreur:`, error.message)
    } else if (data.countries && data.countries.length > 0) {
      console.log(`   ✅ ${data.countries.length} pays disponibles`)
      console.log(`   Top 3: ${data.countries.slice(0, 3).map(c => c.countryName).join(', ')}`)
    } else {
      console.log(`   ⚠️  Aucun pays disponible`)
    }
  } catch (err) {
    console.log(`   ❌ Exception:`, err.message)
  }
}

console.log('\n\n✅ CONCLUSION:')
console.log('Si les tests passent, la correction dans DashboardPage.tsx devrait résoudre le problème')
console.log('La fix: Utiliser directement selectedService.code au lieu du mapping incomplet')
