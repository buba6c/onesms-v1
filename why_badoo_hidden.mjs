import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Pourquoi Badoo ne s\'affiche pas ?\n')

// Chercher tous les Badoo
const { data: badoos } = await supabase
  .from('services')
  .select('*')
  .ilike('name', '%badoo%')

console.log(`📊 Services Badoo trouvés: ${badoos?.length}\n`)
badoos?.forEach(b => {
  console.log(`   Code: ${b.code}`)
  console.log(`   Name: ${b.name}`)
  console.log(`   Active: ${b.active}`)
  console.log(`   Total: ${b.total_available}`)
  console.log(`   Category: ${b.category}`)
  console.log(`   Popularity: ${b.popularity_score}`)
  console.log()
})

// Vérifier si "qv" a total_available > 0
const { data: qv } = await supabase
  .from('services')
  .select('*')
  .eq('code', 'qv')
  .single()

console.log('📊 Service qv (Badoo correct):')
console.log(`   Active: ${qv?.active}`)
console.log(`   Total available: ${qv?.total_available}`)
console.log(`   gt(0) filter: ${(qv?.total_available || 0) > 0 ? 'PASS ✅' : 'FAIL ❌'}`)
