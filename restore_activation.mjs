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

console.log('🔄 RESTAURATION DE L\'ACTIVATION')
console.log('='.repeat(50))

try {
  // Authentifier
  await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  })

  console.log('✅ Authentifié')
  console.log('')
  console.log('📞 Numéro:', phoneNumber)
  console.log('🆔 Order ID:', orderId)
  console.log('📱 SMS Code:', smsCode)
  console.log('')

  // Récupérer l'utilisateur
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('❌ Utilisateur non trouvé')
    process.exit(1)
  }

  console.log('👤 User ID:', user.id)
  console.log('')

  // Créer l'activation avec le SMS
  console.log('💾 Création de l\'activation dans la base de données...')
  
  const { data: activation, error: insertError } = await supabase
    .from('activations')
    .insert({
      user_id: user.id,
      order_id: orderId,
      phone: phoneNumber,
      service_code: 'whatsapp',
      country_code: 'indonesia',
      operator: 'any',
      price: 0.175,
      status: 'completed',
      sms_code: smsCode,
      sms_text: `STATUS_OK:${smsCode}`,
      charged: true,
      provider: 'sms-activate',
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString()
    })
    .select()
    .single()

  if (insertError) {
    console.error('❌ Erreur d\'insertion:', insertError.message)
    console.error('Détails:', insertError)
    process.exit(1)
  }

  console.log('✅ Activation créée avec succès!')
  console.log('🆔 ID:', activation.id)
  console.log('📞 Phone:', activation.phone)
  console.log('📱 SMS Code:', activation.sms_code)
  console.log('✅ Status:', activation.status)
  console.log('')

  // Créer la transaction
  console.log('💰 Création de la transaction...')
  
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'purchase',
      amount: -0.175,
      description: `SMS activation pour whatsapp en indonesia`,
      status: 'completed',
      related_activation_id: activation.id
    })

  if (transactionError) {
    console.warn('⚠️ Erreur transaction:', transactionError.message)
  } else {
    console.log('✅ Transaction créée')
  }

  console.log('')
  console.log('🎉 RESTAURATION TERMINÉE!')
  console.log('Le SMS devrait maintenant apparaître sur la plateforme.')

} catch (error) {
  console.error('❌ Erreur:', error.message)
  console.error(error.stack)
}