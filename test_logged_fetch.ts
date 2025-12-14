#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Test isolé de loggedFetch()
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Copie simplifiée de loggedFetch pour test
async function testLoggedFetch(url: string) {
  console.log('🧪 Testing loggedFetch simulation...\n')
  console.log('📡 URL:', url.replace(/api_key=[^&]+/, 'api_key=HIDDEN'))
  
  const startTime = Date.now()
  
  try {
    // 1. Fetch l'API
    const response = await fetch(url)
    const responseText = await response.text()
    const responseTimeMs = Date.now() - startTime
    
    console.log(`\n✅ Fetch SUCCESS (${responseTimeMs}ms)`)
    console.log(`   Status: ${response.status}`)
    console.log(`   Body: ${responseText}`)
    
    // 2. Log dans logs_provider
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    console.log(`\n🔐 Supabase Client:`)
    console.log(`   URL: ${Deno.env.get('SUPABASE_URL')}`)
    console.log(`   KEY: ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.substring(0, 20)}...`)
    
    console.log(`\n💾 Inserting log into logs_provider...`)
    
    const { data, error } = await supabase.from('logs_provider').insert({
      provider: 'sms-activate',
      action: 'TEST_loggedFetch',
      request_url: url.replace(/api_key=[^&]+/, 'api_key=HIDDEN'),
      request_params: { test: 'true' },
      response_status: response.status,
      response_body: responseText,
      response_time_ms: responseTimeMs,
      user_id: null,
      activation_id: null,
      rental_id: null,
      error_message: null,
      created_at: new Date().toISOString()
    }).select()
    
    if (error) {
      console.log(`\n❌ INSERT FAILED:`, error)
    } else {
      console.log(`\n✅ INSERT SUCCESS:`, data)
    }
    
  } catch (error: any) {
    console.log(`\n❌ ERROR:`, error.message)
  }
}

// Test avec une vraie URL SMS-Activate
const API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const url = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${API_KEY}&action=getBalance`

await testLoggedFetch(url)
