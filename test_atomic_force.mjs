import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const testActivationId = '8f6fc29b-feea-4593-ad64-7b7779d7d382'

console.log('🧪 TEST: Refund forcé sur activation test\n')

// 1. État avant
const { data: actBefore } = await sb
  .from('activations')
  .select('*')
  .eq('id', testActivationId)
  .single()

const { data: opsBefore } = await sb
  .from('balance_operations')
  .select('operation_type, amount')
  .eq('activation_id', testActivationId)

const { data: userBefore } = await sb
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', actBefore.user_id)
  .single()

console.log('📊 ÉTAT AVANT:')
console.log(`   Activation: ${actBefore.status} | frozen_amount: ${actBefore.frozen_amount}Ⓐ`)
console.log(`   User frozen: ${userBefore.frozen_balance}Ⓐ`)
console.log(`   Balance ops: ${opsBefore?.map(o => o.operation_type).join(', ')}`)

// 2. Forcer le refund en remettant frozen_amount > 0 temporairement
console.log('\n🔧 PRÉPARATION pour test atomique...')

// Remettre l'activation en état "processable"
const { error: resetError } = await sb
  .from('activations')
  .update({ 
    status: 'pending',  // Remettre en pending
    frozen_amount: 5    // Remettre frozen_amount > 0
  })
  .eq('id', testActivationId)

if (resetError) {
  console.error('❌ Erreur reset:', resetError)
  process.exit(1)
}

console.log('✅ Activation remise en pending avec frozen_amount=5Ⓐ')

// 3. Tester la fonction atomique
console.log('\n🚀 APPEL fonction atomique...')

const { data: result, error } = await sb.functions.invoke('atomic-timeout-processor')

if (error) {
  console.error('❌ Erreur fonction:', error)
} else {
  console.log('✅ Fonction exécutée!')
  console.log('📊 Résultat:', result)
}

// 4. Vérifier l'état après
const { data: actAfter } = await sb
  .from('activations')
  .select('status, frozen_amount')
  .eq('id', testActivationId)
  .single()

const { data: opsAfter } = await sb
  .from('balance_operations')
  .select('operation_type, amount, created_at')
  .eq('activation_id', testActivationId)
  .order('created_at')

const { data: userAfter } = await sb
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', userBefore.id)
  .single()

console.log('\n📊 ÉTAT APRÈS:')
console.log(`   Activation: ${actAfter.status} | frozen_amount: ${actAfter.frozen_amount}Ⓐ`)
console.log(`   User frozen: ${userAfter.frozen_balance}Ⓐ (était ${userBefore.frozen_balance}Ⓐ)`)
console.log(`   Balance ops: ${opsAfter?.length || 0} opérations`)

console.log('\n💰 BALANCE OPERATIONS:')
for (const op of opsAfter || []) {
  const time = new Date(op.created_at).toLocaleTimeString()
  console.log(`   [${time}] ${op.operation_type.toUpperCase()} | ${op.amount}Ⓐ`)
}

const hasFreeze = opsAfter?.some(o => o.operation_type === 'freeze')
const hasRefund = opsAfter?.some(o => o.operation_type === 'refund')
const frozenReduced = userAfter.frozen_balance < userBefore.frozen_balance

console.log('\n🎯 RÉSULTAT:')
if (actAfter.status === 'timeout' && actAfter.frozen_amount === 0 && hasRefund && frozenReduced) {
  console.log('   ✅ SUCCÈS COMPLET! Fonction atomique 100% fiable')
  console.log('   ✅ Status: timeout')
  console.log('   ✅ frozen_amount: 0')
  console.log('   ✅ Refund dans balance_operations')
  console.log('   ✅ User frozen_balance diminué')
} else {
  console.log('   ❌ Échec partiel:')
  console.log(`      Status: ${actAfter.status} ${actAfter.status === 'timeout' ? '✅' : '❌'}`)
  console.log(`      frozen_amount: ${actAfter.frozen_amount} ${actAfter.frozen_amount === 0 ? '✅' : '❌'}`)
  console.log(`      Has refund: ${hasRefund ? '✅' : '❌'}`)
  console.log(`      Frozen reduced: ${frozenReduced ? '✅' : '❌'}`)
}