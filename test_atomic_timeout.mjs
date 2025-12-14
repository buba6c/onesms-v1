import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🧪 TEST: Fonction atomique timeout 100% fiable\n')

// Tester la nouvelle fonction
const { data, error } = await sb.functions.invoke('atomic-timeout-processor')

if (error) {
  console.error('❌ Erreur:', error)
} else {
  console.log('✅ SUCCÈS!')
  console.log('📊 Résultat:', data)
  
  if (data?.processed > 0) {
    console.log('\n🎯 DÉTAILS:')
    data.details?.forEach((detail, i) => {
      console.log(`   ${i+1}. ${detail.activation_id} (${detail.service_code}):`)
      if (detail.error) {
        console.log(`      ❌ ${detail.error}`)
      } else {
        console.log(`      ✅ ${detail.refunded}Ⓐ refunded via ${detail.method}`)
      }
    })
  }
}

// Vérifier l'état après
console.log('\n🔍 VÉRIFICATION POST-TRAITEMENT:')
const { data: activations } = await sb
  .from('activations')
  .select('id, service_code, status, frozen_amount')
  .eq('status', 'timeout')
  .gte('updated_at', new Date(Date.now() - 5 * 60000).toISOString())

console.log(`📱 Activations timeout récentes: ${activations?.length || 0}`)
for (const act of activations?.slice(0, 5) || []) {
  const { data: ops } = await sb
    .from('balance_operations')
    .select('operation_type')
    .eq('activation_id', act.id)
  
  const hasRefund = ops?.some(op => op.operation_type === 'refund')
  console.log(`   ${act.id.substring(0, 8)}... (${act.service_code}): frozen=${act.frozen_amount} ${hasRefund ? '✅ refunded' : '❌ no refund'}`)
}