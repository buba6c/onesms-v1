import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔄 [UPDATE-SMS] Function called')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId } = await req.json()

    if (!orderId) {
      throw new Error('orderId is required')
    }

    console.log('📞 [UPDATE-SMS] Processing order:', orderId)

    // Use SERVICE_ROLE_KEY to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find the activation
    const { data: activation, error: fetchError } = await supabaseClient
      .from('activations')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (fetchError || !activation) {
      throw new Error(`Activation not found: ${orderId}`)
    }

    console.log('✅ [UPDATE-SMS] Found activation:', activation.id)
    console.log('   Current status:', activation.status)
    console.log('   Current SMS:', activation.sms_code || 'None')

    // Get SMS from V1 API
    console.log('🌐 [UPDATE-SMS] Checking SMS-Activate V1 API...')
    const v1Url = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${orderId}`
    const v1Response = await fetch(v1Url)
    const v1Text = await v1Response.text()

    console.log('📥 [UPDATE-SMS] V1 Response:', v1Text)

    if (!v1Text.startsWith('STATUS_OK:')) {
      throw new Error(`No SMS found. API response: ${v1Text}`)
    }

    const smsCode = v1Text.split(':')[1]
    console.log('✅ [UPDATE-SMS] SMS Code found:', smsCode)

    // Update the activation
    const { data: updated, error: updateError } = await supabaseClient
      .from('activations')
      .update({
        sms_code: smsCode, // Store only the clean code without STATUS_OK:
        sms_text: `Votre code de validation est ${smsCode}`, // Store formatted message in French
        status: 'received', // Use 'received' instead of 'completed' for dashboard visibility
        charged: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', activation.id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update: ${updateError.message}`)
    }

    console.log('✅ [UPDATE-SMS] Successfully updated activation')

    // Update related transaction
    await supabaseClient
      .from('transactions')
      .update({ status: 'completed' })
      .eq('related_activation_id', activation.id)
      .eq('status', 'cancelled')

    return new Response(
      JSON.stringify({
        success: true,
        activation: {
          id: updated.id,
          phone: updated.phone,
          order_id: updated.order_id,
          sms_code: updated.sms_code,
          status: updated.status
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('❌ [UPDATE-SMS] Error:', error)
    
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