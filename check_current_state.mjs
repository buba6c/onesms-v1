import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qepxgaozywhjbnvqkgfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcHhnYW96eXdoamJudnFrZ2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjY5MDIsImV4cCI6MjA1MTE0MjkwMn0.UQyO-YoKwxqb-3RZ9iMaVN4Zp6I11wCINUg_qLRQEG4'
)

console.log('📊 État actuel de la base de données\n')

// 1. Count exact
const { count: totalPricing } = await supabase
  .from('pricing_rules')
  .select('*', { count: 'exact', head: true })

console.log(`Total pricing_rules: ${totalPricing}`)

// 2. Par provider
const { data: byProvider } = await supabase
  .from('pricing_rules')
  .select('provider, active')

const providerStats = {}
byProvider.forEach(rule => {
  const provider = rule.provider || 'unknown'
  if (!providerStats[provider]) {
    providerStats[provider] = { total: 0, active: 0 }
  }
  providerStats[provider].total++
  if (rule.active) providerStats[provider].active++
})

console.log('\nPar provider:')
Object.entries(providerStats).forEach(([provider, stats]) => {
  console.log(`  ${provider}: ${stats.total} total (${stats.active} actives)`)
})

// 3. Services avec mauvais ordre
const { data: services } = await supabase
  .from('services')
  .select('code, name, popularity_score, total_available, active')
  .order('popularity_score', { ascending: false })
  .limit(15)

console.log('\nTop 15 services (ordre actuel):')
services.forEach((s, i) => {
  console.log(`  ${i+1}. ${s.code.padEnd(10)} - score: ${s.popularity_score}, available: ${s.total_available}, active: ${s.active}`)
})

// 4. Ordre attendu SMS-Activate
const expectedOrder = ['ig', 'wa', 'tg', 'go', 'fb', 'vk', 'tw', 'ok', 'vi', 'ds']
console.log('\nOrdre attendu SMS-Activate:')
expectedOrder.forEach((code, i) => {
  const service = services.find(s => s.code === code)
  if (service) {
    console.log(`  ${i+1}. ${code.padEnd(10)} - score actuel: ${service.popularity_score}`)
  } else {
    console.log(`  ${i+1}. ${code.padEnd(10)} - NON TROUVÉ`)
  }
})
