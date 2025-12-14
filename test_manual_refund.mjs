import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🧪 TEST: atomic_refund manual\n')

// Test avec l'activation qui a timeout sans refund
const activationId = '596f691c-e1ca-4a1e-bb74-db0dce14eb4b'

// 1. État avant
const { data: act } = await sb
  .from('activations')
  .select('*')
  .eq('id', activationId)
  .single()

console.log('📱 ACTIVATION AVANT TEST:')
console.log(`   Status: ${act.status}`)
console.log(`   frozen_amount: ${act.frozen_amount}Ⓐ`)
console.log(`   Price: ${act.price}Ⓐ\n`)

// 2. Tester atomic_refund manuellement
console.log('⚙️ APPEL MANUEL: atomic_refund...')
const { data: result, error } = await sb.rpc('atomic_refund', {
  p_user_id: act.user_id,
  p_amount: act.price,  // Utiliser le prix au lieu de frozen_amount=0
  p_activation_id: act.id,
  p_reason: 'Manual test - timeout refund'
})

if (error) {
  console.error('❌ ERREUR:', error)
} else {
  console.log('✅ SUCCÈS:', result)
}

// 3. Vérifier balance_operations après
const { data: ops } = await sb
  .from('balance_operations')
  .select('*')
  .eq('activation_id', activationId)
  .order('created_at', { ascending: true })

console.log('\n💰 BALANCE OPERATIONS APRÈS:')
for (const op of ops || []) {
  const time = new Date(op.created_at).toLocaleTimeString()
  console.log(`   [${time}] ${op.operation_type.toUpperCase()} | ${op.amount}Ⓐ`)
}