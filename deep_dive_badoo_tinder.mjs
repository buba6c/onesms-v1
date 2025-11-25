import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function deepDive() {
  // Tous les services badoo
  const { data: badooServices } = await supabase
    .from('services')
    .select('*')
    .or('code.eq.badoo,code.eq.qv,name.ilike.%badoo%')
  
  console.log('🔍 TOUS les services Badoo:\n')
  badooServices?.forEach((s, i) => {
    console.log(`${i + 1}. Code: ${s.code}`)
    console.log(`   Name: ${s.name}`)
    console.log(`   Active: ${s.active}`)
    console.log(`   Total Available: ${s.total_available}`)
    console.log(`   Category: ${s.category}`)
    console.log(`   Popularity: ${s.popularity_score}`)
    console.log('')
  })
  
  // Tous les services tinder
  const { data: tinderServices } = await supabase
    .from('services')
    .select('*')
    .or('code.eq.tinder,code.eq.oi,name.ilike.%tinder%')
  
  console.log('🔍 TOUS les services Tinder:\n')
  tinderServices?.forEach((s, i) => {
    console.log(`${i + 1}. Code: ${s.code}`)
    console.log(`   Name: ${s.name}`)
    console.log(`   Active: ${s.active}`)
    console.log(`   Total Available: ${s.total_available}`)
    console.log(`   Category: ${s.category}`)
    console.log(`   Popularity: ${s.popularity_score}`)
    console.log('')
  })
  
  // Vérifier si "badoo" est vraiment dans la DB
  const { data: exactBadoo } = await supabase
    .from('services')
    .select('*')
    .eq('code', 'badoo')
    .single()
  
  console.log('🎯 Service exact code="badoo":')
  if (exactBadoo) {
    console.log('   ✅ EXISTE')
    console.log(`   Active: ${exactBadoo.active}`)
    console.log(`   Total: ${exactBadoo.total_available}`)
  } else {
    console.log('   ❌ INTROUVABLE DANS LA DB')
  }
}

deepDive().catch(console.error)
