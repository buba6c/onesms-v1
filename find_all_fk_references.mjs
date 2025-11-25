import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Recherche de toutes les références à "tinder" et "badoo"\n')

// Tables potentielles avec FK vers services
const tables = [
  'service_icons',
  'pricing_rules', 
  'activations',
  'country_service_availability'
]

for (const table of tables) {
  console.log(`\n📊 Table: ${table}`)
  
  try {
    // Chercher "tinder"
    const { data: tinderData, error: tinderError } = await supabase
      .from(table)
      .select('*')
      .eq('service_code', 'tinder')
      .limit(5)
    
    if (!tinderError && tinderData && tinderData.length > 0) {
      console.log(`   ⚠️  ${tinderData.length} référence(s) à "tinder"`)
    } else if (!tinderError) {
      console.log(`   ✅ Aucune référence à "tinder"`)
    }
    
    // Chercher "badoo"
    const { data: badooData, error: badooError } = await supabase
      .from(table)
      .select('*')
      .eq('service_code', 'badoo')
      .limit(5)
    
    if (!badooError && badooData && badooData.length > 0) {
      console.log(`   ⚠️  ${badooData.length} référence(s) à "badoo"`)
    } else if (!badooError) {
      console.log(`   ✅ Aucune référence à "badoo"`)
    }
    
  } catch (err) {
    console.log(`   ⚠️  Table non accessible ou inexistante`)
  }
}

console.log('\n\n📋 RÉSUMÉ:')
console.log('Le SQL FIX_TINDER_BADOO_FINAL.sql doit mettre à jour TOUTES les tables')
console.log('qui référencent "tinder" ou "badoo" AVANT de changer le code dans services')
