#!/usr/bin/env node

import dotenv from 'dotenv'
dotenv.config()

const ORDER_ID = '4450751126' // Numéro 6283187992499
const API_KEY = process.env.VITE_SMS_ACTIVATE_API_KEY

console.log('📞 VÉRIFICATION SMS-ACTIVATE')
console.log('Order ID:', ORDER_ID)
console.log('Numéro attendu: 6283187992499')
console.log('API Key présente:', !!API_KEY)
console.log('='.repeat(50))

try {
  // Test API V1
  console.log('📡 Test API V1...')
  const v1Response = await fetch(`https://api.sms-activate.io/stubs/handler_api.php?api_key=${API_KEY}&action=getStatus&id=${ORDER_ID}`)
  const v1Data = await v1Response.text()
  console.log('V1 Response:', v1Data)
  
  // Test API V2  
  console.log('')
  console.log('📡 Test API V2...')
  const v2Response = await fetch(`https://api.sms-activate.io/stubs/handler_api.php?api_key=${API_KEY}&action=getStatusV2&id=${ORDER_ID}`)
  const v2Data = await v2Response.text()
  console.log('V2 Response:', v2Data)
  
  console.log('')
  console.log('📊 ANALYSE:')
  
  if (v1Data.startsWith('STATUS_OK:')) {
    const smsCode = v1Data.split(':')[1]
    console.log(`🎯 SMS TROUVÉ! Code: ${smsCode}`)
    console.log('🚨 PROBLÈME CONFIRMÉ: SMS existe sur SMS-Activate mais pas sur la plateforme!')
    
  } else if (v1Data === 'STATUS_CANCEL') {
    console.log('❌ Activation annulée sur SMS-Activate')
  } else {
    console.log(`❌ Status V1: ${v1Data}`)
  }

  if (v2Data !== 'WRONG_ACTIVATION_ID' && v2Data !== 'STATUS_CANCEL') {
    try {
      const v2Json = JSON.parse(v2Data)
      if (v2Json.sms && v2Json.sms.length > 0) {
        console.log(`✅ SMS TROUVÉ dans V2! Code: ${v2Json.sms[0].code}`)
        console.log(`   Text: ${v2Json.sms[0].text}`)
      }
    } catch (e) {
      console.log('❌ V2 response n\'est pas du JSON valide')
    }
  }

} catch (error) {
  console.error('❌ Erreur:', error.message)
}