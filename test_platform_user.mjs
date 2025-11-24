import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
)

console.log('🔍 TEST COMPLET PLATEFORME - CÔTÉ UTILISATEUR\n')
console.log('=' .repeat(60))

// 1. TEST CHARGEMENT SERVICES (comme DashboardPage)
console.log('\n📱 1. TEST CHARGEMENT SERVICES (DB optimisée)')
console.log('-'.repeat(60))

const { data: services, error: servicesError } = await supabase
  .from('services')
  .select('code, name, display_name, total_available, category, popularity_score')
  .eq('active', true)
  .gt('total_available', 0)
  .order('popularity_score', { ascending: false })
  .order('total_available', { ascending: false })
  .limit(10)

if (servicesError) {
  console.error('❌ Erreur chargement services:', servicesError)
} else {
  console.log(`✅ ${services.length} services chargés (top 10)`)
  services.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.display_name || s.name} (${s.code})`)
    console.log(`     📊 ${s.total_available?.toLocaleString()} numéros - Catégorie: ${s.category}`)
  })
}

// 2. TEST DISPONIBILITÉ PAYS (pour un service populaire)
console.log('\n\n�� 2. TEST DISPONIBILITÉ PAYS (get-country-availability)')
console.log('-'.repeat(60))

const testService = 'wa' // WhatsApp
console.log(`Service test: WhatsApp (${testService})`)

try {
  const { data: availabilityData, error: availError } = await supabase.functions.invoke('get-country-availability', {
    body: { 
      service: testService, 
      countries: [187, 4, 6, 22, 12, 0, 36, 10, 78, 43] 
    }
  })

  if (availError) {
    console.error('❌ Erreur:', availError)
  } else {
    console.log(`✅ ${availabilityData.availability?.length || 0} pays disponibles`)
    availabilityData.availability?.slice(0, 5).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.countryName} (${c.countryCode})`)
      console.log(`     📊 ${c.available?.toLocaleString()} numéros disponibles`)
    })
  }
} catch (error) {
  console.error('❌ Erreur Edge Function:', error.message)
}

// 3. TEST PRICING RULES
console.log('\n\n💰 3. TEST RÈGLES DE PRIX')
console.log('-'.repeat(60))

const { data: pricing, error: pricingError } = await supabase
  .from('pricing_rules')
  .select('service_code, country_code, activation_price, active')
  .eq('active', true)
  .limit(10)

if (pricingError) {
  console.error('❌ Erreur pricing:', pricingError)
} else {
  console.log(`✅ ${pricing.length} règles de prix actives (sample)`)
  pricing.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.service_code} @ ${p.country_code}: $${p.activation_price}`)
  })
  
  // Compter total règles actives
  const { count } = await supabase
    .from('pricing_rules')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)
  
  console.log(`\n📊 Total règles de prix actives: ${count?.toLocaleString()}`)
}

// 4. TEST PAYS (success_rate)
console.log('\n\n🏁 4. TEST DONNÉES PAYS (taux de succès)')
console.log('-'.repeat(60))

const { data: countries, error: countriesError } = await supabase
  .from('countries')
  .select('code, name, success_rate, active')
  .eq('active', true)
  .order('success_rate', { ascending: false })
  .limit(5)

if (countriesError) {
  console.error('❌ Erreur pays:', countriesError)
} else {
  console.log(`✅ ${countries.length} meilleurs pays (par taux de succès)`)
  countries.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name} (${c.code}): ${c.success_rate}% succès`)
  })
}

// 5. TEST CATÉGORIES
console.log('\n\n📂 5. TEST CATÉGORIES DE SERVICES')
console.log('-'.repeat(60))

const { data: categories } = await supabase
  .from('services')
  .select('category')
  .eq('active', true)
  .gt('total_available', 0)

const categoryCounts = {}
categories?.forEach(s => {
  const cat = s.category || 'other'
  categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
})

console.log('✅ Distribution par catégorie:')
Object.entries(categoryCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} services`)
  })

// 6. RÉSUMÉ GLOBAL
console.log('\n\n📊 RÉSUMÉ GLOBAL')
console.log('='.repeat(60))

const { count: totalServices } = await supabase
  .from('services')
  .select('*', { count: 'exact', head: true })
  .eq('active', true)

const { count: activeServices } = await supabase
  .from('services')
  .select('*', { count: 'exact', head: true })
  .eq('active', true)
  .gt('total_available', 0)

const { data: totalNumbers } = await supabase
  .from('services')
  .select('total_available')
  .eq('active', true)

const sum = totalNumbers?.reduce((acc, s) => acc + (s.total_available || 0), 0) || 0

console.log(`✅ Services totaux: ${totalServices?.toLocaleString()}`)
console.log(`✅ Services disponibles: ${activeServices?.toLocaleString()}`)
console.log(`✅ Numéros totaux: ${sum.toLocaleString()}`)

console.log('\n✅ TEST COMPLET TERMINÉ!')
console.log('='.repeat(60))
