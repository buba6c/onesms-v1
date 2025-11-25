import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Recherche du conflit de code "oi"\n')

// Trouver tous les services avec le code "oi"
const { data: services } = await supabase
  .from('services')
  .select('*')
  .eq('code', 'oi')

console.log(`Services avec code "oi" : ${services?.length || 0}\n`)

services?.forEach((s, i) => {
  console.log(`${i + 1}. ${s.name}`)
  console.log(`   ID: ${s.id}`)
  console.log(`   Code: ${s.code}`)
  console.log(`   Active: ${s.active}`)
  console.log(`   Category: ${s.category}`)
  console.log(`   Popularity: ${s.popularity_score}`)
  console.log(`   Total: ${s.total_available}`)
  console.log()
})

// Chercher aussi "tinder" avec autre code
const { data: tinders } = await supabase
  .from('services')
  .select('*')
  .ilike('name', '%tinder%')

console.log(`\nServices Tinder trouvés: ${tinders?.length || 0}\n`)
tinders?.forEach(t => {
  console.log(`- ${t.name} (code: ${t.code}, active: ${t.active})`)
})
