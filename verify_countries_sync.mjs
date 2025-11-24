import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'
)

console.log('🌍 VÉRIFICATION SYNCHRONISATION PAYS\n')
console.log('=' .repeat(60))

// 1. Pays synchronisés
const { data: countries, error } = await supabase
  .from('countries')
  .select('*')
  .eq('active', true)
  .order('success_rate', { ascending: false })
  .limit(10)

if (error) {
  console.error('❌ Erreur:', error)
} else {
  console.log(`\n✅ Pays actifs: ${countries.length}`)
  console.log('\n🏆 Top 10 pays par taux de succès:\n')
  
  countries.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (${c.code})`)
    console.log(`   📈 ${c.success_rate}% taux de succès`)
    if (c.metadata?.topServices) {
      console.log(`   📊 ${c.metadata.topServices.length} top services disponibles`)
    }
    console.log()
  })
}

// 2. Total pays actifs
const { count: totalCountries } = await supabase
  .from('countries')
  .select('*', { count: 'exact', head: true })
  .eq('active', true)

console.log(`\n📊 Total pays actifs: ${totalCountries}`)

// 3. Services synchronisés
const { count: totalServices } = await supabase
  .from('services')
  .select('*', { count: 'exact', head: true })
  .eq('active', true)
  .gt('total_available', 0)

console.log(`📱 Services actifs: ${totalServices?.toLocaleString()}`)

// 4. Logs de sync
const { data: logs } = await supabase
  .from('sync_logs')
  .select('sync_type, status, countries_synced, services_synced, started_at, metadata')
  .order('started_at', { ascending: false })
  .limit(5)

console.log('\n📝 Derniers syncs:\n')
logs?.forEach(log => {
  const time = new Date(log.started_at).toLocaleString('fr-FR')
  console.log(`${log.sync_type} - ${log.status} - ${time}`)
  if (log.countries_synced) console.log(`  Pays: ${log.countries_synced}`)
  if (log.services_synced) console.log(`  Services: ${log.services_synced}`)
  if (log.metadata?.totalNumbers) {
    console.log(`  Numéros: ${log.metadata.totalNumbers.toLocaleString()}`)
  }
  console.log()
})

console.log('='.repeat(60))
console.log('✅ SYNCHRONISATION ACTIVE:')
console.log('   �� Pays: Sync toutes les heures (GitHub Actions)')
console.log('   📱 Services: Sync toutes les 5 minutes (GitHub Actions)')
console.log('   ⚡ Disponibilité: Temps réel via Edge Functions')
console.log('='.repeat(60))
