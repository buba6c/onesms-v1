import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.io/stubs/handler_api.php'

if (!SMS_ACTIVATE_API_KEY) {
  console.error('❌ [CHECK-SMS-ACTIVATE] SMS_ACTIVATE_API_KEY environment variable is missing')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ [CHECK-SMS-ACTIVATE] Missing Authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    let requestBody
    try {
      requestBody = await req.json()
    } catch (e) {
      console.error('❌ [CHECK-SMS-ACTIVATE] Invalid JSON body:', e)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { activationId } = requestBody
    if (!activationId) {
      console.error('❌ [CHECK-SMS-ACTIVATE] Missing activationId')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing activationId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔍 [CHECK-SMS-ACTIVATE] Checking activation:', activationId)

    if (!SMS_ACTIVATE_API_KEY) {
      console.error('❌ [CHECK-SMS-ACTIVATE] SMS-Activate API key not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'SMS-Activate API key not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Get activation from database
    const { data: activation, error: activationError } = await supabaseClient
      .from('activations')
      .select('*')
      .eq('id', activationId)
      .single()

    if (activationError) {
      console.error('❌ [CHECK-SMS-ACTIVATE] Database error:', activationError)
      throw new Error(`Database error: ${activationError.message}`)
    }

    if (!activation) {
      console.error('❌ [CHECK-SMS-ACTIVATE] Activation not found:', activationId)
      throw new Error(`Activation not found: ${activationId}`)
    }

    console.log('📋 [CHECK-SMS-ACTIVATE] Activation found:', {
      id: activation.id,
      order_id: activation.order_id,
      phone: activation.phone,
      status: activation.status
    })

    // 2. Check SMS-Activate API using V2 (returns full SMS text)
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatusV2&id=${activation.order_id}`
    console.log('🌐 [CHECK-SMS-ACTIVATE] API Call V2:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const responseText = await response.text()

    console.log('📥 [CHECK-SMS-ACTIVATE] API Response V2:', responseText)

    let smsCode = null
    let smsText = null
    let newStatus = activation.status

    // If STATUS_CANCEL or WRONG_ACTIVATION_ID, also try getStatus V1 as fallback
    if (responseText === 'STATUS_CANCEL' || responseText === 'WRONG_ACTIVATION_ID') {
      console.log(`🔄 [CHECK-SMS-ACTIVATE] ${responseText} - trying V1 getStatus as fallback...`)
      const v1Url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${activation.order_id}`
      console.log('🌐 [CHECK-SMS-ACTIVATE] V1 API Call:', v1Url.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))
      
      try {
        const v1Response = await fetch(v1Url)
        const v1Text = await v1Response.text()
        console.log('📥 [CHECK-SMS-ACTIVATE] V1 Response:', v1Text)
        
        // Check if V1 has different info
        if (v1Text.startsWith('STATUS_OK:')) {
          smsCode = v1Text.split(':')[1]?.trim()
          smsText = `Your verification code is: ${smsCode}`
          newStatus = 'received'
          console.log('✅ [CHECK-SMS-ACTIVATE] SMS found in V1 fallback:', smsCode)
        }
      } catch (e) {
        console.log('❌ [CHECK-SMS-ACTIVATE] V1 fallback failed:', e)
      }
    }



    // First try to parse as JSON in case it's getStatusV2 format even with STATUS_CANCEL
    let isStatusCancel = responseText === 'STATUS_CANCEL' || responseText.startsWith('STATUS_CANCEL')
    let isWrongActivationId = responseText === 'WRONG_ACTIVATION_ID'
    
    if (!isStatusCancel && !isWrongActivationId) {
      try {
        const jsonResponse = JSON.parse(responseText)
        console.log('📊 [CHECK-SMS-ACTIVATE] V2 JSON Response:', JSON.stringify(jsonResponse).substring(0, 200))
        
        // Check if we have SMS data in V2 format
        if (jsonResponse.sms && jsonResponse.sms.code) {
          smsCode = jsonResponse.sms.code
          smsText = jsonResponse.sms.text || `Your verification code is: ${smsCode}`
          newStatus = 'received'
          console.log('✅ [CHECK-SMS-ACTIVATE] SMS found in V2 response:', smsCode)
        }
      } catch (e) {
        // If JSON parsing fails, treat as plain text response
        if (responseText.startsWith('STATUS_OK:')) {
          smsCode = responseText.split(':')[1]?.trim()
          smsText = `Your verification code is: ${smsCode}`
          newStatus = 'received'
          console.log('✅ [CHECK-SMS-ACTIVATE] SMS found in V1 format:', smsCode)
        }
      }
    }

    // Check for STATUS_CANCEL OR WRONG_ACTIVATION_ID - both need recovery attempt (but only if no SMS found yet)
    if ((isStatusCancel || isWrongActivationId) && !smsCode) {
      console.log('🔄 [CHECK-SMS-ACTIVATE] Activation cancelled/expired - trying recovery...')
      console.log('🔄 [CHECK-SMS-ACTIVATE] Response was:', responseText)

      // STEP 1: Try getActiveActivations (for recently cancelled but still in system)
      const activeUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getActiveActivations`
      console.log('🌐 [CHECK-SMS-ACTIVATE] Active API Call:', activeUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))
      
      const activeResponse = await fetch(activeUrl)
      const activeText = await activeResponse.text()
      console.log('📥 [CHECK-SMS-ACTIVATE] Active Raw Response:', activeText.substring(0, 500))
      
      let activeData
      try {
        activeData = JSON.parse(activeText)
      } catch (e) {
        console.error('❌ [CHECK-SMS-ACTIVATE] Failed to parse active JSON')
        activeData = { status: 'error', activeActivations: [] }
      }
      
      if (activeData.status === 'success' && Array.isArray(activeData.activeActivations)) {
        console.log('📊 [CHECK-SMS-ACTIVATE] Found', activeData.activeActivations.length, 'active activations')
        
        const activeItem = activeData.activeActivations.find((item: any) => item.activationId.toString() === activation.order_id)
        
        if (activeItem && activeItem.smsCode && Array.isArray(activeItem.smsCode) && activeItem.smsCode.length > 0) {
          smsCode = activeItem.smsCode[0]
          smsText = activeItem.smsText || `Your verification code is: ${smsCode}`
          newStatus = 'received'
          console.log('✅ [CHECK-SMS-ACTIVATE] SMS found in active activations:', smsCode)
        } else if (activeItem) {
          console.log('⏳ [CHECK-SMS-ACTIVATE] Found in active but no SMS yet')
        } else {
          console.log('❌ [CHECK-SMS-ACTIVATE] Not in active activations. Trying history...')
        }
      }

      // STEP 2: If not found in active, try getHistory with proper date format
      if (!smsCode) {
        // Calculate date range for history API (SMS-Activate requires Unix timestamps)
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
        
        // Convert to Unix timestamps (seconds since epoch) as required by SMS-Activate API
        const startTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000)
        const endTimestamp = Math.floor(now.getTime() / 1000)
        
        const historyUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getHistory&start=${startTimestamp}&end=${endTimestamp}&limit=100`
        console.log('🌐 [CHECK-SMS-ACTIVATE] History API Call with dates:', historyUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))
      
        const historyResponse = await fetch(historyUrl)
        const historyText = await historyResponse.text()
        
        console.log('📥 [CHECK-SMS-ACTIVATE] History Raw Response:', historyText.substring(0, 500))
        
        let historyData
        try {
          historyData = JSON.parse(historyText)
        } catch (e) {
          console.error('❌ [CHECK-SMS-ACTIVATE] Failed to parse history JSON:', e)
          newStatus = 'cancelled'
          historyData = []
        }
        
        console.log('📥 [CHECK-SMS-ACTIVATE] History Parsed:', JSON.stringify(historyData).substring(0, 500))
        console.log('📥 [CHECK-SMS-ACTIVATE] Is Array?', Array.isArray(historyData), 'Type:', typeof historyData)
        console.log('🔍 [CHECK-SMS-ACTIVATE] Looking for order_id:', activation.order_id)

        if (Array.isArray(historyData)) {
          console.log('📊 [CHECK-SMS-ACTIVATE] History items count:', historyData.length)
          
          // Find ALL entries for this order_id (there might be multiple)
          const allHistoryItems = historyData.filter((item: any) => item.id.toString() === activation.order_id)
          
          if (allHistoryItems.length > 0) {
            console.log('✅ [CHECK-SMS-ACTIVATE] Found', allHistoryItems.length, 'entries in history for order:', activation.order_id)
            
            // Log all entries to see different states
            allHistoryItems.forEach((item: any, index: number) => {
              console.log(`📋 [CHECK-SMS-ACTIVATE] Entry ${index + 1}:`, JSON.stringify(item))
            })
            
            // Look for an entry with SMS (prioritize entries with sms over null)
            const itemWithSms = allHistoryItems.find((item: any) => item.sms !== null && item.sms !== undefined)
            const historyItem = itemWithSms || allHistoryItems[0] // Fallback to first entry
            
            console.log('🎯 [CHECK-SMS-ACTIVATE] Using entry:', JSON.stringify(historyItem))
            
            if (historyItem.sms && Array.isArray(historyItem.sms) && historyItem.sms.length > 0) {
              smsText = historyItem.sms[0]
              const codeMatch = smsText.match(/\b\d{4,8}\b/)
              if (codeMatch) {
                smsCode = codeMatch[0]
              }
              newStatus = 'received'
              console.log('✅ [CHECK-SMS-ACTIVATE] SMS recovered from history:', smsCode)
            } else if (historyItem.sms && typeof historyItem.sms === 'string') {
              // Sometimes sms is a string instead of array
              smsText = historyItem.sms
              const codeMatch = smsText.match(/\b\d{4,8}\b/)
              if (codeMatch) {
                smsCode = codeMatch[0]
              }
              newStatus = 'received'
              console.log('✅ [CHECK-SMS-ACTIVATE] SMS recovered from history (string):', smsCode)
            } else {
              console.log('⚠️ [CHECK-SMS-ACTIVATE] Found in history but no SMS content')
              console.log('🔍 [CHECK-SMS-ACTIVATE] Analysis: status="8" means activation was cancelled/reported as already used')
              console.log('💡 [CHECK-SMS-ACTIVATE] Possible reasons: Number already used, service rejected number, or cancelled before SMS sent')
            }
          } else {
            console.log('❌ [CHECK-SMS-ACTIVATE] Order not found in history')
            if (historyData.length > 0) {
              console.log('Available IDs:', historyData.map((i: any) => i.id).slice(0, 10).join(', '))
            }
          }
        }
      }

      // STEP 3: Update activation based on what we found
      if (smsCode && smsText) {
        // SMS FOUND! Charge user
        await supabaseClient
          .from('activations')
          .update({
            status: 'received',
            sms_code: smsCode,
            sms_text: smsText
          })
          .eq('id', activationId)

        const { data: transaction } = await supabaseClient
          .from('transactions')
          .select('*')
          .eq('related_activation_id', activationId)
          .eq('status', 'pending')
          .single()

        if (transaction) {
          await supabaseClient
            .from('transactions')
            .update({ status: 'completed' })
            .eq('id', transaction.id)

          const { data: user } = await supabaseClient
            .from('users')
            .select('balance, frozen_balance')
            .eq('id', activation.user_id)
            .single()

          if (user) {
            await supabaseClient
              .from('users')
              .update({
                balance: user.balance - activation.price,
                frozen_balance: Math.max(0, user.frozen_balance - activation.price)
              })
              .eq('id', activation.user_id)

            console.log('💰 [CHECK-SMS-ACTIVATE] User charged:', activation.price)
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              status: 'received',
              sms_code: smsCode,
              sms_text: smsText,
              charged: true
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      } else {
        // NO SMS FOUND - Refund user
        await supabaseClient
          .from('activations')
          .update({ status: 'cancelled' })
          .eq('id', activationId)

        const { data: transaction } = await supabaseClient
          .from('transactions')
          .select('*')
          .eq('related_activation_id', activationId)
          .eq('status', 'pending')
          .single()

        if (transaction) {
          await supabaseClient
            .from('transactions')
            .update({ status: 'refunded' })
            .eq('id', transaction.id)

          const { data: user } = await supabaseClient
            .from('users')
            .select('frozen_balance')
            .eq('id', activation.user_id)
            .single()

          if (user) {
            await supabaseClient
              .from('users')
              .update({ frozen_balance: Math.max(0, user.frozen_balance - activation.price) })
              .eq('id', activation.user_id)

            console.log('💰 [CHECK-SMS-ACTIVATE] Refunded:', activation.price)
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              status: 'cancelled',
              sms_code: null,
              sms_text: null,
              charged: false
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }
    }

    // Try parsing as JSON (V2 format for active activations)
    try {
      const jsonResponse = JSON.parse(responseText)
      
      if (jsonResponse.sms && (jsonResponse.sms.code || jsonResponse.sms.text)) {
        // SMS received in V2 format
        smsCode = jsonResponse.sms.code
        smsText = jsonResponse.sms.text || `Your verification code is: ${smsCode}`
        newStatus = 'received'

        console.log('✅ [CHECK-SMS-ACTIVATE] SMS received (V2):', {
          code: smsCode,
          text: smsText,
          dateTime: jsonResponse.sms.dateTime
        })
      } else if (jsonResponse.call && jsonResponse.call.code) {
        // Voice call received
        smsCode = jsonResponse.call.code
        smsText = jsonResponse.call.text || `Your verification code is: ${smsCode}`
        newStatus = 'received'

        console.log('✅ [CHECK-SMS-ACTIVATE] Call received (V2):', {
          code: smsCode,
          text: smsText,
          from: jsonResponse.call.from
        })
      }
    } catch (jsonError) {
      // Fallback to V1 format (plain text)
      if (responseText.startsWith('STATUS_OK:')) {
        // SMS received: STATUS_OK:code
        const code = responseText.split(':')[1]
        smsCode = code
        smsText = `Votre code de validation est ${code}`
        newStatus = 'received'

        console.log('✅ [CHECK-SMS-ACTIVATE] SMS received (V1 fallback):', code)
      }
    }

    // Process SMS if received
    if (smsCode && smsText) {

      // Update activation
      await supabaseClient
        .from('activations')
        .update({
          status: 'received',
          sms_code: smsCode,
          sms_text: smsText
        })
        .eq('id', activationId)

      // Charge user (complete transaction)
      const { data: transaction } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('related_activation_id', activationId)
        .eq('status', 'pending')
        .single()

      if (transaction) {
        // Mark transaction as completed
        await supabaseClient
          .from('transactions')
          .update({ status: 'completed' })
          .eq('id', transaction.id)

        // Update user balance (deduct from balance, reduce frozen)
        const { data: user } = await supabaseClient
          .from('users')
          .select('balance, frozen_balance')
          .eq('id', activation.user_id)
          .single()

        if (user) {
          const newBalance = user.balance - activation.price
          const newFrozenBalance = Math.max(0, user.frozen_balance - activation.price)

          await supabaseClient
            .from('users')
            .update({
              balance: newBalance,
              frozen_balance: newFrozenBalance
            })
            .eq('id', activation.user_id)

          console.log('💰 [CHECK-SMS-ACTIVATE] User charged:', {
            price: activation.price,
            newBalance,
            newFrozenBalance
          })
        }
      }

      // Mark as complete on SMS-Activate
      await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activation.order_id}&status=6`)

    } else {
      // No SMS yet - check if still waiting or cancelled
      
      // Check for STATUS_CANCEL (plain text from V1)
      if (responseText === 'STATUS_CANCEL' || responseText.startsWith('STATUS_CANCEL')) {
        console.log('❌ [CHECK-SMS-ACTIVATE] Activation cancelled')

        await supabaseClient
          .from('activations')
          .update({ status: 'cancelled' })
          .eq('id', activationId)

        // Refund user
        const { data: transaction } = await supabaseClient
          .from('transactions')
          .select('*')
          .eq('related_activation_id', activationId)
          .eq('status', 'pending')
          .single()

        if (transaction) {
          await supabaseClient
            .from('transactions')
            .update({ status: 'refunded' })
            .eq('id', transaction.id)

          const { data: user } = await supabaseClient
            .from('users')
            .select('frozen_balance')
            .eq('id', activation.user_id)
            .single()

          if (user) {
            const newFrozenBalance = Math.max(0, user.frozen_balance - activation.price)
            await supabaseClient
              .from('users')
              .update({ frozen_balance: newFrozenBalance })
              .eq('id', activation.user_id)
          }
        }

        newStatus = 'cancelled'
      } else {
        // Still waiting for SMS
        console.log('⏳ [CHECK-SMS-ACTIVATE] Still waiting...')

        // Check if expired
        const expiresAt = new Date(activation.expires_at)
        if (expiresAt < new Date()) {
          console.log('⏰ [CHECK-SMS-ACTIVATE] Activation expired, cancelling...')

          // Cancel on SMS-Activate
          await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activation.order_id}&status=8`)

          // Update activation status
          await supabaseClient
            .from('activations')
            .update({ status: 'timeout' })
            .eq('id', activationId)

          // Refund user
          const { data: transaction } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('related_activation_id', activationId)
            .eq('status', 'pending')
            .single()

          if (transaction) {
            await supabaseClient
              .from('transactions')
              .update({ status: 'refunded' })
              .eq('id', transaction.id)

            const { data: user } = await supabaseClient
              .from('users')
              .select('frozen_balance')
              .eq('id', activation.user_id)
              .single()

            if (user) {
              const newFrozenBalance = Math.max(0, user.frozen_balance - activation.price)
              await supabaseClient
                .from('users')
                .update({ frozen_balance: newFrozenBalance })
                .eq('id', activation.user_id)
            }
          }

          newStatus = 'timeout'
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status: newStatus,
          sms_code: smsCode,
          sms_text: smsText
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [CHECK-SMS-ACTIVATE] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
