#!/usr/bin/env node

import dotenv from 'dotenv'

dotenv.config()

const orderId = '4450751126'
const phoneNumber = '6283187992499'

console.log('🔍 ANALYSE DU NUMÉRO', phoneNumber)
console.log('📞 Order ID SMS-Activate:', orderId)
console.log('='.repeat(50))

try {
  // Test V2 API (JSON)
  console.log('🌐 Test API V2 (getStatusV2)...')
  const v2Url = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${process.env.VITE_SMS_ACTIVATE_API_KEY}&action=getStatusV2&id=${orderId}`
  const v2Response = await fetch(v2Url)
  const v2Text = await v2Response.text()
  
  console.log('📥 Réponse V2:', v2Text)
  
  let v2Data = null
  try {
    v2Data = JSON.parse(v2Text)
    if (v2Data.sms && v2Data.sms.length > 0) {
      console.log('✅ SMS trouvé en V2!')
      console.log('📱 SMS Code:', v2Data.sms[0].code)
      console.log('📝 SMS Text:', v2Data.sms[0].text)
    }
  } catch (e) {
    console.log('⚠️ V2 response is not JSON:', v2Text)
  }

  // Test V1 API (text format)
  console.log('')
  console.log('🌐 Test API V1 (getStatus)...')
  const v1Url = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${process.env.VITE_SMS_ACTIVATE_API_KEY}&action=getStatus&id=${orderId}`
  const v1Response = await fetch(v1Url)
  const v1Text = await v1Response.text()
  
  console.log('📥 Réponse V1:', v1Text)
  
  if (v1Text.startsWith('STATUS_OK:')) {
    const smsCode = v1Text.split(':')[1]
    console.log('✅ SMS trouvé en V1!')
    console.log('📱 SMS Code:', smsCode)
  }

  // Test de récupération historique  
  console.log('')
  console.log('🌐 Test API getHistory...')
  
  // Get history for last 24 hours
  const yesterday = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
  const now = Math.floor(Date.now() / 1000)
  
  const historyUrl = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${process.env.VITE_SMS_ACTIVATE_API_KEY}&action=getHistory&start=${yesterday}&end=${now}`
  const historyResponse = await fetch(historyUrl)
  const historyText = await historyResponse.text()
  
  console.log('📥 History response length:', historyText.length)
  
  if (historyText.includes(orderId)) {
    console.log('✅ Order trouvé dans l\'historique!')
    
    // Extract SMS from history
    const lines = historyText.split('\n')
    const orderLine = lines.find(line => line.includes(orderId))
    if (orderLine) {
      console.log('📄 Line from history:', orderLine)
      
      // Parse history format: time;phone;activationId;service;country;operator;sms;price
      const parts = orderLine.split(';')
      if (parts.length >= 7 && parts[6]) {
        console.log('📱 SMS Code from history:', parts[6])
      }
    }
  } else {
    console.log('❌ Order non trouvé dans l\'historique')
  }

} catch (error) {
  console.error('❌ Erreur:', error.message)
}