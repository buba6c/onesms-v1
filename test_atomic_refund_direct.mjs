import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🧪 TEST: atomic_refund_direct\n')

// 1. Récupérer l'état actuel
const { data: user } = await sb
  .from('users')
  .select('*')
  .eq('email', 'kawdpc@gmail.com')
  .single()

console.log('AVANT:')
console.log(`  Balance: ${user.balance}Ⓐ`)
console.log(`  Frozen: ${user.frozen_balance}Ⓐ\n`)

// 2. Créer une transaction de test
const { data: tx, error: txErr } = await sb
  .from('transactions')
  .insert({
    user_id: user.id,
    type: 'purchase',
    amount: -1,
    balance_before: user.balance,
    balance_after: user.balance,
    status: 'pending',
    description: 'TEST atomic_refund_direct'
  })
  .select()
  .single()

if (txErr) {
  console.log('❌ Erreur création transaction:', txErr.message)
  process.exit(1)
}

console.log(`📝 Transaction créée: ${tx.id}\n`)

// 3. Freeze 1Ⓐ
console.log('🔒 TEST: atomic_freeze(1Ⓐ)...')
const { data: freezeResult, error: freezeErr } = await sb.rpc('atomic_freeze', {
  p_user_id: user.id,
  p_amount: 1,
  p_transaction_id: tx.id,
  p_reason: 'TEST freeze'
})

if (freezeErr) {
  console.log('❌ Erreur freeze:', freezeErr.message)
  process.exit(1)
}

console.log('✅ Freeze OK:', freezeResult)
console.log(`  frozen: ${freezeResult.frozen_before}Ⓐ → ${freezeResult.frozen_after}Ⓐ\n`)

// 4. Refund via atomic_refund_direct
console.log('💰 TEST: atomic_refund_direct(1Ⓐ)...')
const { data: refundResult, error: refundErr } = await sb.rpc('atomic_refund_direct', {
  p_user_id: user.id,
  p_amount: 1,
  p_transaction_id: tx.id,
  p_reason: 'TEST refund NO_NUMBERS'
})

if (refundErr) {
  console.log('❌ Erreur refund:', refundErr.message)
  console.log('   Details:', refundErr)
} else {
  console.log('✅ Refund OK:', refundResult)
}

// 5. État final
const { data: userAfter } = await sb
  .from('users')
  .select('*')
  .eq('email', 'kawdpc@gmail.com')
  .single()

console.log('\nAPRÈS:')
console.log(`  Balance: ${userAfter.balance}Ⓐ`)
console.log(`  Frozen: ${userAfter.frozen_balance}Ⓐ\n`)

// 6. Vérifier balance_operations
const { data: ops } = await sb
  .from('balance_operations')
  .select('*')
  .eq('transaction_id', tx.id)
  .order('created_at', { ascending: true})

console.log(`Balance operations: ${ops?.length || 0}`)
for (const op of ops || []) {
  console.log(`  - ${op.operation_type} | ${op.amount}Ⓐ | frz: ${op.frozen_before}→${op.frozen_after}`)
}

// 7. Cleanup
await sb.from('transactions').delete().eq('id', tx.id)
await sb.from('balance_operations').delete().eq('transaction_id', tx.id)

console.log('\n✅ Test terminé (transaction supprimée)')
