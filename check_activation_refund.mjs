import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const ACTIVATION_ID = '3c324338-e102-4b1e-adc1-4e50073f8252'

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║  🔍 ANALYSE: Activation 7c77f9c6                             ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

// 1. Activation
const { data: activation } = await sb
  .from('activations')
  .select('*')
  .eq('id', ACTIVATION_ID)
  .single()

if (!activation) {
  console.log('❌ Activation introuvable')
  process.exit(1)
}

const now = new Date()
const expiresAt = new Date(activation.expires_at)
const expired = now > expiresAt
const timeLeft = Math.floor((expiresAt - now) / 1000 / 60)

console.log('📱 ACTIVATION:')
console.log(`   ID: ${activation.id}`)
console.log(`   Order ID: ${activation.order_id}`)
console.log(`   Service: ${activation.service_code}`)
console.log(`   Status: ${activation.status}`)
console.log(`   Phone: ${activation.phone || 'N/A'}`)
console.log(`   Price: ${activation.price}Ⓐ`)
console.log(`   frozen_amount: ${activation.frozen_amount}Ⓐ`)
console.log(`   created_at: ${activation.created_at}`)
console.log(`   expires_at: ${activation.expires_at}`)
console.log(`   ${expired ? '❌ EXPIRÉ!' : `⏰ Expire dans ${timeLeft} min`}\n`)

// 2. Balance operations
const { data: ops } = await sb
  .from('balance_operations')
  .select('*')
  .eq('activation_id', ACTIVATION_ID)
  .order('created_at', { ascending: true })

console.log(`💰 BALANCE OPERATIONS: ${ops?.length || 0}\n`)

let hasFreeze = false
let hasRefund = false
let freezeAmount = 0
let refundAmount = 0

for (const op of ops || []) {
  const time = op.created_at.slice(11, 19)
  console.log(`[${time}] ${op.operation_type.toUpperCase()} | ${op.amount}Ⓐ`)
  console.log(`   Balance: ${op.balance_before}Ⓐ → ${op.balance_after}Ⓐ`)
  console.log(`   Frozen: ${op.frozen_before}Ⓐ → ${op.frozen_after}Ⓐ`)
  console.log(`   Reason: ${op.reason || 'N/A'}`)
  console.log('')
  
  if (op.operation_type === 'freeze') {
    hasFreeze = true
    freezeAmount = op.amount
  }
  if (op.operation_type === 'refund') {
    hasRefund = true
    refundAmount = op.amount
  }
}

// 3. Transaction
const { data: tx } = await sb
  .from('transactions')
  .select('*')
  .eq('metadata->>activation_id', ACTIVATION_ID)
  .single()

if (tx) {
  console.log('💳 TRANSACTION:')
  console.log(`   ID: ${tx.id}`)
  console.log(`   Status: ${tx.status}`)
  console.log(`   Amount: ${tx.amount}Ⓐ`)
  console.log(`   Description: ${tx.description || 'N/A'}\n`)
}

// 4. User
const { data: user } = await sb
  .from('users')
  .select('*')
  .eq('id', activation.user_id)
  .single()

console.log('👤 USER:')
console.log(`   ID: ${user.id}`)
console.log(`   Email: ${user.email}`)
console.log(`   Balance: ${user.balance}Ⓐ`)
console.log(`   Frozen: ${user.frozen_balance}Ⓐ`)
console.log(`   Disponible: ${user.balance - user.frozen_balance}Ⓐ\n`)

// 5. Diagnostic
console.log('═══════════════════════════════════════════════════════════════')
console.log('\n💡 DIAGNOSTIC:\n')

if (activation.status === 'pending' && expired) {
  console.log('❌ STATUS: pending MAIS EXPIRÉ')
  console.log('   → Le cron n\'a pas encore traité cette activation')
  console.log('   → Attendre le prochain cycle (2 min)\n')
  
  if (hasFreeze && !hasRefund) {
    console.log(`💰 ${freezeAmount}Ⓐ GELÉS en attente de refund`)
  }
  
} else if (activation.status === 'timeout') {
  console.log('✅ STATUS: timeout (traité par le cron)')
  
  if (hasFreeze && hasRefund) {
    console.log(`✅ REMBOURSEMENT AUTOMATIQUE: ${refundAmount}Ⓐ`)
    console.log('   → Le cron a bien fonctionné!')
  } else if (hasFreeze && !hasRefund) {
    console.log(`❌ PAS DE REFUND: ${freezeAmount}Ⓐ toujours gelés`)
    console.log('   → Bug: Le cron n\'a pas appelé atomic_refund')
  } else {
    console.log('⚠️  Aucun freeze trouvé (transaction très ancienne?)')
  }
  
} else if (activation.status === 'received') {
  console.log('✅ SMS REÇU - Activation réussie')
  
} else {
  console.log(`⚠️  Status inhabituel: ${activation.status}`)
}

console.log('\n═══════════════════════════════════════════════════════════════')
