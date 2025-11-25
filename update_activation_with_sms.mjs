#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

const orderId = '4450751126'
const phoneNumber = '6283187992499'
const smsCode = '300828'

console.log('🔄 MISE À JOUR DE L\'ACTIVATION AVEC LE SMS')
console.log('='.repeat(50))

try {
  // Authentifier
  await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  })

  console.log('✅ Authentifié')
  console.log('')

  // Trouver l'activation
  console.log('🔍 Recherche de l\'activation...')
  const { data: activation, error: fetchError } = await supabase
    .from('activations')
    .select('*')
    .eq('order_id', orderId)
    .single()

  if (fetchError || !activation) {
    console.error('❌ Activation non trouvée:', fetchError?.message)
    process.exit(1)
  }

  console.log('✅ Activation trouvée!')
  console.log('   ID:', activation.id)
  console.log('   Status actuel:', activation.status)
  console.log('   SMS Code actuel:', activation.sms_code || 'Aucun')
  console.log('')

  // Mettre à jour avec le SMS
  console.log('💾 Mise à jour avec le SMS code:', smsCode)
  
  const { data: updated, error: updateError } = await supabase
    .from('activations')
    .update({
      sms_code: smsCode,
      sms_text: `STATUS_OK:${smsCode}`,
      status: 'completed',
      charged: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', activation.id)
    .select()
    .single()

  if (updateError) {
    console.error('❌ Erreur de mise à jour:', updateError.message)
    console.error('Détails:', updateError)
    process.exit(1)
  }

  console.log('✅ Activation mise à jour avec succès!')
  console.log('')
  console.log('📊 DÉTAILS:')
  console.log('   ID:', updated.id)
  console.log('   Phone:', updated.phone)
  console.log('   SMS Code:', updated.sms_code)
  console.log('   Status:', updated.status)
  console.log('   Charged:', updated.charged)
  console.log('')

  // Mettre à jour la transaction
  console.log('💰 Mise à jour de la transaction...')
  
  const { error: transactionError } = await supabase
    .from('transactions')
    .update({ status: 'completed' })
    .eq('related_activation_id', activation.id)

  if (transactionError) {
    console.warn('⚠️ Erreur transaction:', transactionError.message)
  } else {
    console.log('✅ Transaction mise à jour')
  }

  console.log('')
  console.log('🎉 MISE À JOUR TERMINÉE!')
  console.log('✅ Le SMS code 300828 est maintenant visible sur la plateforme.')

} catch (error) {
  console.error('❌ Erreur:', error.message)
  console.error(error.stack)
}