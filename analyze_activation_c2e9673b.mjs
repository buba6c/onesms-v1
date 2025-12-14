import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

async function analyzeActivation() {
  const activationId = 'c2e9673b-0aae-458e-b1ff-86d966c27810'
  
  console.log('🔍 ANALYSE ACTIVATION')
  console.log('='.repeat(70))
  console.log(`ID: ${activationId}\n`)

  // 1. État de l'activation
  const { data: activation, error: actErr } = await supabase
    .from('activations')
    .select('*')
    .eq('id', activationId)
    .single()
  
  if (actErr || !activation) {
    console.error('❌ Activation introuvable:', actErr)
    return
  }

  console.log('📋 ACTIVATION:')
  console.log(`   User: ${activation.user_id}`)
  console.log(`   Numéro: ${activation.phone}`)
  console.log(`   Service: ${activation.service_code}`)
  console.log(`   Status: ${activation.status}`)
  console.log(`   Prix: ${activation.price} Ⓐ`)
  console.log(`   Frozen Amount: ${activation.frozen_amount} Ⓐ`)
  console.log(`   Charged: ${activation.charged}`)
  console.log(`   SMS Code: ${activation.sms_code || 'N/A'}`)
  console.log(`   Order ID: ${activation.order_id}`)
  console.log(`   Created: ${activation.created_at}`)
  console.log(`   Updated: ${activation.updated_at}`)
  console.log(`   Expires: ${activation.expires_at}`)

  // 2. Balance operations
  const { data: operations } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('activation_id', activationId)
    .order('created_at', { ascending: true })
  
  console.log(`\n💰 BALANCE OPERATIONS (${operations?.length || 0}):`)
  if (operations && operations.length > 0) {
    operations.forEach((op, i) => {
      console.log(`\n   ${i+1}. ${op.operation_type.toUpperCase()}`)
      console.log(`      Amount: ${op.amount} Ⓐ`)
      console.log(`      Balance: ${op.balance_before} → ${op.balance_after}`)
      console.log(`      Frozen: ${op.frozen_before} → ${op.frozen_after}`)
      console.log(`      Reason: ${op.reason}`)
      console.log(`      Created: ${op.created_at}`)
    })
  } else {
    console.log('   ⚠️ Aucune opération')
  }

  // 3. User state
  const { data: user } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .eq('id', activation.user_id)
    .single()
  
  console.log(`\n👤 USER:`)
  console.log(`   Email: ${user?.email}`)
  console.log(`   Balance: ${user?.balance} Ⓐ`)
  console.log(`   Frozen: ${user?.frozen_balance} Ⓐ`)

  // 4. Analyse
  console.log(`\n🧠 DIAGNOSTIC:`)
  console.log('='.repeat(70))
  
  const hasFreeze = operations?.some(op => op.operation_type === 'freeze')
  const hasCommit = operations?.some(op => op.operation_type === 'commit')
  const hasRefund = operations?.some(op => op.operation_type === 'refund')
  
  // Détection des incohérences
  const issues = []
  
  if (activation.status === 'received' && activation.frozen_amount > 0) {
    issues.push(`❌ SMS reçu mais frozen_amount=${activation.frozen_amount} (devrait être 0)`)
  }
  
  if (activation.status === 'received' && !activation.charged) {
    issues.push(`❌ SMS reçu mais charged=false (devrait être true)`)
  }
  
  if (activation.status === 'received' && !hasCommit) {
    issues.push(`❌ SMS reçu mais aucune opération COMMIT`)
  }
  
  if (['timeout', 'cancelled'].includes(activation.status) && activation.frozen_amount > 0) {
    issues.push(`❌ Status ${activation.status} mais frozen_amount=${activation.frozen_amount} (devrait être 0)`)
  }
  
  if (['timeout', 'cancelled'].includes(activation.status) && !hasRefund) {
    issues.push(`❌ Status ${activation.status} mais aucune opération REFUND`)
  }
  
  if (activation.frozen_amount > 0 && !hasFreeze) {
    issues.push(`⚠️ frozen_amount=${activation.frozen_amount} mais aucune opération FREEZE`)
  }
  
  if (issues.length > 0) {
    console.log(`\n🚨 PROBLÈMES DÉTECTÉS (${issues.length}):`)
    issues.forEach((issue, i) => {
      console.log(`   ${i+1}. ${issue}`)
    })
  } else {
    console.log(`\n✅ Aucune incohérence détectée`)
  }
  
  // 5. Recommandations
  if (issues.length > 0) {
    console.log(`\n💡 RECOMMANDATIONS:`)
    
    if (activation.status === 'received' && activation.frozen_amount > 0) {
      console.log(`\n   🔧 Appeler atomic_commit() manuellement:`)
      console.log(`   SELECT * FROM atomic_commit(`)
      console.log(`     '${activation.user_id}',`)
      console.log(`     '${activationId}',`)
      console.log(`     NULL,`)
      console.log(`     'Manual fix: SMS received but not charged'`)
      console.log(`   );`)
    }
    
    if (['timeout', 'cancelled'].includes(activation.status) && activation.frozen_amount > 0) {
      console.log(`\n   🔧 Appeler atomic_refund() manuellement:`)
      console.log(`   SELECT * FROM atomic_refund(`)
      console.log(`     '${activation.user_id}',`)
      console.log(`     '${activationId}',`)
      console.log(`     NULL,`)
      console.log(`     'Manual fix: ${activation.status} but not refunded'`)
      console.log(`   );`)
    }
  }
  
  console.log('\n' + '='.repeat(70))
}

analyzeActivation()
