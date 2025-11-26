import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qepxgaozywhjbnvqkgfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcHhnYW96eXdoamJudnFrZ2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjY5MDIsImV4cCI6MjA1MTE0MjkwMn0.UQyO-YoKwxqb-3RZ9iMaVN4Zp6I11wCINUg_qLRQEG4'
)

console.log('🔍 Vérification des logs de synchronisation...\n')

const { data, error } = await supabase
  .from('sync_logs')
  .select('*')
  .order('started_at', { ascending: false })
  .limit(5)

if (error) {
  console.error('❌ Erreur:', error)
  process.exit(1)
}

console.log('📋 Derniers sync logs:\n')
data.forEach((log, i) => {
  console.log(`\n${i + 1}. Sync ${log.sync_type}:`)
  console.log(`   Status: ${log.status}`)
  console.log(`   Durée: ${log.duration_seconds}s`)
  console.log(`   Services: ${log.services_synced}`)
  console.log(`   Countries: ${log.countries_synced}`)
  console.log(`   Prices: ${log.prices_synced}`)
  console.log(`   Erreur: ${log.error_message || 'N/A'}`)
  console.log(`   Date: ${new Date(log.started_at).toLocaleString('fr-FR')}`)
})

// Vérifier aussi les pricing_rules par provider
console.log('\n\n📊 Pricing rules par provider:')
const { data: pricingStats } = await supabase
  .from('pricing_rules')
  .select('provider, active')

if (pricingStats) {
  const byProvider = {}
  pricingStats.forEach(rule => {
    const provider = rule.provider || 'unknown'
    if (!byProvider[provider]) {
      byProvider[provider] = { total: 0, active: 0 }
    }
    byProvider[provider].total++
    if (rule.active) byProvider[provider].active++
  })
  
  Object.entries(byProvider).forEach(([provider, stats]) => {
    console.log(`   ${provider}: ${stats.total} total (${stats.active} actives)`)
  })
}
