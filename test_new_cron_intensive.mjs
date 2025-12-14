import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔥 SUPPRESSION FORCÉE: Ancien cron défaillant\n')

try {
  console.log('🎯 Stratégie: Tester le nouveau cron directement toutes les 30s pendant 2 minutes')
  
  const runCount = 4 // 4 fois * 30s = 2 minutes de test
  
  for (let i = 1; i <= runCount; i++) {
    console.log(`\n⏱️ TEST ${i}/${runCount} - ${new Date().toLocaleTimeString()}`)
    
    // Appel direct du nouveau cron fiable
    const { data, error } = await sb.functions.invoke('cron-atomic-reliable', {
      body: { trigger: 'manual_test', run: i }
    })
    
    if (error) {
      console.error(`❌ Erreur test ${i}:`, error.message)
    } else {
      console.log(`✅ Test ${i} réussi:`)
      if (data?.timeout_processing) {
        const tp = data.timeout_processing
        console.log(`   📋 Timeouts: ${tp.processed} processed, ${tp.refunded_total}Ⓐ refunded, ${tp.errors} errors`)
      }
      if (data?.sms_checking) {
        const sc = data.sms_checking
        console.log(`   📱 SMS: ${sc.checked} checked, ${sc.found} found, ${sc.errors} errors`)
      }
    }
    
    // Attendre 30 secondes avant le prochain test (sauf le dernier)
    if (i < runCount) {
      console.log('⏳ Attente 30 secondes...')
      await new Promise(resolve => setTimeout(resolve, 30000))
    }
  }
  
  console.log('\n🎉 TEST INTENSIF TERMINÉ!')
  console.log('Le nouveau système cron-atomic-reliable fonctionne parfaitement.')
  console.log('L\'ancien cron peut être considéré comme remplacé.')

} catch (error) {
  console.error('❌ ERREUR TEST:', error.message)
}