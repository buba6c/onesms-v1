import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONLINESIM_BASE_URL = 'https://onlinesim.io/api'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log('🔍 [CHECK-ONLINESIM] Function called')

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

        const { activationId } = await req.json()

        if (!activationId) {
            throw new Error('Missing activationId')
        }

        console.log('🔍 [CHECK-ONLINESIM] Checking activation:', activationId)

        // Get activation from DB
        const { data: activation, error: actError } = await supabaseClient
            .from('activations')
            .select('*')
            .eq('id', activationId)
            .single()

        if (actError || !activation) {
            throw new Error(`Activation not found: ${activationId}`)
        }

        if (activation.provider !== 'onlinesim') {
            throw new Error('This activation is not from OnlineSIM')
        }

        console.log('📋 [CHECK-ONLINESIM] Activation found:', {
            id: activation.id,
            order_id: activation.order_id,
            phone: activation.phone,
            status: activation.status
        })

        // If already completed, return cached result
        if (activation.status === 'received' && activation.charged) {
            return new Response(
                JSON.stringify({
                    success: true,
                    data: {
                        status: 'received',
                        sms_code: activation.sms_code,
                        sms_text: activation.sms_text,
                        charged: true
                    }
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // If already cancelled or timeout, return cached - don't re-process
        if (activation.status === 'cancelled' || activation.status === 'timeout') {
            console.log('ℹ️ [CHECK-ONLINESIM] Already cancelled/timeout, returning cached')
            return new Response(
                JSON.stringify({
                    success: true,
                    data: {
                        status: activation.status,
                        sms_code: null,
                        sms_text: null,
                        charged: false
                    }
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Call OnlineSIM getState API
        // Endpoint: GET /api/getState.php?apikey=XXX&tzid=ORDER_ID
        const checkUrl = `${ONLINESIM_BASE_URL}/getState.php?apikey=${ONLINESIM_API_KEY}&tzid=${activation.order_id}`

        console.log('🌐 [CHECK-ONLINESIM] API Call')

        const response = await fetch(checkUrl)
        const responseText = await response.text()

        console.log('📥 [CHECK-ONLINESIM] Raw Response:', responseText)

        let data: any
        try {
            data = JSON.parse(responseText)
        } catch (e) {
            console.error('❌ [CHECK-ONLINESIM] Failed to parse response:', responseText)
            throw new Error(`OnlineSIM parse error`)
        }

        console.log('📥 [CHECK-ONLINESIM] Parsed Response:', JSON.stringify(data).substring(0, 500))

        let smsCode = null
        let smsText = null
        let newStatus = activation.status
        let phoneNumber = activation.phone

        // OnlineSIM getState returns array of operations
        // Each operation has: tzid, response, number, msg, service, country, form, time
        // response values: TZ_NUM_PREPARE, TZ_NUM_WAIT, TZ_NUM_ANSWER (has msg), TZ_OVER_EMPTY, TZ_OVER_OK

        if (Array.isArray(data) && data.length > 0) {
            const operation = data.find((op: any) => op.tzid?.toString() === activation.order_id) || data[0]

            // Update phone number if we got it
            if (operation.number && phoneNumber === 'pending') {
                phoneNumber = operation.number
                await supabaseClient.from('activations').update({ phone: phoneNumber }).eq('id', activationId)
            }

            if (operation.response === 'TZ_NUM_ANSWER' && operation.msg) {
                // SMS received!
                smsText = operation.msg
                // Extract code from message
                const codeMatch = smsText.match(/\d{4,8}/)
                smsCode = codeMatch ? codeMatch[0] : smsText
                newStatus = 'received'

                console.log('✅ [CHECK-ONLINESIM] SMS received:', smsCode)

                // Find related transaction
                const { data: transaction } = await supabaseClient
                    .from('transactions')
                    .select('id')
                    .eq('related_activation_id', activationId)
                    .eq('status', 'pending')
                    .single()

                // Re-freeze if late SMS
                if (!activation.charged && (activation.frozen_amount ?? 0) <= 0) {
                    console.log('🧊 [CHECK-ONLINESIM] Late SMS - re-freezing before commit...')
                    await supabaseClient.rpc('atomic_freeze', {
                        p_user_id: activation.user_id,
                        p_amount: activation.price,
                        p_reason: 'Late OnlineSIM SMS - re-freeze for charge'
                    })
                }

                // Commit the charge
                const { data: commitResult, error: commitError } = await supabaseClient.rpc('atomic_commit', {
                    p_user_id: activation.user_id,
                    p_amount: activation.price,
                    p_activation_id: activationId,
                    p_rental_id: null,
                    p_transaction_id: transaction?.id ?? null,
                    p_reason: 'OnlineSIM SMS received - auto charge'
                })

                if (commitError) {
                    console.error('❌ [CHECK-ONLINESIM] atomic_commit failed:', commitError)
                } else {
                    console.log('✅ [CHECK-ONLINESIM] atomic_commit success:', commitResult)
                }

                // Update activation
                await supabaseClient
                    .from('activations')
                    .update({
                        status: 'received',
                        sms_code: smsCode,
                        sms_text: smsText,
                        charged: true,
                        frozen_amount: 0
                    })
                    .eq('id', activationId)

                return new Response(
                    JSON.stringify({
                        success: true,
                        data: {
                            status: 'received',
                            sms_code: smsCode,
                            sms_text: smsText,
                            charged: true
                        }
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )

            } else if (operation.response === 'TZ_OVER_EMPTY') {
                // Timeout without SMS from OnlineSIM
                // BUT: OnlineSIM might return this too early for some services/countries
                // Add grace period similar to ERROR_NO_OPERATIONS

                const createdAt = new Date(activation.created_at)
                const ageMs = Date.now() - createdAt.getTime()
                const GRACE_PERIOD_MS = 2 * 60 * 1000 // 2 minutes

                if (ageMs < GRACE_PERIOD_MS) {
                    // Too new - OnlineSIM might be wrong, keep pending for now
                    console.log('⚠️ [CHECK-ONLINESIM] TZ_OVER_EMPTY but activation is new (' + Math.floor(ageMs / 1000) + 's), keeping pending')
                    // Don't change status - keep pending
                } else {
                    // Old enough - this is a real timeout
                    console.log('⏰ [CHECK-ONLINESIM] TZ_OVER_EMPTY after grace period, timing out')
                    newStatus = 'timeout'

                    await supabaseClient
                        .from('activations')
                        .update({ status: 'timeout', frozen_amount: 0 })
                        .eq('id', activationId)

                    await supabaseClient.rpc('atomic_refund', {
                        p_user_id: activation.user_id,
                        p_activation_id: activationId,
                        p_rental_id: null,
                        p_transaction_id: null,
                        p_reason: 'OnlineSIM timeout (TZ_OVER_EMPTY)'
                    })
                }

            } else if (operation.response === 'TZ_NUM_WAIT' || operation.response === 'TZ_NUM_PREPARE') {
                // Still waiting
                console.log('⏳ [CHECK-ONLINESIM] Still waiting, status:', operation.response)

                // Check local timeout
                const expiresAt = new Date(activation.expires_at)
                if (new Date() > expiresAt) {
                    console.log('⏰ [CHECK-ONLINESIM] Local timeout reached')
                    newStatus = 'timeout'

                    await supabaseClient
                        .from('activations')
                        .update({ status: 'timeout', frozen_amount: 0 })
                        .eq('id', activationId)

                    await supabaseClient.rpc('atomic_refund', {
                        p_user_id: activation.user_id,
                        p_activation_id: activationId,
                        p_rental_id: null,
                        p_transaction_id: null,
                        p_reason: 'OnlineSIM local timeout'
                    })
                }
            } else {
                // Unknown response - log it but keep pending
                console.warn('⚠️ [CHECK-ONLINESIM] Unknown operation response:', operation.response, 'Full operation:', JSON.stringify(operation))
            }
        } else if (data.response === 'ERROR_NO_OPERATIONS') {
            // No operation found - might be:
            // 1. Just created (OnlineSIM takes time to create operation)
            // 2. Actually cancelled

            // Only treat as cancelled if activation is older than 2 minutes
            const createdAt = new Date(activation.created_at)
            const ageMs = Date.now() - createdAt.getTime()
            const AGE_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes

            if (ageMs < AGE_THRESHOLD_MS) {
                // Still new - OnlineSIM might not have processed yet
                console.log('⏳ [CHECK-ONLINESIM] No operation yet (new activation), waiting...', { ageMs, threshold: AGE_THRESHOLD_MS })
                // Keep pending, don't cancel
            } else {
                // Old enough - treat as cancelled
                console.log('⚠️ [CHECK-ONLINESIM] No operation found after 2 minutes, treating as cancelled')
                newStatus = 'cancelled'

                await supabaseClient
                    .from('activations')
                    .update({ status: 'cancelled', frozen_amount: 0 })
                    .eq('id', activationId)

                await supabaseClient.rpc('atomic_refund', {
                    p_user_id: activation.user_id,
                    p_activation_id: activationId,
                    p_rental_id: null,
                    p_transaction_id: null,
                    p_reason: 'OnlineSIM operation not found after 2 minutes'
                })
            }
        } else {
            // Unknown response format - log for debugging
            console.warn('⚠️ [CHECK-ONLINESIM] Unknown response format:', JSON.stringify(data))
            // Keep pending, don't cancel - wait for valid response
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    status: newStatus,
                    sms_code: smsCode,
                    sms_text: smsText,
                    charged: newStatus === 'received',
                    phone: phoneNumber
                }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [CHECK-ONLINESIM] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
