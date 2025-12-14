import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

console.log('🧪 TEST COMPLET: Cycle de vie activation avec SMS')
console.log('═══════════════════════════════════════════════════════════\n')

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

// ÉTAPE 1: État initial
console.log('1️⃣ ÉTAT INITIAL\n')

const { data: userBefore } = await supabase
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', userId)
  .single()

console.log(`Balance avant: ${userBefore.balance}Ⓐ`)
console.log(`Frozen avant: ${userBefore.frozen_balance}Ⓐ`)

// ÉTAPE 2: Créer une activation test
console.log('\n2️⃣ CRÉATION ACTIVATION TEST\n')

const testActivation = {
  user_id: userId,
  order_id: `TEST_${Date.now()}`,
  phone: '+1234567890',
  service_code: 'go',
  country_code: '0',
  operator: 'any',
  price: 2.00,
  frozen_amount: 2.00,
  status: 'waiting',
  provider: 'sms_activate',
  expires_at: new Date(Date.now() + 600000).toISOString()
}

const { data: activation, error: createError } = await supabase
  .from('activations')
  .insert(testActivation)
  .select()
  .single()

if (createError) {
  console.error('❌ Erreur création:', createError.message)
  process.exit(1)
}

console.log(`✅ Activation créée: ${activation.id}`)
console.log(`   Order ID: ${activation.order_id}`)
console.log(`   Price: ${activation.price}Ⓐ`)
console.log(`   Frozen: ${activation.frozen_amount}Ⓐ`)

// ÉTAPE 3 & 4: Freeze les fonds
console.log('\n3️⃣ FREEZE DES FONDS (secure_freeze_balance)\n')

const { data: freezeResult, error: freezeError } = await supabase.rpc('secure_freeze_balance', {
  p_user_id: userId,
  p_amount: activation.price,
  p_activation_id: activation.id,
  p_rental_id: null,
  p_reason: 'Test activation'
})

if (freezeError) {
  console.error('❌ Erreur freeze:', freezeError.message)
  process.exit(1)
} else {
  console.log('✅ Fonds gelés:', JSON.stringify(freezeResult, null, 2))
}

// Récupérer la transaction créée
const { data: transaction } = await supabase
  .from('transactions')
  .select('*')
  .eq('related_activation_id', activation.id)
  .single()

if (transaction) {
  console.log(`\n✅ Transaction créée automatiquement: ${transaction.id}`)
  console.log(`   Montant: ${transaction.amount}Ⓐ`)
  console.log(`   Status: ${transaction.status}`)
}

const { data: userAfterFreeze } = await supabase
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', userId)
  .single()

console.log(`\nBalance après freeze: ${userAfterFreeze.balance}Ⓐ (${userBefore.balance - userAfterFreeze.balance}Ⓐ de différence)`)
console.log(`Frozen après freeze: ${userAfterFreeze.frozen_balance}Ⓐ (+${userAfterFreeze.frozen_balance - userBefore.frozen_balance}Ⓐ)`)

// ÉTAPE 4: Simuler réception SMS
console.log('\n4️⃣ RÉCEPTION SMS (process_sms_received)\n')

const { data: smsResult, error: smsError } = await supabase.rpc('process_sms_received', {
  p_order_id: activation.order_id,
  p_code: '999888',
  p_text: 'Votre code est 999888',
  p_source: 'test'
})

if (smsError) {
  console.error('❌ Erreur SMS:', smsError.message)
  console.error('   Details:', smsError)
} else {
  console.log('✅ SMS traité:', JSON.stringify(smsResult, null, 2))
}

// ÉTAPE 5: Vérifier l'état final
console.log('\n5️⃣ VÉRIFICATION ÉTAT FINAL\n')

const { data: activationAfter } = await supabase
  .from('activations')
  .select('*')
  .eq('id', activation.id)
  .single()

const { data: transactionAfter } = await supabase
  .from('transactions')
  .select('*')
  .eq('id', transaction.id)
  .single()

const { data: userAfter } = await supabase
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', userId)
  .single()

console.log('📱 Activation:')
console.log(`   Status: ${activationAfter.status} (attendu: received)`)
console.log(`   SMS Code: ${activationAfter.sms_code} (attendu: 999888)`)
console.log(`   Charged: ${activationAfter.charged} (attendu: true)`)
console.log(`   Frozen Amount: ${activationAfter.frozen_amount}Ⓐ (attendu: 0)`)

console.log('\n💳 Transaction:')
console.log(`   Status: ${transactionAfter.status} (attendu: completed)`)
console.log(`   Amount: ${transactionAfter.amount}Ⓐ`)

console.log('\n👤 Utilisateur:')
console.log(`   Balance: ${userBefore.balance}Ⓐ → ${userAfter.balance}Ⓐ (diff: ${userAfter.balance - userBefore.balance}Ⓐ)`)
console.log(`   Frozen: ${userBefore.frozen_balance}Ⓐ → ${userAfter.frozen_balance}Ⓐ (diff: ${userAfter.frozen_balance - userBefore.frozen_balance}Ⓐ)`)

// ÉTAPE 6: Vérifier balance_operations
console.log('\n6️⃣ BALANCE OPERATIONS CRÉÉES\n')

const { data: operations } = await supabase
  .from('balance_operations')
  .select('*')
  .eq('activation_id', activation.id)
  .order('created_at', { ascending: true })

console.log(`✅ ${operations.length} opération(s) créée(s):`)
operations.forEach((op, idx) => {
  console.log(`\n   ${idx + 1}. ${op.operation_type.toUpperCase()}`)
  console.log(`      Amount: ${op.amount}Ⓐ`)
  console.log(`      Balance: ${op.balance_before}Ⓐ → ${op.balance_after}Ⓐ`)
  console.log(`      Frozen: ${op.frozen_before}Ⓐ → ${op.frozen_after}Ⓐ`)
  console.log(`      Reason: ${op.reason}`)
})

// ÉTAPE 8: Validation
console.log('\n\n═══════════════════════════════════════════════════════════')
console.log('✅ VALIDATION DU CYCLE COMPLET')
console.log('═══════════════════════════════════════════════════════════\n')

let errors = []
let warnings = []

// Vérifications critiques
if (activationAfter.status !== 'received') {
  errors.push(`Status activation incorrect: ${activationAfter.status} (attendu: received)`)
}

if (activationAfter.sms_code !== '999888') {
  errors.push(`SMS code incorrect: ${activationAfter.sms_code} (attendu: 999888)`)
}

if (!activationAfter.charged) {
  errors.push('Activation pas marquée comme charged')
}

if (activationAfter.frozen_amount !== 0) {
  errors.push(`frozen_amount pas libéré: ${activationAfter.frozen_amount}Ⓐ (attendu: 0)`)
}

if (transactionAfter.status !== 'completed') {
  errors.push(`Transaction pas completed: ${transactionAfter.status}`)
}

// Vérification balance (doit avoir diminué de price)
const expectedBalance = userBefore.balance - activation.price
if (Math.abs(userAfter.balance - expectedBalance) > 0.01) {
  errors.push(`Balance incorrecte: ${userAfter.balance}Ⓐ (attendu: ${expectedBalance}Ⓐ)`)
}

// Vérification frozen (doit revenir à l'état initial)
if (Math.abs(userAfter.frozen_balance - userBefore.frozen_balance) > 0.01) {
  warnings.push(`Frozen pas revenu à l'état initial: ${userAfter.frozen_balance}Ⓐ (attendu: ${userBefore.frozen_balance}Ⓐ)`)
}

// Vérifier qu'on a bien 2 opérations (freeze + commit)
if (operations.length !== 2) {
  warnings.push(`Nombre d'opérations incorrect: ${operations.length} (attendu: 2)`)
}

if (errors.length === 0) {
  console.log('✅ TOUS LES TESTS PASSÉS!')
  console.log('\n📊 RÉSUMÉ:')
  console.log(`   ✅ Activation créée et SMS reçu`)
  console.log(`   ✅ Transaction completed`)
  console.log(`   ✅ Balance débité: -${activation.price}Ⓐ`)
  console.log(`   ✅ Frozen libéré correctement`)
  console.log(`   ✅ Balance operations créées (${operations.length})`)
} else {
  console.log('❌ ÉCHECS DÉTECTÉS:\n')
  errors.forEach(err => console.log(`   - ${err}`))
}

if (warnings.length > 0) {
  console.log('\n⚠️  AVERTISSEMENTS:\n')
  warnings.forEach(warn => console.log(`   - ${warn}`))
}

// ÉTAPE 7: Cleanup
console.log('\n7️⃣ NETTOYAGE\n')

await supabase.from('balance_operations').delete().eq('activation_id', activation.id)
if (transaction) {
  await supabase.from('transactions').delete().eq('id', transaction.id)
}
await supabase.from('activations').delete().eq('id', activation.id)

// Restaurer balance
await supabase
  .from('users')
  .update({
    balance: userBefore.balance,
    frozen_balance: userBefore.frozen_balance
  })
  .eq('id', userId)

console.log('✅ Données de test supprimées')
console.log('✅ Balance restaurée\n')

process.exit(errors.length === 0 ? 0 : 1)
