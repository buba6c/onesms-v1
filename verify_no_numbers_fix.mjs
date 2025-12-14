import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║  ✅ VÉRIFICATION: Fix atomic_refund_direct pour NO_NUMBERS   ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

const { data: user } = await sb
  .from('users')
  .select('*')
  .eq('email', 'kawdpc@gmail.com')
  .single()

console.log('👤 USER:', user.email)
console.log(`   Balance AVANT: ${user.balance}Ⓐ`)
console.log(`   Frozen AVANT: ${user.frozen_balance}Ⓐ\n`)

// Chercher les dernières transactions failed avec NO_NUMBERS
const { data: recentFailed } = await sb
  .from('transactions')
  .select('*')
  .eq('user_id', user.id)
  .eq('status', 'failed')
  .ilike('description', '%NO_NUMBERS%')
  .order('created_at', { ascending: false })
  .limit(5)

console.log(`💳 TRANSACTIONS NO_NUMBERS RÉCENTES: ${recentFailed?.length || 0}\n`)

for (const tx of recentFailed || []) {
  const time = tx.created_at.slice(11, 19)
  console.log(`[${time}] ${tx.amount}Ⓐ | ${tx.status}`)
  
  // Chercher les balance_operations
  const { data: ops } = await sb
    .from('balance_operations')
    .select('*')
    .eq('transaction_id', tx.id)
    .order('created_at', { ascending: true })
  
  console.log(`   Balance operations: ${ops?.length || 0}`)
  
  if (ops && ops.length > 0) {
    for (const op of ops) {
      console.log(`   - ${op.operation_type} | ${op.amount}Ⓐ | frz: ${op.frozen_before}→${op.frozen_after}`)
    }
    
    const hasFreeze = ops.some(o => o.operation_type === 'freeze')
    const hasRefund = ops.some(o => o.operation_type === 'refund')
    
    if (hasFreeze && hasRefund) {
      console.log('   ✅ COMPLET: freeze + refund')
    } else if (hasFreeze && !hasRefund) {
      console.log('   ❌ BUG: freeze sans refund')
    } else if (!hasFreeze) {
      console.log('   ⚠️  Ancienne transaction (avant fix atomic)')
    }
  } else {
    console.log('   ⚠️  Aucune balance_operation (bug ou avant fix)')
  }
  
  console.log('')
}

console.log('\n💡 INTERPRÉTATION:')
console.log('Si transactions récentes ont freeze + refund:')
console.log('  → ✅ Le fix fonctionne! NO_NUMBERS ne gèle plus les fonds')
console.log('\nSi transactions anciennes sans refund:')
console.log('  → ⚠️  Fonds toujours gelés (il faut cleanup manuel)')
console.log('\n🎯 PROCHAINE ÉTAPE:')
console.log('   Teste un achat avec un pays sans numéro pour confirmer!')
