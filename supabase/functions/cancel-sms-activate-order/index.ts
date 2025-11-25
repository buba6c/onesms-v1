import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.io/stubs/handler_api.php'

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

    const { activationId, userId } = await req.json()

    console.log('❌ [CANCEL-SMS-ACTIVATE] Cancelling activation:', activationId)

    // 1. Get activation from database
    const { data: activation, error: activationError } = await supabaseClient
      .from('activations')
      .select('*')
      .eq('id', activationId)
      .eq('user_id', userId)
      .single()

    if (activationError || !activation) {
      throw new Error('Activation not found or unauthorized')
    }

    // 2. Check if cancellable
    if (activation.status !== 'pending') {
      throw new Error(`Cannot cancel activation with status: ${activation.status}`)
    }

    // 3. Cancel on SMS-Activate (status 8 = cancel)
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activation.order_id}&status=8`
    console.log('🌐 [CANCEL-SMS-ACTIVATE] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const responseText = await response.text()

    console.log('📥 [CANCEL-SMS-ACTIVATE] API Response:', responseText)

    if (responseText.startsWith('BAD_')) {
      throw new Error(`SMS-Activate error: ${responseText}`)
    }

    // 4. Update activation status
    await supabaseClient
      .from('activations')
      .update({ status: 'cancelled' })
      .eq('id', activationId)

    // 5. Refund user
    const { data: transaction } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('related_activation_id', activationId)
      .eq('status', 'pending')
      .single()

    if (transaction) {
      // Mark transaction as refunded
      await supabaseClient
        .from('transactions')
        .update({ status: 'refunded' })
        .eq('id', transaction.id)

      // Update frozen balance (release funds)
      const { data: user } = await supabaseClient
        .from('users')
        .select('frozen_balance')
        .eq('id', userId)
        .single()

      if (user) {
        const newFrozenBalance = Math.max(0, user.frozen_balance - activation.price)
        
        await supabaseClient
          .from('users')
          .update({ frozen_balance: newFrozenBalance })
          .eq('id', userId)

        console.log('💰 [CANCEL-SMS-ACTIVATE] Refunded:', {
          price: activation.price,
          newFrozenBalance
        })
      }
    }

    console.log('✅ [CANCEL-SMS-ACTIVATE] Successfully cancelled')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Activation cancelled and refunded'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [CANCEL-SMS-ACTIVATE] Error:', error)
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
