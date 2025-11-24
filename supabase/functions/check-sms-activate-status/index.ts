import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { activationId } = await req.json()

    console.log('🔍 [CHECK-SMS-ACTIVATE] Checking activation:', activationId)

    // 1. Get activation from database
    const { data: activation, error: activationError } = await supabaseClient
      .from('activations')
      .select('*')
      .eq('id', activationId)
      .single()

    if (activationError || !activation) {
      throw new Error('Activation not found')
    }

    // 2. Check SMS-Activate API using V2 (returns full SMS text)
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatusV2&id=${activation.order_id}`
    console.log('🌐 [CHECK-SMS-ACTIVATE] API Call V2:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const responseText = await response.text()

    console.log('📥 [CHECK-SMS-ACTIVATE] API Response V2:', responseText)

    let smsCode = null
    let smsText = null
    let newStatus = activation.status

    // Try parsing as JSON first (V2 format)
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
        smsText = `Your verification code is: ${code}`
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
          sms_code: code,
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
