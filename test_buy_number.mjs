#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('🧪 Testing buy-sms-activate-number Edge Function')
console.log('')

const testUserId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'
const testEmail = 'test@example.com'
const testPassword = 'testpassword123'

try {
  console.log('🔑 Setting up test user authentication...')
  
  // Try to sign in first (in case user exists)
  let authResult = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })

  if (authResult.error) {
    console.log('🆕 User not found, creating new test user...')
    // If sign in fails, try to create user
    authResult = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })
  }

  if (authResult.error) {
    console.error('❌ Auth error:', authResult.error.message)
    process.exit(1)
  }

  const user = authResult.data.user
  console.log('✅ Authenticated as:', user.email, user.id)

  // Ensure user has balance
  console.log('💰 Setting up user balance...')
  const { error: balanceError } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      balance: 10.0 // Give test user $10
    })

  if (balanceError) {
    console.warn('⚠️ Could not set balance:', balanceError.message)
  } else {
    console.log('✅ User balance set to $10')
  }

  console.log('')
  console.log('🚀 Calling buy-sms-activate-number...')
  const startTime = Date.now()
  
  const { data, error } = await supabase.functions.invoke('buy-sms-activate-number', {
    body: {
      country: 'indonesia',
      operator: 'any',
      product: 'whatsapp',
      userId: user.id  // Use the authenticated user's ID
    }
  })
  
  const duration = Date.now() - startTime
  console.log(`⏱️ Response time: ${duration}ms`)
  console.log('')
  
  if (error) {
    console.error('❌ Edge Function error:', error)
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
  } else {
    console.log('✅ Edge Function response:')
    console.log(JSON.stringify(data, null, 2))
    
    if (data.success) {
      console.log('')
      console.log('🎉 Purchase successful!')
      console.log('📞 Phone:', data.data.phone)
      console.log('🆔 Activation ID:', data.data.activation_id)
      console.log('💰 Price:', data.data.price)
      
      // Check if it was inserted in database
      console.log('')
      console.log('🔍 Checking database for activation...')
      const { data: activation, error: dbError } = await supabase
        .from('activations')
        .select('*')
        .eq('phone', data.data.phone)
        .single()
        
      if (dbError) {
        console.error('❌ Database query error:', dbError.message)
      } else if (activation) {
        console.log('✅ Found in database:', activation.id)
        console.log('📊 Activation details:', {
          id: activation.id,
          phone: activation.phone,
          status: activation.status,
          created_at: activation.created_at
        })
      } else {
        console.log('❌ NOT found in database!')
      }
      
      // Check total activations after purchase
      const { data: allActivations, error: countError } = await supabase
        .from('activations')
        .select('id, phone, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
        
      if (!countError && allActivations) {
        console.log('')
        console.log(`📈 Total activations in database: ${allActivations.length > 0 ? 'Found some!' : 'Still empty!'}`)
        allActivations.slice(0, 3).forEach((act, i) => {
          console.log(`  ${i + 1}. ${act.phone} (${act.status}) - ${act.created_at}`)
        })
      }
    }
  }
} catch (error) {
  console.error('❌ Test failed:', error.message)
  console.error('❌ Error stack:', error.stack)
}