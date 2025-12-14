import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const activationId = '9f0b13af-0a26-4e2f-874a-3a8dc24f1e89'

console.log('🔍 ANALYSE: Activation 9f0b13af\n')

// 1. Info activation
const { data: act } = await sb
  .from('activations')
  .select('*')
  .eq('id', activationId)
  .single()

console.log('📱 ACTIVATION:')
console.log(`   Status: ${act.status}`)
console.log(`   frozen_amount: ${act.frozen_amount}Ⓐ`)
console.log(`   Price: ${act.price}Ⓐ`)
console.log(`   Updated: ${new Date(act.updated_at).toLocaleString()}\n`)

// 2. Balance operations
const { data: ops } = await sb
  .from('balance_operations')
  .select('*')
  .eq('activation_id', activationId)
  .order('created_at', { ascending: true })

console.log('💰 BALANCE OPERATIONS:')
for (const op of ops || []) {
  const time = new Date(op.created_at).toLocaleTimeString()
  console.log(`   [${time}] ${op.operation_type.toUpperCase()} | ${op.amount}Ⓐ`)
  console.log(`      balance: ${op.balance_before} → ${op.balance_after}`)
  console.log(`      frozen: ${op.frozen_before} → ${op.frozen_after}`)
  console.log(`      reason: ${op.reason}`)
}

// 3. User balance
const { data: user } = await sb
  .from('users')
  .select('email, balance, frozen_balance')
  .eq('id', act.user_id)
  .single()

console.log(`\n👤 USER: ${user.email}`)
console.log(`   Balance: ${user.balance}Ⓐ`)
console.log(`   Frozen: ${user.frozen_balance}Ⓐ`)

console.log('\n🎯 DIAGNOSTIC:')
if (ops?.length === 1 && ops[0].operation_type === 'freeze') {
  console.log('   ❌ FREEZE sans REFUND')
  console.log('   → Le cron a marqué status=timeout')
  console.log('   → Mais atomic_refund n\'a PAS été appelé')
  console.log(`   → ${act.price}Ⓐ toujours gelés chez l'utilisateur`)
}
