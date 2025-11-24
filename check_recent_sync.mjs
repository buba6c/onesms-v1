import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
)

console.log('🔍 Vérification des derniers syncs...\n')

// Logs des dernières heures
const { data: recentLogs } = await supabase
  .from('sync_logs')
  .select('*')
  .gte('started_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Dernière heure
  .order('started_at', { ascending: false })

if (recentLogs && recentLogs.length > 0) {
  console.log('📝 Syncs de la dernière heure:')
  recentLogs.forEach(log => {
    const time = new Date(log.started_at).toLocaleString('fr-FR')
    console.log(`  ${log.status === 'success' ? '✅' : '❌'} ${log.sync_type} - ${time}`)
    if (log.services_synced) console.log(`     Services: ${log.services_synced}, Pays: ${log.countries_synced}`)
  })
} else {
  console.log('⏳ Aucun sync dans la dernière heure')
  console.log('   Le cron GitHub Actions va démarrer au prochain intervalle de 5 minutes')
}

// Services récemment mis à jour
console.log('\n🔄 Services récemment mis à jour:')
const { data: recentServices } = await supabase
  .from('services')
  .select('code, name, total_available, updated_at')
  .order('updated_at', { ascending: false })
  .limit(5)

recentServices?.forEach(s => {
  const time = new Date(s.updated_at).toLocaleString('fr-FR')
  console.log(`  ${s.name || s.code}: ${s.total_available?.toLocaleString()} - ${time}`)
})

console.log('\n✅ Vérification terminée!')
