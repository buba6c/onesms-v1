import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔍 TEST: atomic_refund_direct pour NO_NUMBERS\n')

const { data: user } = await sb
  .from('users')
  .select('*')
  .eq('email', 'kawdpc@gmail.com')
  .single()

console.log('👤 USER:', user.email)
console.log(`   Balance: ${user.balance}Ⓐ`)
console.log(`   Frozen: ${user.frozen_balance}Ⓐ\n`)

// Chercher des transactions failed récentes
const { data: failedTxs } = await sb
  .from('transactions')
  .select('*')
  .eq('user_id', user.id)
  .eq('status', 'failed')
  .order('created_at', { ascending: false })
  .limit(5)

console.log(`💳 TRANSACTIONS FAILED: ${failedTxs?.length || 0}\n`)

for (const tx of failedTxs || []) {
  const time = tx.created_at.slice(11, 19)
  console.log(`[${time}] ${tx.type} | ${tx.amount}Ⓐ | ${tx.status}`)
  console.log(`   Description: ${tx.description || 'N/A'}`)
  console.log(`   Metadata:`, tx.metadata)
  
  // Chercher les balance_operations liées
  const { data: ops } = await sb
    .from('balance_operations')
    .select('*')
    .eq('transaction_id', tx.id)
    .order('created_at', { ascending: true })
  
  console.log(`   Balance operations: ${ops?.length || 0}`)
  for (const op of ops || []) {
    console.log(`     - ${op.operation_type} | ${op.amount}Ⓐ | frz: ${op.frozen_before}→${op.frozen_after}`)
  }
  console.log('')
}

// Chercher des freeze sans refund
const { data: freezes } = await sb
  .from('balance_operations')
  .select('*')
  .eq('user_id', user.id)
  .eq('operation_type', 'freeze')
  .is('activation_id', null)
  .is('rental_id', null)
  .order('created_at', { ascending: false })
  .limit(10)

console.log(`\n🔒 FREEZES SANS ACTIVATION/RENTAL: ${freezes?.length || 0}\n`)

for (const freeze of freezes || []) {
  const time = freeze.created_at.slice(11, 19)
  console.log(`[${time}] FREEZE ${freeze.amount}Ⓐ | frz: ${freeze.frozen_before}→${freeze.frozen_after}`)
  console.log(`   Transaction: ${freeze.transaction_id}`)
  
  // Chercher le refund
  const { data: refund } = await sb
    .from('balance_operations')
    .select('*')
    .eq('transaction_id', freeze.transaction_id)
    .eq('operation_type', 'refund')
    .single()
  
  if (refund) {
    const refundTime = refund.created_at.slice(11, 19)
    console.log(`   ✅ REFUND à [${refundTime}]`)
  } else {
    console.log('   ❌ PAS DE REFUND - Fonds gelés!')
  }
  console.log('')
}

console.log('\n💡 DIAGNOSTIC:')
console.log('Si des FREEZE sans REFUND:')
console.log('  → atomic_refund_direct ne fonctionne pas')
console.log('  → Les fonds restent gelés après NO_NUMBERS')
