// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GRIZZLY_BASE_URL = 'https://api.grizzlysms.com/stubs/handler_api.php'

serve(async (req) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get API key
        let API_KEY = Deno.env.get('GRIZZLY_API_KEY')
        const { data: setting } = await supabaseClient.from('system_settings').select('value').eq('key', 'grizzly_api_key').single()
        if (setting?.value) API_KEY = setting.value

        if (!API_KEY) throw new Error('Grizzly API key not configured')

        const body = await req.json()
        const { orderId, activationId } = body

        console.log('🐻 [CANCEL-GRIZZLY] Starting cancellation:', { orderId, activationId })

        // 1. Find activation
        let activation = null
        if (activationId) {
            const { data } = await supabaseClient.from('activations').select('*').eq('id', activationId).single()
            if (data) activation = data
        }

        if (!activation && orderId) {
            const { data } = await supabaseClient.from('activations').select('*').eq('order_id', orderId.toString()).eq('provider', 'grizzly').single()
            if (data) activation = data
        }

        if (!activation) throw new Error('Activation not found')
        if (activation.provider !== 'grizzly') throw new Error('Not a Grizzly activation')

        // 2. Check status
        if (!['pending', 'waiting', 'active'].includes(activation.status)) {
            return new Response(
                JSON.stringify({ success: true, message: 'Already processed', alreadyProcessed: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Atomic Lock
        const { data: lockedActivation, error: lockError } = await supabaseClient
            .from('activations')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
            .eq('id', activation.id)
            .in('status', ['pending', 'waiting', 'active'])
            .select()
            .single()

        if (lockError || !lockedActivation) {
            return new Response(
                JSON.stringify({ success: true, message: 'Already processed', alreadyProcessed: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('🔒 [CANCEL-GRIZZLY] Activation locked')

        // 4. Cancel on Grizzly API (Status 8 = Cancel)
        const cancelUrl = `${GRIZZLY_BASE_URL}?api_key=${API_KEY}&action=setStatus&status=8&id=${activation.order_id}`
        const response = await fetch(cancelUrl)
        const responseText = await response.text()
        console.log('📥 [CANCEL-GRIZZLY] API Response:', responseText)

        // Expected response: "ACCESS_CANCEL"
        if (!responseText.includes('ACCESS_CANCEL') && !responseText.includes('ACCESS_CANCEL_')) { // forgiving check
            console.warn('⚠️ [CANCEL-GRIZZLY] API returned distinct response:', responseText)
            // Proceed to refund anyway to protect user balance
        }

        // 5. Atomic Refund
        const { data: refundResult, error: refundError } = await supabaseClient.rpc('atomic_refund', {
            p_user_id: activation.user_id,
            p_activation_id: activation.id,
            p_reason: 'Cancelled by user (Grizzly)'
        })

        if (refundError) {
            console.error('⚠️ [CANCEL-GRIZZLY] atomic_refund failed:', refundError)
            return new Response(JSON.stringify({ success: false, error: refundError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Activation cancelled and refunded',
                refunded: refundResult.refunded,
                newBalance: refundResult.balance_after
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [CANCEL-GRIZZLY] Error:', error)
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
