import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL
)

const orderId = '4491978774'

console.log('🧪 TEST MANUEL: Simuler le traitement d\'un SMS')
console.log('═════════════════════════════════════\n')

// 1. Récupérer l'activation
const { data: activation } = await supabase
  .from('activations')
  .select('*')
  .eq('order_id', orderId)
  .single()

console.log('1️⃣ Activation trouvée:', activation.id)
console.log('   Order ID:', activation.order_id)
console.log('   Status:', activation.status)

// 2. Simuler un SMS reçu (code factice pour le test)
const testCode = '123456'
const testText = 'Votre code de validation est 123456'

console.log('\n2️⃣ Appel de process_sms_received...')
console.log('   Code:', testCode)
console.log('   Text:', testText)

const { data: result, error } = await supabase.rpc('process_sms_received', {
  p_order_id: orderId,
  p_code: testCode,
  p_text: testText,
  p_source: 'manual_test'
})

if (error) {
  console.log('\n❌ ERREUR RPC:')
  console.log('   Message:', error.message)
  console.log('   Details:', error.details)
  console.log('   Hint:', error.hint)
  console.log('   Code:', error.code)
} else {
  console.log('\n✅ Résultat:')
  console.log(JSON.stringify(result, null, 2))
  
  if (result.success) {
    console.log('\n✅ SUCCESS! Le SMS a été traité')
  } else {
    console.log('\n❌ ÉCHEC:', result.error)
  }
}

// 3. Vérifier l'état après
const { data: updated } = await supabase
  .from('activations')
  .select('status, sms_code, charged, frozen_amount')
  .eq('id', activation.id)
  .single()

console.log('\n3️⃣ État après traitement:')
console.log('   Status:', updated.status)
console.log('   SMS Code:', updated.sms_code)
console.log('   Charged:', updated.charged)
console.log('   Frozen:', updated.frozen_amount)

process.exit(0)
