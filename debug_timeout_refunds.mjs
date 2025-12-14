import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔍 RECHERCHE: Dernières activations timeout\n')

// Chercher toutes les activations timeout récentes
const { data: timeouts } = await sb
  .from('activations')
  .select('*')
  .eq('status', 'timeout')
  .gte('updated_at', new Date(Date.now() - 15 * 60000).toISOString())
  .order('updated_at', { ascending: false })

console.log(`📱 ACTIVATIONS TIMEOUT (dernières 15 min): ${timeouts?.length || 0}`)

for (const act of timeouts?.slice(0, 3) || []) {
  console.log(`\n   ID: ${act.id}`)
  console.log(`   Service: ${act.service_code}`)
  console.log(`   Prix: ${act.price}Ⓐ`)
  console.log(`   frozen_amount: ${act.frozen_amount}Ⓐ`)
  console.log(`   Updated: ${new Date(act.updated_at).toLocaleTimeString()}`)
  
  // Check balance operations
  const { data: ops } = await sb
    .from('balance_operations')
    .select('operation_type, amount')
    .eq('activation_id', act.id)
  
  const freeze = ops?.find(o => o.operation_type === 'freeze')?.amount || 0
  const refund = ops?.find(o => o.operation_type === 'refund')?.amount || 0
  
  if (freeze > 0 && refund === 0) {
    console.log(`   ❌ PROBLÈME: freeze ${freeze}Ⓐ sans refund`)
    
    // Tester atomic_refund sur celle-ci
    console.log('   🧪 Test atomic_refund...')
    const { data: result, error } = await sb.rpc('atomic_refund', {
      p_user_id: act.user_id,
      p_amount: freeze,
      p_activation_id: act.id,
      p_reason: 'Manual cleanup test'
    })
    
    if (error) {
      console.log(`   ❌ atomic_refund ÉCHOUÉ: ${error.message}`)
    } else {
      console.log(`   ✅ atomic_refund OK: ${JSON.stringify(result)}`)
    }
    break  // Test seulement la première
  } else if (refund > 0) {
    console.log(`   ✅ OK: freeze ${freeze}Ⓐ + refund ${refund}Ⓐ`)
  }
}