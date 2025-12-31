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

        // Get 5sim API key from DB or env
        let FIVESIM_API_KEY = Deno.env.get('FIVESIM_API_KEY')

        const { data: fivesimSetting } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', '5sim_api_key')
            .single()

        if (fivesimSetting?.value) {
            FIVESIM_API_KEY = fivesimSetting.value
        }

        if (!FIVESIM_API_KEY) {
            throw new Error('5sim API key not configured')
        }

        const body = await req.json()
        const { orderId, activationId, userId } = body

        console.log('❌ [CANCEL-5SIM] Starting cancellation:', { orderId, activationId, userId })

        // Find activation - tolerant lookup for legacy data
        let activation = null

        if (activationId) {
            // Primary lookup by activationId
            const { data } = await supabaseClient
                .from('activations')
                .select('*')
                .eq('id', activationId)
                .single()
            if (data) activation = data
        }

        if (!activation && orderId) {
            // Fallback: try by order_id with provider filter
            const { data } = await supabaseClient
                .from('activations')
                .select('*')
                .eq('order_id', orderId.toString())
                .eq('provider', '5sim')
                .single()
            if (data) activation = data
        }

        if (!activation && orderId) {
            // Legacy fallback: try by order_id where provider is NULL
            const { data } = await supabaseClient
                .from('activations')
                .select('*')
                .eq('order_id', orderId.toString())
                .is('provider', null)
                .single()
            if (data) {
                console.log('⚠️ [CANCEL-5SIM] Found legacy activation (provider NULL)')
                activation = data
            }
        }

        if (!activation) {
            throw new Error(`5sim activation not found: orderId=${orderId}, activationId=${activationId}`)
        }

        // Safety check: reject if provider is explicitly another provider
        if (activation.provider && activation.provider !== '5sim') {
            throw new Error(`Activation belongs to provider '${activation.provider}', not 5sim. Use correct cancel function.`)
        }

        if (!activation) {
            throw new Error(`5sim activation not found: orderId=${orderId}, activationId=${activationId}`)
        }

        console.log('📋 [CANCEL-5SIM] Activation found:', {
            id: activation.id,
            order_id: activation.order_id,
            status: activation.status,
            price: activation.price,
            frozen_amount: activation.frozen_amount
        })

        // 2. Check if cancellable
        if (!['pending', 'waiting', 'active'].includes(activation.status)) {
            // Already cancelled or completed
            return new Response(
                JSON.stringify({ success: true, message: 'Already processed', alreadyProcessed: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Atomic lock - mark as cancelled immediately to prevent race condition
        const { data: lockedActivation, error: lockError } = await supabaseClient
            .from('activations')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString()
            })
            .eq('id', activation.id)
            .in('status', ['pending', 'waiting', 'active'])
            .select()
            .single()

        if (lockError || !lockedActivation) {
            console.log('⚠️ [CANCEL-5SIM] Could not lock - already processed')
            return new Response(
                JSON.stringify({ success: true, message: 'Already processed', alreadyProcessed: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('🔒 [CANCEL-5SIM] Activation locked')

        // 4. Cancel on 5sim API
        // 5sim endpoint: GET /user/cancel/{id}
        const cancelUrl = `https://5sim.net/v1/user/cancel/${activation.order_id}`
        console.log('🌐 [CANCEL-5SIM] Calling 5sim cancel API:', cancelUrl)

        const response = await fetch(cancelUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${FIVESIM_API_KEY}`,
                'Accept': 'application/json'
            }
        })

        const responseData = await response.json()
        console.log('📥 [CANCEL-5SIM] API Response:', JSON.stringify(responseData))

        // 5sim returns the order with updated status on success
        // If error, it returns { error: "..." }
        if (responseData.error) {
            console.warn('⚠️ [CANCEL-5SIM] 5sim API warning:', responseData.error)
            // Continue with refund anyway - the number might already be cancelled on their side
        }

        // 5. Find related transaction
        const { data: txn } = await supabaseClient
            .from('transactions')
            .select('id, status')
            .eq('related_activation_id', activation.id)
            .single()

        // 6. ATOMIC REFUND via RPC
        const { data: refundResult, error: refundError } = await supabaseClient.rpc('atomic_refund', {
            p_user_id: activation.user_id,
            p_activation_id: activation.id,
            p_rental_id: null,
            p_transaction_id: txn?.id || null,
            p_reason: 'Cancelled by user (5sim)'
        })

        let finalBalance = 0
        let finalFrozen = 0
        let refundedAmount = activation.frozen_amount || 0

        if (refundError) {
            console.error('⚠️ [CANCEL-5SIM] atomic_refund failed:', refundError)
            return new Response(
                JSON.stringify({ success: false, error: 'Refund failed', detail: refundError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } else {
            console.log('💰 [CANCEL-5SIM] atomic_refund SUCCESS:', refundResult)
            finalBalance = refundResult?.balance_after || 0
            finalFrozen = refundResult?.frozen_after || 0
            refundedAmount = refundResult?.refunded || refundedAmount
        }

        console.log('✅ [CANCEL-5SIM] Completed:', {
            activation_id: activation.id,
            refunded: refundedAmount,
            newBalance: finalBalance,
            newFrozen: finalFrozen
        })

        return new Response(
            JSON.stringify({
                success: true,
                message: '5sim activation cancelled and refunded',
                refunded: refundedAmount,
                newBalance: finalBalance,
                newFrozenBalance: finalFrozen
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error: any) {
        console.error('❌ [CANCEL-5SIM] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
