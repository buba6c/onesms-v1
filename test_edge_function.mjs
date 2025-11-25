#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Use the database activation ID from our test purchase
const ACTIVATION_ID = '5b703c3d-c553-49d2-9831-8e80223b946f'

console.log('🧪 Testing Edge Function check-sms-activate-status')
console.log('📞 Database Activation ID:', ACTIVATION_ID)
console.log('')

try {
  // Use authenticated session from buy test
  const { data: authResult } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  })
  
  if (authResult.user) {
    console.log('✅ Authenticated as:', authResult.user.email)
  }
  
  // Call the Edge Function directly with the database activation ID
  console.log('🚀 Calling Edge Function...')
  const startTime = Date.now()
  
  const { data, error } = await supabase.functions.invoke('check-sms-activate-status', {
    body: {
      activationId: ACTIVATION_ID
    }
  })
  
  const duration = Date.now() - startTime
  console.log(`⏱️ Response time: ${duration}ms`)
  console.log('')
  
  if (error) {
    console.error('❌ Edge Function error:', error)
  } else {
    console.log('✅ Edge Function response:')
    console.log(JSON.stringify(data, null, 2))
  }
  
  // Check if database was updated
  console.log('')
  console.log('🔍 Checking database after Edge Function call...')
  const { data: updatedActivations } = await supabase
    .from('activations')
    .select('*')
    .eq('id', ACTIVATION_ID)
    
  if (updatedActivations && updatedActivations.length > 0) {
    const updatedActivation = updatedActivations[0]
    console.log('📊 Updated database activation:')
    console.log('   Status:', updatedActivation.status)
    console.log('   SMS Code:', updatedActivation.sms_code || 'None')
    console.log('   SMS Text:', updatedActivation.sms_text || 'None')
    console.log('   Charged:', updatedActivation.charged)
  } else {
    console.log('❌ Could not find activation in database')
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message)
  console.error('❌ Error stack:', error.stack)
}