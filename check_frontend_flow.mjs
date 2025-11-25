import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 ANALYSE FRONTEND: Flow d\'activation\n')

async function checkFrontendFlow() {
  // 1. Vérifier s'il y a des utilisateurs
  const { data: users } = await supabase
    .from('users')
    .select('id, email, balance')
    .limit(5)
  
  console.log('👥 Utilisateurs:')
  if (users && users.length > 0) {
    users.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.email}: ${u.balance} FCFA (ID: ${u.id.slice(0, 8)}...)`)
    })
  } else {
    console.log('   ❌ Aucun utilisateur trouvé')
  }
  
  // 2. Vérifier les pricing rules par service populaire
  console.log('\n\n📊 Pricing rules disponibles:\n')
  
  const popularServices = ['tinder', 'badoo', 'whatsapp', 'telegram', 'facebook']
  
  for (const serviceCode of popularServices) {
    const { data: rules } = await supabase
      .from('pricing_rules')
      .select('country_code, activation_price, available_count, active')
      .eq('service_code', serviceCode)
      .eq('active', true)
      .gt('available_count', 0)
      .limit(5)
    
    if (rules && rules.length > 0) {
      console.log(`✅ ${serviceCode}: ${rules.length} règles`)
      rules.slice(0, 3).forEach(r => {
        console.log(`   ${r.country_code}: ${r.activation_price} FCFA (${r.available_count} dispos)`)
      })
    } else {
      console.log(`❌ ${serviceCode}: AUCUNE règle`)
    }
  }
  
  // 3. Chercher les règles pour Indonesia
  console.log('\n\n🇮🇩 Règles pour Indonesia:\n')
  
  const { data: indonesiaRules } = await supabase
    .from('pricing_rules')
    .select('service_code, country_code, activation_price, available_count')
    .eq('country_code', 'indonesia')
    .eq('active', true)
    .gt('available_count', 0)
    .order('available_count', { ascending: false })
    .limit(10)
  
  if (indonesiaRules && indonesiaRules.length > 0) {
    console.log(`✅ ${indonesiaRules.length} services disponibles en Indonésie`)
    indonesiaRules.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.service_code}: ${r.activation_price} FCFA (${r.available_count} dispos)`)
    })
  } else {
    console.log('❌ Aucune règle pour Indonesia')
    
    // Lister les country_code uniques
    const { data: allRules } = await supabase
      .from('pricing_rules')
      .select('country_code')
      .eq('active', true)
      .gt('available_count', 0)
    
    const uniqueCountries = [...new Set(allRules?.map(r => r.country_code))]
    console.log(`\n📍 Pays disponibles (${uniqueCountries.length}):`)
    console.log(uniqueCountries.slice(0, 20).join(', '))
  }
  
  // 4. Vérifier la table countries
  console.log('\n\n🌍 Table countries:\n')
  
  const { data: countries } = await supabase
    .from('countries')
    .select('*')
    .limit(5)
  
  if (countries && countries.length > 0) {
    console.log('Colonnes disponibles:')
    Object.keys(countries[0]).forEach(col => {
      console.log(`   - ${col}`)
    })
    
    console.log('\nExemples:')
    countries.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.name} (${c.code}) - ID: ${c.id}`)
    })
  } else {
    console.log('❌ Table countries vide')
  }
}

checkFrontendFlow().catch(console.error)
