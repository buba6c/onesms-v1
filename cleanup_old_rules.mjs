import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qepxgaozywhjbnvqkgfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcHhnYW96eXdoamJudnFrZ2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjY5MDIsImV4cCI6MjA1MTE0MjkwMn0.UQyO-YoKwxqb-3RZ9iMaVN4Zp6I11wCINUg_qLRQEG4'
)

console.log('🧹 Nettoyage des anciennes pricing_rules...\n')

// 1. Compter les règles par provider
console.log('📊 État actuel:')
const { data: current, error: countError } = await supabase
  .from('pricing_rules')
  .select('provider, active')

if (countError) {
  console.error('❌ Erreur:', countError)
  process.exit(1)
}

const byProvider = {}
current.forEach(rule => {
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

console.log(`\n   TOTAL: ${current.length} règles\n`)

// 2. Demander confirmation (simulé - on nettoie directement les non sms-activate)
console.log('🗑️  Suppression des règles NON sms-activate...')

const { error: deleteError, count } = await supabase
  .from('pricing_rules')
  .delete({ count: 'exact' })
  .neq('provider', 'sms-activate')

if (deleteError) {
  console.error('❌ Erreur:', deleteError)
  process.exit(1)
}

console.log(`✅ ${count} anciennes règles supprimées\n`)

// 3. Vérifier l'état final
const { count: finalCount } = await supabase
  .from('pricing_rules')
  .select('*', { count: 'exact', head: true })

console.log(`📊 État final: ${finalCount} règles restantes (toutes sms-activate)`)
