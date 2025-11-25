#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const SMS_ACTIVATE_API_KEY = process.env.VITE_SMS_ACTIVATE_API_KEY
const ACTIVATION_ID = '4450694850'

if (!SMS_ACTIVATE_API_KEY) {
  console.error('❌ SMS_ACTIVATE_API_KEY not found in environment')
  process.exit(1)
}

console.log('🔍 Testing SMS-Activate API for activation:', ACTIVATION_ID)
console.log('')

// Test 1: getStatusV2
console.log('📡 Test 1: getStatusV2')
try {
  const v2Url = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatusV2&id=${ACTIVATION_ID}`
  const v2Response = await fetch(v2Url)
  const v2Text = await v2Response.text()
  console.log('✅ V2 Response:', v2Text)
  
  // Try to parse as JSON
  try {
    const v2Json = JSON.parse(v2Text)
    console.log('📊 V2 JSON:', JSON.stringify(v2Json, null, 2))
  } catch (e) {
    console.log('📝 V2 is plain text, not JSON')
  }
} catch (error) {
  console.error('❌ V2 Error:', error.message)
}

console.log('')

// Test 2: getStatus (V1)
console.log('📡 Test 2: getStatus (V1)')
try {
  const v1Url = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${ACTIVATION_ID}`
  const v1Response = await fetch(v1Url)
  const v1Text = await v1Response.text()
  console.log('✅ V1 Response:', v1Text)
} catch (error) {
  console.error('❌ V1 Error:', error.message)
}

console.log('')

// Test 3: getHistory
console.log('📡 Test 3: getHistory')
try {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))
  const startTimestamp = Math.floor(oneDayAgo.getTime() / 1000)
  const endTimestamp = Math.floor(now.getTime() / 1000)
  
  const historyUrl = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getHistory&start=${startTimestamp}&end=${endTimestamp}&limit=50`
  const historyResponse = await fetch(historyUrl)
  const historyText = await historyResponse.text()
  
  console.log('✅ History Response (first 500 chars):', historyText.substring(0, 500))
  
  try {
    const historyJson = JSON.parse(historyText)
    
    // Look for our activation
    const ourActivation = historyJson.find(item => item.id.toString() === ACTIVATION_ID)
    if (ourActivation) {
      console.log('🎯 Found our activation in history:')
      console.log(JSON.stringify(ourActivation, null, 2))
    } else {
      console.log('❌ Our activation not found in history')
      console.log('📋 Available IDs:', historyJson.slice(0, 10).map(item => item.id))
    }
  } catch (e) {
    console.log('❌ History parsing error:', e.message)
  }
} catch (error) {
  console.error('❌ History Error:', error.message)
}

console.log('')

// Test 4: Check database
console.log('📡 Test 4: Check Database')
try {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )
  
  const { data: activation, error } = await supabase
    .from('activations')
    .select('*')
    .eq('order_id', ACTIVATION_ID)
    .single()
    
  if (error) {
    console.error('❌ Database error:', error.message)
  } else {
    console.log('📊 Database activation:')
    console.log('   Order ID:', activation.order_id)
    console.log('   Phone:', activation.phone)
    console.log('   Status:', activation.status)
    console.log('   SMS Code:', activation.sms_code || 'None')
    console.log('   SMS Text:', activation.sms_text || 'None')
    console.log('   Created:', activation.created_at)
    console.log('   Charged:', activation.charged)
  }
} catch (error) {
  console.error('❌ Database connection error:', error.message)
}