import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🧹 [CLEANUP-EXPIRED] Function called')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use SERVICE_ROLE_KEY to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 [CLEANUP-EXPIRED] Finding expired activations...')

    // Find all expired activations with status 'pending'
    const { data: expiredActivations, error: fetchError } = await supabaseClient
      .from('activations')
      .select('*')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())

    if (fetchError) {
      throw new Error(`Failed to fetch expired activations: ${fetchError.message}`)
    }

    console.log(`📊 [CLEANUP-EXPIRED] Found ${expiredActivations.length} expired activations`)

    const cleanupResults = []

    for (const activation of expiredActivations) {
      console.log(`🔧 [CLEANUP-EXPIRED] Processing ${activation.phone} (${activation.order_id})`)
      
      try {
        // Cancel on SMS-Activate
        const cancelUrl = `https://api.sms-activate.ae/stubs/handler_api.php?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activation.order_id}&status=8`
        
        console.log(`📞 [CLEANUP-EXPIRED] Cancelling on SMS-Activate: ${activation.order_id}`)
        const cancelResponse = await fetch(cancelUrl)
        const cancelResult = await cancelResponse.text()
        console.log(`📞 [CLEANUP-EXPIRED] SMS-Activate response: ${cancelResult}`)

        // Update status in database
        const { error: updateError } = await supabaseClient
          .from('activations')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', activation.id)

        if (updateError) {
          throw new Error(`Failed to update activation ${activation.id}: ${updateError.message}`)
        }

        // Update related transaction to refunded
        const { data: transaction } = await supabaseClient
          .from('transactions')
          .select('*')
          .eq('related_activation_id', activation.id)
          .eq('status', 'pending')
          .single()

        if (transaction) {
          await supabaseClient
            .from('transactions')
            .update({ status: 'refunded' })
            .eq('id', transaction.id)
        }

        // Call atomic_refund to properly handle frozen funds
        const { data: refundResult, error: refundError } = await supabaseClient
          .rpc('atomic_refund', {
            p_user_id: activation.user_id,
            p_activation_id: activation.id,
            p_reason: 'Cleanup expired activation'
          })

        if (refundError) {
          console.error(`❌ [CLEANUP-EXPIRED] Refund error for ${activation.id}:`, refundError)
        } else {
          console.log(`✅ [CLEANUP-EXPIRED] Refunded ${refundResult?.refunded || activation.price}Ⓐ for user ${activation.user_id}`)
        }

        cleanupResults.push({
          id: activation.id,
          phone: activation.phone,
          order_id: activation.order_id,
          status: 'cleaned',
          sms_activate_response: cancelResult,
          credits_unfrozen: activation.price
        })

        console.log(`✅ [CLEANUP-EXPIRED] Successfully cleaned ${activation.phone}`)

      } catch (error) {
        console.error(`❌ [CLEANUP-EXPIRED] Failed to clean ${activation.phone}:`, error.message)
        cleanupResults.push({
          id: activation.id,
          phone: activation.phone,
          order_id: activation.order_id,
          status: 'error',
          error: error.message
        })
      }
    }

    console.log(`✅ [CLEANUP-EXPIRED] Cleanup completed. Processed ${expiredActivations.length} activations`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${expiredActivations.length} expired activations`,
        results: cleanupResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('❌ [CLEANUP-EXPIRED] Error:', error)
    
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