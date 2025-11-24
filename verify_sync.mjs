import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
)

console.log('🔍 Vérification de la synchronisation...\n')

// 1. Total services
const { data: allServices, count: totalCount } = await supabase
  .from('services')
  .select('*', { count: 'exact' })

console.log(`✅ Total services dans la DB: ${totalCount}`)

// 2. Services avec numéros disponibles
const { data: availableServices, count: availableCount } = await supabase
  .from('services')
  .select('*', { count: 'exact' })
  .gt('total_available', 0)

console.log(`✅ Services avec numéros: ${availableCount}`)

// 3. Top 10 services
const { data: topServices } = await supabase
  .from('services')
  .select('code, name, display_name, total_available, category')
  .gt('total_available', 0)
  .order('total_available', { ascending: false })
  .limit(10)

console.log('\n🏆 Top 10 services par disponibilité:')
topServices.forEach((s, i) => {
  console.log(`${i + 1}. ${s.display_name || s.name} (${s.code}): ${s.total_available.toLocaleString()} numéros - [${s.category}]`)
})

// 4. Services par catégorie
const { data: categories } = await supabase
  .from('services')
  .select('category')
  .gt('total_available', 0)

const categoryCount = categories.reduce((acc, s) => {
  acc[s.category] = (acc[s.category] || 0) + 1
  return acc
}, {})

console.log('\n📊 Services par catégorie:')
Object.entries(categoryCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} services`)
  })

// 5. Dernières syncs
const { data: logs } = await supabase
  .from('sync_logs')
  .select('*')
  .order('started_at', { ascending: false })
  .limit(3)

console.log('\n📝 Dernières synchronisations:')
logs.forEach(log => {
  const date = new Date(log.started_at).toLocaleString('fr-FR')
  console.log(`  ${log.sync_type}: ${log.status} - ${log.services_synced} services - ${date}`)
})

// 6. Total numéros
const totalNumbers = topServices.reduce((sum, s) => sum + s.total_available, 0)
console.log(`\n💯 Total numéros (top 10): ${totalNumbers.toLocaleString()}`)

console.log('\n✅ Vérification terminée!')
