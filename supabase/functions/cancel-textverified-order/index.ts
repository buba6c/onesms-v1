// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

        // 1. Get Credentials
        let API_KEY = Deno.env.get('TEXTVERIFIED_API_KEY')
        let API_USERNAME = Deno.env.get('TEXTVERIFIED_API_USERNAME')

        const { data: keyData } = await supabaseClient.from('system_settings').select('value').eq('key', 'textverified_api_key').single()
        if (keyData?.value) API_KEY = keyData.value

        const { data: userData } = await supabaseClient.from('system_settings').select('value').eq('key', 'textverified_api_username').single()
        if (userData?.value) API_USERNAME = userData.value

        if (!API_KEY || !API_USERNAME) throw new Error('TextVerified credentials not configured')

        const body = await req.json()
        const { orderId, activationId } = body

        console.log('💎 [CANCEL-TEXTVERIFIED] Starting cancellation:', { orderId, activationId })

        // 2. Find activation
        let activation = null
        if (activationId) {
            const { data } = await supabaseClient.from('activations').select('*').eq('id', activationId).single()
            if (data) activation = data
        }

        if (!activation && orderId) {
            const { data } = await supabaseClient.from('activations').select('*').eq('order_id', orderId.toString()).eq('provider', 'textverified').single()
            if (data) activation = data
        }

        if (!activation) throw new Error('Activation not found')

        // 3. Status Check & Lock
        if (!['pending', 'waiting', 'active'].includes(activation.status)) {
            return new Response(JSON.stringify({ success: true, message: 'Already processed', alreadyProcessed: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { data: lockedActivation, error: lockError } = await supabaseClient
            .from('activations')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
            .eq('id', activation.id)
            .in('status', ['pending', 'waiting', 'active'])
            .select()
            .single()

        if (lockError || !lockedActivation) {
            return new Response(JSON.stringify({ success: true, message: 'Already processed', alreadyProcessed: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 4. Authenticate (V2 Headers-based)
        console.log('🔐 [CANCEL-TEXTVERIFIED] Authenticating...')
        const authRes = await fetch(`https://www.textverified.com/api/pub/v2/auth`, {
            method: 'POST',
            headers: {
                'Content-Length': '0',
                'X-API-KEY': API_KEY,
                'X-API-USERNAME': API_USERNAME
            }
        })

        if (!authRes.ok) {
            const errText = await authRes.text()
            throw new Error(`Auth failed (${authRes.status}): ${errText}`)
        }

        const authData = await authRes.json()
        const token = authData.token || authData.bearer_token // 'token' in V2

        if (!token) throw new Error('Failed to obtain bearer token')

        // 5. Cancel API Call
        // POST /api/pub/v2/verifications/{id}/cancel
        console.log(`🚫 [CANCEL-TEXTVERIFIED] Cancelling verification ${activation.order_id}...`)
        const cancelRes = await fetch(`https://www.textverified.com/api/pub/v2/verifications/${activation.order_id}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Length': '0'
            }
        })

        if (!cancelRes.ok) {
            const errText = await cancelRes.text()
            console.warn('⚠️ [CANCEL-TEXTVERIFIED] API warning:', errText, cancelRes.status)
            // We proceed to refund even if API fails (could be already cancelled or expired)
        } else {
            console.log('✅ [CANCEL-TEXTVERIFIED] Cancellation successful on provider side.')
        }

        // 6. Atomic Refund
        const { data: refundResult, error: refundError } = await supabaseClient.rpc('atomic_refund', {
            p_user_id: activation.user_id,
            p_activation_id: activation.id,
            p_reason: 'Cancelled by user (TextVerified)'
        })

        if (refundError) {
            console.error('⚠️ [CANCEL-TEXTVERIFIED] atomic_refund failed:', refundError)
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
        console.error('❌ [CANCEL-TEXTVERIFIED] Error:', error)
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
