import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, newUserId } = await req.json()

    if (!orderId) {
      throw new Error('orderId is required')
    }

    console.log('🔍 [CHECK-ACTIVATION] Order ID:', orderId)

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

    console.log('✅ [CHECK-ACTIVATION] Found:', activation.id)
    console.log('   User ID:', activation.user_id)
    console.log('   Phone:', activation.phone)
    console.log('   Status:', activation.status)
    console.log('   SMS Code:', activation.sms_code)
    console.log('   SMS Text:', activation.sms_text)

    // If newUserId provided, transfer ownership
    if (newUserId) {
      console.log('🔄 [CHECK-ACTIVATION] Transferring to user:', newUserId)
      
      const { error: updateError } = await supabaseClient
        .from('activations')
        .update({ user_id: newUserId })
        .eq('id', activation.id)

      if (updateError) {
        throw new Error(`Failed to transfer: ${updateError.message}`)
      }

      console.log('✅ [CHECK-ACTIVATION] Transferred successfully')

      // Also update transaction
      await supabaseClient
        .from('transactions')
        .update({ user_id: newUserId })
        .eq('related_activation_id', activation.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        activation: {
          id: activation.id,
          user_id: activation.user_id,
          phone: activation.phone,
          order_id: activation.order_id,
          sms_code: activation.sms_code,
          sms_text: activation.sms_text,
          status: activation.status,
          created_at: activation.created_at
        },
        transferred: !!newUserId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('❌ [CHECK-ACTIVATION] Error:', error)
    
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