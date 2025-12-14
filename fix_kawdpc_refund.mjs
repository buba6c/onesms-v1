import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║  🧹 CLEANUP: kawdpc@gmail.com (42Ⓐ frozen fantômes)          ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

const USER_EMAIL = 'kawdpc@gmail.com'

// 1. Trouver l'utilisateur
const { data: user } = await sb
  .from('users')
  .select('*')
  .eq('email', USER_EMAIL)
  .single()

if (!user) {
  console.log('❌ Utilisateur introuvable')
  process.exit(1)
}

const USER_ID = user.id

console.log('📊 ÉTAT INITIAL:')
console.log(`   Balance: ${user.balance}Ⓐ`)
console.log(`   Frozen: ${user.frozen_balance}Ⓐ`)
console.log(`   Disponible: ${user.balance - user.frozen_balance}Ⓐ\n`)

// 2. Activations expirées à refund
const activationsToRefund = [
  { id: 'e586f512-d914-411c-9a73-3fdd65aa9e5e', amount: 13, reason: 'cancelled' },
  { id: '5fbb7e43-cf6e-4da9-881f-2e80ec4ee02e', amount: 12, reason: 'timeout' },
  { id: '21e18284-ab94-4b32-b892-68ba71d06e33', amount: 12, reason: 'timeout' },
  { id: '83c7bce2-9b4e-498e-a7ce-4e1c4a4e9dc7', amount: 5, reason: 'timeout' }
]

console.log(`🔓 LIBÉRATION DE ${activationsToRefund.length} ACTIVATIONS:\n`)

let totalRefunded = 0
let successCount = 0

for (const [index, act] of activationsToRefund.entries()) {
  const shortId = act.id.slice(0, 8)
  console.log(`[${index + 1}/${activationsToRefund.length}] ${shortId} - ${act.amount}Ⓐ (${act.reason})...`)
  
  try {
    const { data: refundResult, error: refundErr } = await sb.rpc('atomic_refund', {
      p_user_id: USER_ID,
      p_amount: act.amount,
      p_activation_id: act.id,
      p_reason: `Cleanup ${act.reason} - manual refund`
    })
    
    if (refundErr) {
      console.log(`   ❌ ERROR: ${refundErr.message}\n`)
      continue
    }
    
    if (refundResult?.idempotent) {
      console.log('   ⚠️  IDEMPOTENT: Déjà remboursé\n')
      continue
    }
    
    if (refundResult?.success) {
      const refunded = refundResult.refunded || act.amount
      totalRefunded += refunded
      successCount++
      console.log(`   ✅ SUCCESS: ${refunded}Ⓐ libérés\n`)
    } else {
      console.log(`   ❌ FAILED: ${refundResult?.error || 'Unknown error'}\n`)
    }
    
  } catch (err) {
    console.log(`   ❌ EXCEPTION: ${err.message}\n`)
  }
  
  await new Promise(resolve => setTimeout(resolve, 200))
}

// 3. État final
const { data: userAfter } = await sb
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', USER_ID)
  .single()

console.log('═══════════════════════════════════════════════════════════════')
console.log('\n📊 RÉSUMÉ:\n')
console.log(\`✅ Refunds réussis: \${successCount}/\${activationsToRefund.length}\`)
console.log(\`💰 Total libéré: \${totalRefunded}Ⓐ\n\`)

console.log('AVANT:')
console.log(\`  Frozen: \${user.frozen_balance}Ⓐ\`)
console.log(\`  Disponible: \${user.balance - user.frozen_balance}Ⓐ\n\`)

console.log('APRÈS:')
console.log(\`  Frozen: \${userAfter.frozen_balance}Ⓐ\`)
console.log(\`  Disponible: \${userAfter.balance - userAfter.frozen_balance}Ⓐ\n\`)

const frozenDiff = user.frozen_balance - userAfter.frozen_balance
const availableDiff = (userAfter.balance - userAfter.frozen_balance) - (user.balance - user.frozen_balance)

console.log('DIFFÉRENCE:')
console.log(\`  Frozen libéré: \${frozenDiff}Ⓐ\`)
console.log(\`  Disponible gagné: +\${availableDiff}Ⓐ\n\`)

if (frozenDiff === 42) {
  console.log('🎉 SUCCÈS TOTAL! 42Ⓐ libérés')
} else if (frozenDiff > 0) {
  console.log(\`✅ SUCCÈS PARTIEL: \${frozenDiff}Ⓐ libérés\`)
} else {
  console.log('⚠️  Aucun frozen libéré. Vérifier les logs.')
}
