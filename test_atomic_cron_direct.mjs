import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🚀 TEST DIRECT: Appelons le nouveau cron-atomic-reliable manuellement\n')

try {
  console.log('📞 Appel de cron-atomic-reliable...')
  
  const { data, error } = await sb.functions.invoke('cron-atomic-reliable')
  
  if (error) {
    console.error('❌ Erreur:', error)
  } else {
    console.log('✅ Résultat du cron atomic:')
    console.log(JSON.stringify(data, null, 2))
  }

  // Vérifier l'état du test après l'appel
  console.log('\n🔍 Vérification du test après cron...')
  
  const testId = '7628e7cc-43ae-49aa-97ca-01e966320d86'
  
  const { data: act } = await sb
    .from('activations')
    .select('status, frozen_amount')
    .eq('id', testId)
    .single()

  const { data: ops } = await sb
    .from('balance_operations') 
    .select('operation_type')
    .eq('activation_id', testId)

  const { data: user } = await sb
    .from('users')
    .select('frozen_balance')
    .eq('id', 'e108c02a-2012-4043-bbc2-fb09bb11f824')
    .single()

  console.log(`📱 Status: ${act.status}`)
  console.log(`🔒 frozen_amount: ${act.frozen_amount}Ⓐ`)
  console.log(`💰 User frozen: ${user.frozen_balance}Ⓐ`)
  console.log(`📊 Balance ops: ${ops?.map(o => o.operation_type).join(', ')}`)

  if (act.status === 'timeout' && act.frozen_amount === 0 && ops?.some(o => o.operation_type === 'refund')) {
    console.log('\n🎉 SUCCÈS TOTAL! Le cron atomic a fonctionné!')
  } else {
    console.log('\n⚠️ Problème détecté avec le refund')
  }

} catch (error) {
  console.error('❌ ERREUR TEST:', error.message)
}