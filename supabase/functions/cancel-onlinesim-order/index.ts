import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONLINESIM_BASE_URL = 'https://onlinesim.io/api'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log('❌ [CANCEL-ONLINESIM] Function called')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get OnlineSIM API key
        let ONLINESIM_API_KEY = Deno.env.get('ONLINESIM_API_KEY')
        const { data: onlinesimSetting } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', 'onlinesim_api_key')
            .single()

        if (onlinesimSetting?.value) {
            ONLINESIM_API_KEY = onlinesimSetting.value
        }

        if (!ONLINESIM_API_KEY) {
            throw new Error('OnlineSIM API key not configured')
        }

        const { orderId, activationId, userId } = await req.json()

        console.log('❌ [CANCEL-ONLINESIM] Starting cancellation:', { orderId, activationId, userId })

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
                .eq('provider', 'onlinesim')
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
                console.log('⚠️ [CANCEL-ONLINESIM] Found legacy activation (provider NULL)')
                activation = data
            }
        }

        if (!activation) {
            throw new Error(`OnlineSIM activation not found: orderId=${orderId}, activationId=${activationId}`)
        }

        // Safety check: reject if provider is explicitly another provider
        if (activation.provider && activation.provider !== 'onlinesim') {
            throw new Error(`Activation belongs to provider '${activation.provider}', not OnlineSIM. Use correct cancel function.`)
        }

        if (!activation) {
            throw new Error(`OnlineSIM activation not found: orderId=${orderId}, activationId=${activationId}`)
        }

        console.log('📋 [CANCEL-ONLINESIM] Activation found:', {
            id: activation.id,
            order_id: activation.order_id,
            status: activation.status,
            price: activation.price
        })

        // Check if cancellable
        if (!['pending', 'waiting', 'active'].includes(activation.status)) {
            return new Response(
                JSON.stringify({ success: true, message: 'Already processed', alreadyProcessed: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Atomic lock - mark as cancelled
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
            console.log('⚠️ [CANCEL-ONLINESIM] Could not lock - already processed')
            return new Response(
                JSON.stringify({ success: true, message: 'Already processed', alreadyProcessed: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('🔒 [CANCEL-ONLINESIM] Activation locked')

        // OnlineSIM doesn't have a direct cancel endpoint for single-service activations
        // The operation will timeout automatically, but we'll try to close it
        // Using setOperationOk with "ban" parameter might help
        try {
            // Try to close the operation (this may not always work)
            const closeUrl = `${ONLINESIM_BASE_URL}/setOperationOk.php?apikey=${ONLINESIM_API_KEY}&tzid=${activation.order_id}&ban=1`
            const response = await fetch(closeUrl)
            const responseText = await response.text()
            console.log('📥 [CANCEL-ONLINESIM] Close API Response:', responseText)
        } catch (e) {
            console.log('ℹ️ [CANCEL-ONLINESIM] Could not close on OnlineSIM, continuing with local refund')
        }

        // Find related transaction
        const { data: txn } = await supabaseClient
            .from('transactions')
            .select('id, status')
            .eq('related_activation_id', activation.id)
            .single()

        // Atomic refund
        const { data: refundResult, error: refundError } = await supabaseClient.rpc('atomic_refund', {
            p_user_id: activation.user_id,
            p_activation_id: activation.id,
            p_rental_id: null,
            p_transaction_id: txn?.id || null,
            p_reason: 'Cancelled by user (OnlineSIM)'
        })

        let finalBalance = 0
        let finalFrozen = 0
        let refundedAmount = activation.frozen_amount || 0

        if (refundError) {
            console.error('⚠️ [CANCEL-ONLINESIM] atomic_refund failed:', refundError)
            return new Response(
                JSON.stringify({ success: false, error: 'Refund failed', detail: refundError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } else {
            console.log('💰 [CANCEL-ONLINESIM] atomic_refund SUCCESS:', refundResult)
            finalBalance = refundResult?.balance_after || 0
            finalFrozen = refundResult?.frozen_after || 0
            refundedAmount = refundResult?.refunded || refundedAmount
        }

        console.log('✅ [CANCEL-ONLINESIM] Completed:', {
            activation_id: activation.id,
            refunded: refundedAmount,
            newBalance: finalBalance
        })

        return new Response(
            JSON.stringify({
                success: true,
                message: 'OnlineSIM activation cancelled and refunded',
                refunded: refundedAmount,
                newBalance: finalBalance,
                newFrozenBalance: finalFrozen
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [CANCEL-ONLINESIM] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
