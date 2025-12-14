import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

async function analyzeActivation() {
  const activationId = 'eaf40992-c026-426c-95a2-fc522a670c65'
  
  console.log('🔍 ANALYSE DEEP: SMS reçu mais frozen_amount toujours présent')
  console.log('='.repeat(70))
  console.log(`Activation ID: ${activationId}`)
  console.log(`Numéro: 6285129481060\n`)

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

  console.log('📋 ÉTAT DE L\'ACTIVATION:')
  console.log(`   ID: ${activation.id}`)
  console.log(`   User: ${activation.user_id}`)
  console.log(`   Numéro: ${activation.phone}`)
  console.log(`   Service: ${activation.service_code}`)
  console.log(`   Status: ${activation.status}`)
  console.log(`   Prix: ${activation.price} Ⓐ`)
  console.log(`   Frozen Amount: ${activation.frozen_amount} Ⓐ ⚠️`)
  console.log(`   Charged: ${activation.charged}`)
  console.log(`   SMS Code: ${activation.sms_code || 'N/A'}`)
  console.log(`   Created: ${activation.created_at}`)
  console.log(`   Updated: ${activation.updated_at}`)
  console.log(`   Expires: ${activation.expires_at}`)

  // 2. Balance operations liées
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
    console.log('   ⚠️ AUCUNE opération trouvée')
  }

  // 3. User state
  const { data: user } = await supabase
    .from('users')
    .select('id, email, balance, frozen_balance')
    .eq('id', activation.user_id)
    .single()
  
  console.log(`\n👤 USER STATE:`)
  console.log(`   Email: ${user?.email}`)
  console.log(`   Balance: ${user?.balance} Ⓐ`)
  console.log(`   Frozen: ${user?.frozen_balance} Ⓐ`)

  // 4. Analyse intelligente
  console.log(`\n🧠 ANALYSE INTELLIGENTE:`)
  console.log('='.repeat(70))
  
  const hasFreeze = operations?.some(op => op.operation_type === 'freeze')
  const hasCharge = operations?.some(op => op.operation_type === 'charge')
  const hasRefund = operations?.some(op => op.operation_type === 'refund')
  
  console.log(`\n📊 Flux des opérations:`)
  console.log(`   ✅ FREEZE opération: ${hasFreeze ? 'OUI' : 'NON ❌'}`)
  console.log(`   ${hasCharge ? '✅' : '❌'} CHARGE opération: ${hasCharge ? 'OUI' : 'NON'}`)
  console.log(`   ${hasRefund ? '⚠️' : '✅'} REFUND opération: ${hasRefund ? 'OUI (anormal si SMS reçu!)' : 'NON'}`)

  console.log(`\n🔍 Diagnostic du problème:`)
  
  if (activation.status === 'received' && activation.frozen_amount > 0 && !activation.charged) {
    console.log(`   ❌ PROBLÈME IDENTIFIÉ: SMS reçu mais pas chargé`)
    console.log(`   
   📌 État attendu:
      - status = 'received' ✅
      - frozen_amount = 0 ❌ (actuellement ${activation.frozen_amount})
      - charged = true ❌ (actuellement ${activation.charged})
      - Operation CHARGE présente ❌ (actuellement ${hasCharge ? 'OUI' : 'NON'})
   
   🎯 CAUSE PROBABLE:
      La fonction qui gère la réception de SMS n'a PAS appelé atomic_commit()
      ou atomic_commit() a échoué silencieusement.
   
   🔧 SOLUTION:
      1. Vérifier check-sms-activate-status/index.ts ligne ~200-250
      2. Chercher l'appel à atomic_commit() après sms_code mis à jour
      3. Vérifier si l'appel existe et si les erreurs sont loggées
    `)
  }

  // 5. Vérifier si atomic_commit fonctionne
  console.log(`\n🧪 TEST: atomic_commit() existe-t-il?`)
  const { data: commitTest, error: commitErr } = await supabase.rpc('atomic_commit', {
    p_user_id: activation.user_id,
    p_activation_id: activationId,
    p_reason: 'TEST - dry run (will rollback)'
  })
  
  if (commitErr) {
    console.log(`   ❌ atomic_commit() RPC ERROR:`, commitErr.message)
    console.log(`   💡 La fonction SQL n'existe peut-être pas ou a un problème`)
  } else if (commitTest?.idempotent) {
    console.log(`   ⚠️ atomic_commit() dit "idempotent" (frozen_amount déjà à 0)`)
  } else if (commitTest?.success) {
    console.log(`   ✅ atomic_commit() fonctionne (charged: ${commitTest.committed} Ⓐ)`)
  } else {
    console.log(`   ❌ atomic_commit() a échoué:`, commitTest)
  }

  // 6. Recommandations
  console.log(`\n💡 RECOMMANDATIONS:`)
  console.log('='.repeat(70))
  console.log(`
   1️⃣ VÉRIFIER LE CODE:
      Fichier: supabase/functions/check-sms-activate-status/index.ts
      Chercher: Quand status passe à 'received' (SMS code reçu)
      Vérifier: Appel à atomic_commit() après mise à jour du sms_code
   
   2️⃣ CORRIGER MANUELLEMENT (si nécessaire):
      Execute: SELECT * FROM atomic_commit(
        '${activation.user_id}',
        '${activationId}',
        NULL,
        'Manual fix: SMS received but not charged'
      );
   
   3️⃣ LOGS:
      Vérifier les logs Edge Function de cette activation:
      Timestamp: ${activation.updated_at}
      Rechercher: "atomic_commit" ou "charge" ou erreurs RPC
  `)

  console.log('='.repeat(70))
}

analyzeActivation()
