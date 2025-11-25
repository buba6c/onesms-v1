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

console.log('🔍 DIAGNOSTIC COMPLET:', phoneNumber)
console.log('='.repeat(50))

try {
  // 1. Vérifier dans la base de données
  console.log('💾 Vérification dans la base de données...')
  
  const { data: byOrderId } = await supabase
    .from('activations')
    .select('*')
    .eq('order_id', orderId)
    .single()

  if (byOrderId) {
    console.log('✅ Trouvé par order_id:', orderId)
    console.log('   ID:', byOrderId.id)
    console.log('   Status:', byOrderId.status)
    console.log('   SMS Code:', byOrderId.sms_code || 'Aucun')
    console.log('   Created:', byOrderId.created_at)
    console.log('   Expires:', byOrderId.expires_at)
  } else {
    console.log('❌ Pas trouvé par order_id')
  }

  const { data: byPhone } = await supabase
    .from('activations')
    .select('*')
    .eq('phone', phoneNumber)
    .single()

  if (byPhone) {
    console.log('✅ Trouvé par phone:', phoneNumber)
    console.log('   ID:', byPhone.id)
    console.log('   Order ID:', byPhone.order_id)
    console.log('   Status:', byPhone.status)
    console.log('   SMS Code:', byPhone.sms_code || 'Aucun')
  } else {
    console.log('❌ Pas trouvé par phone')
  }

  // 2. Vérifier sur SMS-Activate API V2
  console.log('')
  console.log('🌐 Vérification sur SMS-Activate API V2...')
  const v2Url = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${process.env.VITE_SMS_ACTIVATE_API_KEY}&action=getStatusV2&id=${orderId}`
  const v2Response = await fetch(v2Url)
  const v2Text = await v2Response.text()
  
  console.log('📥 Réponse V2:', v2Text)
  
  try {
    const v2Data = JSON.parse(v2Text)
    if (v2Data.sms && v2Data.sms.length > 0) {
      console.log('✅ SMS trouvé en V2!')
      v2Data.sms.forEach((sms, i) => {
        console.log(`   ${i + 1}. Code: ${sms.code}`)
        console.log(`      Text: ${sms.text}`)
        console.log(`      Date: ${sms.date}`)
      })
    }
  } catch (e) {
    // Not JSON, check if error message
    if (v2Text.includes('WRONG_ACTIVATION_ID')) {
      console.log('⚠️ V2 retourne WRONG_ACTIVATION_ID')
    }
  }

  // 3. Vérifier sur SMS-Activate API V1 (fallback)
  console.log('')
  console.log('🌐 Vérification sur SMS-Activate API V1...')
  const v1Url = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${process.env.VITE_SMS_ACTIVATE_API_KEY}&action=getStatus&id=${orderId}`
  const v1Response = await fetch(v1Url)
  const v1Text = await v1Response.text()
  
  console.log('📥 Réponse V1:', v1Text)
  
  if (v1Text.startsWith('STATUS_OK:')) {
    const smsCode = v1Text.split(':')[1]
    console.log('✅ SMS trouvé en V1!')
    console.log('📱 SMS Code:', smsCode)
    
    // Si on a trouvé le SMS mais pas dans la DB, on peut le mettre à jour
    if (byOrderId && !byOrderId.sms_code) {
      console.log('')
      console.log('💡 SMS trouvé sur API mais pas dans la DB!')
      console.log('🔄 Mise à jour de la base de données...')
      
      const { error: updateError } = await supabase
        .from('activations')
        .update({
          sms_code: smsCode,
          sms_text: v1Text,
          status: 'completed',
          charged: true
        })
        .eq('id', byOrderId.id)
      
      if (updateError) {
        console.error('❌ Erreur de mise à jour:', updateError.message)
      } else {
        console.log('✅ Base de données mise à jour avec le SMS code:', smsCode)
      }
    }
  } else if (v1Text.includes('STATUS_WAIT_CODE')) {
    console.log('⏳ En attente du SMS')
  } else if (v1Text.includes('STATUS_CANCEL')) {
    console.log('❌ Activation annulée')
  }

  // 4. Résumé
  console.log('')
  console.log('📊 RÉSUMÉ:')
  console.log('   Database:', byOrderId ? '✅ Existe' : '❌ Introuvable')
  console.log('   SMS-Activate:', v1Text.startsWith('STATUS_OK') ? '✅ SMS reçu' : '❌ Pas de SMS')
  console.log('   Synchro:', byOrderId?.sms_code ? '✅ Synchronisé' : '❌ Non synchronisé')

} catch (error) {
  console.error('❌ Erreur:', error.message)
  console.error(error.stack)
}