import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 ANALYSE: Pricing Rules\n')

async function checkPricingRules() {
  // 1. Examiner les colonnes de la table pricing_rules
  const { data: sample, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .limit(1)
    .single()
  
  if (error) {
    console.error('❌ Erreur:', error)
    return
  }
  
  console.log('📊 Colonnes de la table pricing_rules:\n')
  Object.keys(sample).forEach((col, i) => {
    console.log(`   ${i + 1}. ${col}: ${typeof sample[col]} = ${sample[col]}`)
  })
  
  // 2. Vérifier les pricing rules pour Tinder Indonesia
  console.log('\n\n🔍 Pricing rules pour Tinder (Indonesia):\n')
  
  const { data: tinderRules } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('service_code', 'tinder')
    .eq('country_id', 6)
    .eq('active', true)
  
  if (tinderRules && tinderRules.length > 0) {
    console.log(`✅ ${tinderRules.length} règles trouvées`)
    tinderRules.forEach((r, i) => {
      console.log(`\n${i + 1}. Règle ID: ${r.id}`)
      console.log(`   Service: ${r.service_code}`)
      console.log(`   Country ID: ${r.country_id}`)
      console.log(`   Price: ${r.price}`)
      console.log(`   Currency: ${r.currency}`)
      console.log(`   Active: ${r.active}`)
    })
  } else {
    console.log('❌ AUCUNE règle trouvée pour Tinder Indonesia')
    
    // Chercher toutes les règles Tinder
    const { data: allTinder } = await supabase
      .from('pricing_rules')
      .select('country_id, price, currency, active')
      .eq('service_code', 'tinder')
      .limit(10)
    
    console.log('\n📋 Exemple de règles Tinder (10 premiers):')
    allTinder?.forEach((r, i) => {
      console.log(`   ${i + 1}. Country ${r.country_id}: ${r.price} ${r.currency} (active: ${r.active})`)
    })
  }
  
  // 3. Vérifier la table countries
  console.log('\n\n🌍 Pays disponibles:\n')
  
  const { data: countries } = await supabase
    .from('countries')
    .select('id, name, code')
    .in('id', [6, 187, 4])
  
  if (countries) {
    countries.forEach(c => {
      console.log(`   ${c.id}: ${c.name} (${c.code})`)
    })
  }
}

checkPricingRules().catch(console.error)
