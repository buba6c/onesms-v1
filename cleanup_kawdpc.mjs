import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const userId = '81af6261-e668-47d0-80ce-d3977e4567fd'

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║  🧹 CLEANUP: kawdpc@gmail.com frozen funds                    ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

// État initial
const { data: user } = await sb
  .from('users')
  .select('email, balance, frozen_balance')
  .eq('id', userId)
  .single()

console.log('📊 ÉTAT INITIAL:')
console.log(`Email: ${user.email}`)
console.log(`Balance: ${user.balance}Ⓐ`)
console.log(`Frozen: ${user.frozen_balance}Ⓐ`)
console.log(`Disponible: ${user.balance - user.frozen_balance}Ⓐ\n`)

if (user.frozen_balance <= 0) {
  console.log('✅ Pas de fonds gelés à nettoyer!')
  process.exit(0)
}

// Chercher freeze sans refund
const { data: freezeOps } = await sb
  .from('balance_operations')
  .select('*')
  .eq('user_id', userId)
  .eq('operation_type', 'freeze')
  .order('created_at', { ascending: false })
  .limit(50)

console.log('🔍 ANALYSE DES FREEZE:')
let toRefund = []
let totalToRefund = 0

for (const freeze of freezeOps || []) {
  const { data: refundOp } = await sb
    .from('balance_operations')
    .select('*')
    .eq('user_id', userId)
    .eq('activation_id', freeze.activation_id)
    .eq('operation_type', 'refund')
    .single()
    
  const time = new Date(freeze.created_at).toLocaleTimeString()
  
  if (!refundOp) {
    // Vérifier l'activation
    const { data: activation } = await sb
      .from('activations')
      .select('*')
      .eq('id', freeze.activation_id)
      .single()
      
    if (activation && ['timeout', 'cancelled'].includes(activation.status)) {
      console.log(`[${time}] FREEZE ${freeze.amount}Ⓐ | ${activation.service_code} | ${activation.status}`)
      console.log(`   ❌ PAS DE REFUND - activation_id: ${activation.id}`)
      
      toRefund.push({
        activation,
        amount: freeze.amount
      })
      totalToRefund += freeze.amount
    }
  }
}

console.log(`\n💰 TOTAL À REFUND: ${totalToRefund}Ⓐ`)

if (toRefund.length === 0) {
  console.log('✅ Aucun phantom freeze trouvé!')
  process.exit(0)
}

console.log('\n🔓 LIBÉRATION DES FONDS:\n')

let refunded = 0
let errors = 0

for (let i = 0; i < toRefund.length; i++) {
  const item = toRefund[i]
  console.log(`[${i+1}/${toRefund.length}] Refund ${item.amount}Ⓐ (${item.activation.service_code})...`)
  
  const { data: result, error } = await sb.rpc('atomic_refund', {
    p_user_id: userId,
    p_amount: item.amount,
    p_activation_id: item.activation.id,
    p_reason: 'Phantom frozen cleanup - kawdpc'
  })
  
  if (error) {
    console.log(`   ❌ ERROR: ${error.message}`)
    errors++
  } else {
    console.log(`   ✅ SUCCESS: ${result.amount_refunded || item.amount}Ⓐ libérés`)
    refunded += result.amount_refunded || item.amount
  }
}

// État final
const { data: finalUser } = await sb
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', userId)
  .single()

console.log('\n══════════════════════════════════════════════════════════════════════')
console.log('\n📊 RÉSUMÉ KAWDPC CLEANUP:')
console.log(`✅ Refunds réussis: ${toRefund.length - errors}`)
console.log(`❌ Erreurs: ${errors}`)
console.log(`💰 Total libéré: ${refunded}Ⓐ\n`)

console.log('AVANT:')
console.log(`  Balance: ${user.balance}Ⓐ`)
console.log(`  Frozen: ${user.frozen_balance}Ⓐ`)
console.log(`  Disponible: ${user.balance - user.frozen_balance}Ⓐ\n`)

console.log('APRÈS:')
console.log(`  Balance: ${finalUser.balance}Ⓐ`)
console.log(`  Frozen: ${finalUser.frozen_balance}Ⓐ`)
console.log(`  Disponible: ${finalUser.balance - finalUser.frozen_balance}Ⓐ\n`)

console.log('DIFFÉRENCE:')
console.log(`  Frozen libéré: ${user.frozen_balance - finalUser.frozen_balance}Ⓐ`)
console.log(`  Disponible gagné: +${(finalUser.balance - finalUser.frozen_balance) - (user.balance - user.frozen_balance)}Ⓐ\n`)

if (finalUser.frozen_balance > 0) {
  console.log(`⚠️  RESTE ${finalUser.frozen_balance}Ⓐ gelés (probablement légitimes)`)
} else {
  console.log('✅ SUCCÈS TOTAL: Tous les phantom frozen nettoyés!')
}