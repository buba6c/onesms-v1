import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

async function analyzeNumber() {
  const phoneNumber = '6285129481060'
  
  console.log('🔍 ANALYSE DEEP: Numéro qui a reçu SMS mais frozen_amount non dégélé\n')
  console.log('='.repeat(70))
  console.log(`📱 Numéro: ${phoneNumber}\n`)

  // 1. Trouver l'activation
  const { data: activation, error: actErr } = await supabase
    .from('activations')
    .select('*')
    .eq('phone', phoneNumber)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (actErr || !activation) {
    console.error('❌ Activation non trouvée:', actErr)
    return
  }

  console.log('📋 ACTIVATION TROUVÉE:')
  console.log(`   ID: ${activation.id}`)
  console.log(`   User ID: ${activation.user_id}`)
  console.log(`   Status: ${activation.status}`)
  console.log(`   Phone: ${activation.phone}`)
  console.log(`   Service: ${activation.service_code}`)
  console.log(`   Price: ${activation.price} Ⓐ`)
  console.log(`   Frozen Amount: ${activation.frozen_amount} Ⓐ ⚠️`)
  console.log(`   Charged: ${activation.charged}`)
  console.log(`   SMS Code: ${activation.sms_code || 'N/A'}`)
  console.log(`   Created: ${activation.created_at}`)
  console.log(`   Expires: ${activation.expires_at}`)
  console.log(`   Updated: ${activation.updated_at}`)

  // 2. Vérifier si SMS reçu
  const hasSMS = !!activation.sms_code
  console.log(`\n📨 SMS REÇU: ${hasSMS ? '✅ OUI' : '❌ NON'}`)
  if (hasSMS) {
    console.log(`   Code SMS: ${activation.sms_code}`)
  }

  // 3. Chercher les balance_operations liées
  const { data: operations, error: opErr } = await supabase
    .from('balance_operations')
    .select('*')
    .eq('activation_id', activation.id)
    .order('created_at', { ascending: true })
  
  console.log(`\n💰 BALANCE_OPERATIONS (${operations?.length || 0}):`)
  if (operations && operations.length > 0) {
    operations.forEach((op, idx) => {
      console.log(`\n   ${idx + 1}. ${op.operation_type.toUpperCase()} - ${op.amount} Ⓐ`)
      console.log(`      Created: ${op.created_at}`)
      console.log(`      Reason: ${op.reason}`)
      console.log(`      Balance: ${op.balance_before} → ${op.balance_after}`)
      console.log(`      Frozen: ${op.frozen_before} → ${op.frozen_after}`)
    })
  } else {
    console.log('   ❌ AUCUNE opération trouvée')
  }

  // 4. Analyser l'état attendu vs réel
  console.log(`\n🔬 ANALYSE DE L'ÉTAT:`)
  
  const expectedState = {
    shouldBeCharged: hasSMS && activation.status === 'received',
    shouldHaveFrozenZero: hasSMS && activation.status === 'received',
    shouldHaveChargeOp: hasSMS
  }

  console.log(`\n   État attendu si SMS reçu:`)
  console.log(`      status: "received" → Actuel: "${activation.status}" ${activation.status === 'received' ? '✅' : '❌'}`)
  console.log(`      charged: true → Actuel: ${activation.charged} ${activation.charged ? '✅' : '❌'}`)
  console.log(`      frozen_amount: 0 → Actuel: ${activation.frozen_amount} ${activation.frozen_amount === 0 ? '✅' : '❌'}`)
  
  const hasFreeze = operations?.some(op => op.operation_type === 'freeze')
  const hasCharge = operations?.some(op => op.operation_type === 'charge')
  const hasRefund = operations?.some(op => op.operation_type === 'refund')
  
  console.log(`\n   Opérations attendues:`)
  console.log(`      FREEZE operation: ${hasFreeze ? '✅ OUI' : '❌ NON'}`)
  console.log(`      CHARGE operation: ${hasCharge ? '✅ OUI' : '❌ NON'} ${!hasCharge && hasSMS ? '⚠️ MANQUANTE!' : ''}`)
  console.log(`      REFUND operation: ${hasRefund ? '⚠️ OUI (bizarre)' : '✅ NON'}`)

  // 5. Vérifier l'état de l'utilisateur
  const { data: user } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .eq('id', activation.user_id)
    .single()
  
  console.log(`\n👤 UTILISATEUR:`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Balance: ${user.balance} Ⓐ`)
  console.log(`   Frozen: ${user.frozen_balance} Ⓐ`)

  // 6. DIAGNOSTIC FINAL
  console.log(`\n🎯 DIAGNOSTIC:`)
  
  if (hasSMS && activation.frozen_amount > 0) {
    console.log(`\n   ❌ PROBLÈME DÉTECTÉ: SMS reçu mais frozen_amount non dégélé`)
    console.log(`\n   🔍 CAUSES POSSIBLES:`)
    
    if (!hasCharge) {
      console.log(`      1. ❌ CAUSE PROBABLE: atomic_commit() jamais appelé`)
      console.log(`         → La fonction qui traite la réception de SMS n'a pas appelé atomic_commit()`)
      console.log(`         → Vérifier check-sms-activate-status/index.ts ligne ~200-230`)
    }
    
    if (activation.status !== 'received') {
      console.log(`      2. ⚠️ Status incorrect: "${activation.status}" au lieu de "received"`)
    }
    
    if (!activation.charged) {
      console.log(`      3. ⚠️ Flag charged=false alors que SMS reçu`)
    }

    console.log(`\n   💡 SOLUTION:`)
    console.log(`      Option 1: Appeler manuellement atomic_commit() pour cette activation`)
    console.log(`      Option 2: Fixer le code de check-sms-activate-status pour appeler atomic_commit()`)
    console.log(`      Option 3: Refund manuel si le service n'a pas été rendu`)

    // Proposer un fix SQL
    console.log(`\n   🔧 FIX SQL IMMÉDIAT (si service rendu):`)
    console.log(`\n   SELECT * FROM atomic_commit(`)
    console.log(`     p_user_id := '${activation.user_id}',`)
    console.log(`     p_activation_id := '${activation.id}',`)
    console.log(`     p_reason := 'Manual commit: SMS received but not charged'`)
    console.log(`   );`)
  } else if (!hasSMS && activation.frozen_amount > 0) {
    console.log(`\n   ⚠️ ÉTAT: Activation en attente, frozen_amount normal`)
  } else {
    console.log(`\n   ✅ État cohérent`)
  }

  console.log(`\n${'='.repeat(70)}`)
}

analyzeNumber()
