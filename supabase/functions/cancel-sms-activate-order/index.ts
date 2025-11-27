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
    // Use SERVICE_ROLE_KEY to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Support both orderId and activationId for compatibility
    const body = await req.json()
    const orderId = body.orderId // ID SMS-Activate (numérique)
    const activationId = body.activationId // UUID Supabase
    const userId = body.userId

    console.log('❌ [CANCEL-SMS-ACTIVATE] Cancelling:', { orderId, activationId, userId })

    // 1. Get activation from database - try multiple strategies
    let activation = null
    
    // Strategy 1: Try by order_id (SMS-Activate ID)
    if (orderId) {
      const { data, error } = await supabaseClient
        .from('activations')
        .select('*')
        .eq('order_id', orderId.toString())
        .single()
      
      if (!error && data) {
        activation = data
        console.log('✅ [CANCEL-SMS-ACTIVATE] Found by order_id:', orderId)
      }
    }
    
    // Strategy 2: Try by UUID (activationId)
    if (!activation && activationId) {
      const { data, error } = await supabaseClient
        .from('activations')
        .select('*')
        .eq('id', activationId)
        .single()
      
      if (!error && data) {
        activation = data
        console.log('✅ [CANCEL-SMS-ACTIVATE] Found by id:', activationId)
      }
    }
    
    if (!activation) {
      throw new Error(`Activation not found. orderId=${orderId}, activationId=${activationId}`)
    }

    // 2. Check if cancellable (only pending/waiting status)
    if (!['pending', 'waiting'].includes(activation.status)) {
      throw new Error(`Cannot cancel activation with status: ${activation.status}`)
    }

    // 3. Cancel on SMS-Activate (status 8 = cancel)
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activation.order_id}&status=8`
    console.log('🌐 [CANCEL-SMS-ACTIVATE] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const responseText = await response.text()

    console.log('📥 [CANCEL-SMS-ACTIVATE] API Response:', responseText)

    // ACCESS_CANCEL means success, also accept ACCESS_READY
    if (!responseText.includes('ACCESS_CANCEL') && !responseText.includes('ACCESS_READY') && responseText.startsWith('BAD_')) {
      throw new Error(`SMS-Activate error: ${responseText}`)
    }

    // 4. Update activation status
    await supabaseClient
      .from('activations')
      .update({ status: 'cancelled' })
      .eq('id', activation.id)

    // 5. Refund user - ADD BACK to balance
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('balance')
      .eq('id', activation.user_id)
      .single()

    if (user && !userError) {
      const newBalance = user.balance + activation.price
      
      await supabaseClient
        .from('users')
        .update({ balance: newBalance })
        .eq('id', activation.user_id)

      // Create refund transaction
      await supabaseClient
        .from('transactions')
        .insert({
          user_id: activation.user_id,
          type: 'refund',
          amount: activation.price,
          description: `Refund for cancelled activation ${activation.service_code}`,
          status: 'completed',
          related_activation_id: activation.id
        })

      console.log('💰 [CANCEL-SMS-ACTIVATE] Refunded:', {
        price: activation.price,
        oldBalance: user.balance,
        newBalance
      })
    }

    console.log('✅ [CANCEL-SMS-ACTIVATE] Successfully cancelled and refunded')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Activation cancelled and refunded',
        refunded: activation.price
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
