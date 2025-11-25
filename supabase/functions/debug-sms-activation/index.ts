import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔍 [DEBUG-SMS] Function called')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone } = await req.json()

    if (!phone) {
      throw new Error('phone is required')
    }

    console.log('📞 [DEBUG-SMS] Searching for phone:', phone)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find the activation
    const { data: activations, error: fetchError } = await supabaseClient
      .from('activations')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError || !activations || activations.length === 0) {
      throw new Error(`Activation not found for phone: ${phone}`)
    }

    const activation = activations[0]

    console.log('✅ [DEBUG-SMS] Found activation:', activation.id)
    console.log('   Order ID:', activation.order_id)
    console.log('   Status:', activation.status)
    console.log('   SMS Code:', activation.sms_code)
    console.log('   SMS Text:', activation.sms_text)

    // Test API SMS-Activate
    const orderId = activation.order_id
    let apiResults = {
      v2: null,
      v1: null,
      history: null
    }

    // V2 API
    console.log('🌐 [DEBUG-SMS] Testing V2 API...')
    try {
      const v2Url = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${orderId}`
      const v2Response = await fetch(v2Url)
      const v2Text = await v2Response.text()
      console.log('   V2 Response:', v2Text)
      
      try {
        apiResults.v2 = JSON.parse(v2Text)
      } catch {
        apiResults.v2 = { raw: v2Text }
      }
    } catch (error) {
      console.error('   V2 Error:', error.message)
      apiResults.v2 = { error: error.message }
    }

    // V1 API
    console.log('🌐 [DEBUG-SMS] Testing V1 API...')
    try {
      const v1Url = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${orderId}`
      const v1Response = await fetch(v1Url)
      const v1Text = await v1Response.text()
      console.log('   V1 Response:', v1Text)
      
      apiResults.v1 = { raw: v1Text }
      
      if (v1Text.startsWith('STATUS_OK:')) {
        const code = v1Text.split(':')[1]
        apiResults.v1.code = code
        apiResults.v1.found = true
      }
    } catch (error) {
      console.error('   V1 Error:', error.message)
      apiResults.v1 = { error: error.message }
    }

    // History API
    console.log('🌐 [DEBUG-SMS] Testing History API...')
    try {
      const historyUrl = `https://api.sms-activate.io/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getFullSms&id=${orderId}`
      const historyResponse = await fetch(historyUrl)
      const historyText = await historyResponse.text()
      console.log('   History Response:', historyText)
      
      try {
        apiResults.history = JSON.parse(historyText)
      } catch {
        apiResults.history = { raw: historyText }
      }
    } catch (error) {
      console.error('   History Error:', error.message)
      apiResults.history = { error: error.message }
    }

    return new Response(
      JSON.stringify({
        success: true,
        activation: {
          id: activation.id,
          user_id: activation.user_id,
          phone: activation.phone,
          order_id: activation.order_id,
          service_code: activation.service_code,
          status: activation.status,
          sms_code: activation.sms_code,
          sms_text: activation.sms_text,
          charged: activation.charged,
          created_at: activation.created_at,
          expires_at: activation.expires_at,
          price: activation.price
        },
        apiResults,
        diagnostics: {
          hasCode: !!activation.sms_code,
          hasText: !!activation.sms_text,
          isExpired: new Date(activation.expires_at) < new Date(),
          isPolling: ['pending', 'waiting'].includes(activation.status),
          timeLeft: Math.round((new Date(activation.expires_at) - new Date()) / 1000 / 60)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('❌ [DEBUG-SMS] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
