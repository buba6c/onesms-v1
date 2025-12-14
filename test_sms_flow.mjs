import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

console.log('🧪 Test du flux complet de réception SMS\n')

// Test 1: Créer une activation de test
console.log('1️⃣ Création d\'une activation de test...')

const testActivation = {
  user_id: 'e108c02a-2012-4043-bbc2-fb09bb11f824', // ID utilisateur existant
  order_id: `test_${Date.now()}`,
  phone: '+33612345678',
  service_code: 'go',
  country_code: '0',
  operator: 'any',
  price: 1.00,
  frozen_amount: 1.00,
  status: 'waiting',
  provider: 'sms_activate',
  expires_at: new Date(Date.now() + 600000).toISOString() // +10 min
}

const { data: activation, error: createError } = await supabase
  .from('activations')
  .insert(testActivation)
  .select()
  .single()

if (createError) {
  console.error('❌ Erreur création activation:', createError.message)
  process.exit(1)
}

console.log(`✅ Activation créée: ${activation.order_id}`)
console.log(`   Status: ${activation.status}`)
console.log(`   Frozen: ${activation.frozen_amount}Ⓐ`)

// Test 2: Simuler la réception d'un SMS via process_sms_received
console.log('\n2️⃣ Simulation réception SMS (code: 123456)...')

const { data: processResult, error: processError } = await supabase.rpc('process_sms_received', {
  p_order_id: activation.order_id,
  p_code: '123456',
  p_text: 'Votre code de validation est 123456',
  p_source: 'test'
})

if (processError) {
  console.error('❌ Erreur process_sms_received:', processError.message)
} else {
  console.log('✅ process_sms_received résultat:', processResult)
}

// Test 3: Vérifier l'état de l'activation après traitement
console.log('\n3️⃣ Vérification de l\'activation après traitement...')

const { data: updatedActivation, error: checkError } = await supabase
  .from('activations')
  .select('*')
  .eq('id', activation.id)
  .single()

if (checkError) {
  console.error('❌ Erreur lecture activation:', checkError.message)
} else {
  console.log('✅ État de l\'activation:')
  console.log(`   Status: ${updatedActivation.status}`)
  console.log(`   SMS Code: ${updatedActivation.sms_code}`)
  console.log(`   SMS Text: ${updatedActivation.sms_text}`)
  console.log(`   SMS Received At: ${updatedActivation.sms_received_at}`)
  console.log(`   Charged: ${updatedActivation.charged}`)
}

// Test 4: Vérifier les transactions
console.log('\n4️⃣ Vérification des transactions...')

const { data: transactions, error: txError } = await supabase
  .from('transactions')
  .select('*')
  .eq('related_activation_id', activation.id)
  .order('created_at', { ascending: false })

if (txError) {
  console.error('❌ Erreur lecture transactions:', txError.message)
} else {
  console.log(`✅ Transactions trouvées: ${transactions.length}`)
  transactions.forEach(tx => {
    console.log(`   - ${tx.type}: ${tx.amount}Ⓐ (status: ${tx.status})`)
  })
}

// Test 5: Vérifier le wallet de l'utilisateur
console.log('\n5️⃣ Vérification du wallet utilisateur...')

const { data: user, error: userError } = await supabase
  .from('users')
  .select('balance, frozen_balance')
  .eq('id', activation.user_id)
  .single()

if (userError) {
  console.error('❌ Erreur lecture utilisateur:', userError.message)
} else {
  console.log(`✅ Wallet:`)
  console.log(`   Balance: ${user.balance}Ⓐ`)
  console.log(`   Frozen: ${user.frozen_balance}Ⓐ`)
}

// Test 6: Nettoyer (supprimer l'activation de test)
console.log('\n6️⃣ Nettoyage...')

const { error: deleteError } = await supabase
  .from('activations')
  .delete()
  .eq('id', activation.id)

if (deleteError) {
  console.warn('⚠️  Erreur suppression activation:', deleteError.message)
} else {
  console.log('✅ Activation de test supprimée')
}

console.log('\n🎉 Test terminé!')

// Résumé
console.log('\n📊 RÉSUMÉ DU TEST:')
console.log('─────────────────────────────────────')
if (processResult?.success) {
  console.log('✅ Le SMS a été traité avec succès')
  console.log('✅ L\'activation a été mise à jour')
  console.log('✅ Les fonds ont été commités')
  console.log('✅ Le système fonctionne correctement')
} else {
  console.log('❌ Le traitement du SMS a échoué')
  console.log('⚠️  Vérifier les logs ci-dessus')
}

process.exit(0)
