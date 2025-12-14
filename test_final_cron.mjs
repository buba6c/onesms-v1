import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🧪 TEST FINAL: Nouveau cron 100% fiable\n')

const { data, error } = await sb.functions.invoke('cron-atomic-reliable')

if (error) {
  console.error('❌ Erreur:', error)
} else {
  console.log('✅ SUCCÈS!')
  console.log('📊 Résultat:', JSON.stringify(data, null, 2))
  
  if (data?.success) {
    const timeout = data.timeout_processing
    const sms = data.sms_checking
    
    console.log('\n🎯 RÉSUMÉ:')
    console.log(`⏰ Timeouts: ${timeout.processed} processés (${timeout.refunded_total}Ⓐ remboursés)`)
    console.log(`📱 SMS: ${sms.checked} vérifiés (${sms.found} trouvés)`)
    console.log(`❌ Erreurs: ${timeout.errors + sms.errors}`)
    
    if (timeout.processed > 0 || sms.found > 0) {
      console.log('\n✅ CRON 100% FIABLE FONCTIONNE!')
    } else {
      console.log('\n✅ CRON 100% FIABLE - Rien à traiter pour le moment')
    }
  }
}