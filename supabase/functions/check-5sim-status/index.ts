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

        const { activationId, userId } = await req.json()

        if (!activationId) {
            throw new Error('Missing activationId')
        }

        console.log('🔍 [CHECK-5SIM] Checking activation:', activationId)

        // 1. Get activation from database
        const { data: activation, error: activationError } = await supabaseClient
            .from('activations')
            .select('*')
            .eq('id', activationId)
            .single()

        if (activationError || !activation) {
            throw new Error(`Activation not found: ${activationId}`)
        }

        // Verify this is a 5sim activation
        if (activation.provider !== '5sim') {
            throw new Error('This activation is not from 5sim')
        }

        console.log('📋 [CHECK-5SIM] Activation found:', {
            id: activation.id,
            order_id: activation.order_id,
            phone: activation.phone,
            status: activation.status
        })

        // If already received and charged, return cached
        if (activation.charged && activation.status === 'received') {
            console.log('ℹ️ [CHECK-5SIM] Already charged, returning cached')
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

        // 2. Check 5sim API for order status
        // 5sim endpoint: GET /user/check/{id}
        const checkUrl = `https://5sim.net/v1/user/check/${activation.order_id}`
        console.log('🌐 [CHECK-5SIM] API Call:', checkUrl)

        const response = await fetch(checkUrl, {
            headers: {
                'Authorization': `Bearer ${FIVESIM_API_KEY}`,
                'Accept': 'application/json'
            }
        })

        const data = await response.json()
        console.log('📥 [CHECK-5SIM] Response:', JSON.stringify(data).substring(0, 500))

        let smsCode = null
        let smsText = null
        let newStatus = activation.status

        // 5sim status values: PENDING, RECEIVED, CANCELED, TIMEOUT, FINISHED, BANNED
        if (data.status === 'RECEIVED' && data.sms && data.sms.length > 0) {
            // SMS received!
            const latestSms = data.sms[data.sms.length - 1]
            smsText = latestSms.text || latestSms.code
            smsCode = latestSms.code || smsText.match(/\b\d{4,8}\b/)?.[0]
            newStatus = 'received'

            console.log('✅ [CHECK-5SIM] SMS received:', smsCode)

            // Update activation with SMS
            await supabaseClient
                .from('activations')
                .update({
                    status: 'received',
                    sms_code: smsCode,
                    sms_text: smsText,
                    updated_at: new Date().toISOString()
                })
                .eq('id', activationId)

            // Commit charge using atomic_commit
            const { data: transaction } = await supabaseClient
                .from('transactions')
                .select('id')
                .eq('related_activation_id', activationId)
                .eq('status', 'pending')
                .single()

            // CRITICAL: If no freeze remains (refunded or never frozen), re-freeze before commit
            // This prevents a free service if SMS arrives late after refund
            if (!activation.charged && (activation.frozen_amount ?? 0) <= 0) {
                console.log('🧊 [CHECK-5SIM] Late SMS - re-freezing before commit...')
                const { data: freezeResult, error: freezeError } = await supabaseClient.rpc('atomic_freeze', {
                    p_user_id: activation.user_id,
                    p_amount: activation.price,
                    p_transaction_id: transaction?.id ?? null,
                    p_activation_id: activationId,
                    p_rental_id: null,
                    p_reason: '5sim late SMS - freeze before commit'
                })

                if (freezeError) {
                    console.error('❌ [CHECK-5SIM] atomic_freeze failed:', freezeError)
                    throw new Error(`atomic_freeze failed: ${freezeError.message}`)
                }

                console.log('🧊 [CHECK-5SIM] Funds refrozen:', freezeResult)
                // Update local value for commit
                activation.frozen_amount = activation.price
            }

            const { data: commitResult, error: commitError } = await supabaseClient.rpc('atomic_commit', {
                p_user_id: activation.user_id,
                p_activation_id: activationId,
                p_rental_id: null,
                p_transaction_id: transaction?.id ?? null,
                p_reason: '5sim SMS received - auto charge'
            })

            if (commitError) {
                console.error('❌ [CHECK-5SIM] atomic_commit failed:', commitError)
            } else {
                console.log('✅ [CHECK-5SIM] atomic_commit success:', commitResult)
            }

            // Mark as finished on 5sim (best-effort)
            await fetch(`https://5sim.net/v1/user/finish/${activation.order_id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${FIVESIM_API_KEY}` }
            })

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

        } else if (data.status === 'CANCELED' || data.status === 'BANNED') {
            console.log('❌ [CHECK-5SIM] Activation cancelled/banned')
            newStatus = 'cancelled'

            await supabaseClient
                .from('activations')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', activationId)

            // Refund via atomic_refund
            const { data: refundResult, error: refundError } = await supabaseClient.rpc('atomic_refund', {
                p_user_id: activation.user_id,
                p_activation_id: activationId,
                p_rental_id: null,
                p_transaction_id: null,
                p_reason: '5sim cancelled/banned'
            })

            if (refundError) {
                console.error('❌ [CHECK-5SIM] Refund error:', refundError)
            } else {
                console.log('✅ [CHECK-5SIM] Refund success:', refundResult)
            }

        } else if (data.status === 'TIMEOUT') {
            console.log('⏰ [CHECK-5SIM] Activation timeout')
            newStatus = 'timeout'

            await supabaseClient
                .from('activations')
                .update({ status: 'timeout', updated_at: new Date().toISOString() })
                .eq('id', activationId)

            // Refund via atomic_refund
            const { data: refundResult, error: refundError } = await supabaseClient.rpc('atomic_refund', {
                p_user_id: activation.user_id,
                p_activation_id: activationId,
                p_rental_id: null,
                p_transaction_id: null,
                p_reason: '5sim timeout'
            })

            if (refundError) {
                console.error('❌ [CHECK-5SIM] Refund error:', refundError)
            } else {
                console.log('✅ [CHECK-5SIM] Refund success:', refundResult)
            }

        } else {
            // Still pending
            console.log('⏳ [CHECK-5SIM] Still waiting, status:', data.status)

            // Check if expired locally
            const expiresAt = new Date(activation.expires_at)
            if (expiresAt < new Date()) {
                console.log('⏰ [CHECK-5SIM] Locally expired, cancelling on 5sim...')

                // Cancel on 5sim
                await fetch(`https://5sim.net/v1/user/cancel/${activation.order_id}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${FIVESIM_API_KEY}` }
                })

                newStatus = 'timeout'

                await supabaseClient
                    .from('activations')
                    .update({ status: 'timeout', updated_at: new Date().toISOString() })
                    .eq('id', activationId)

                // Refund
                await supabaseClient.rpc('atomic_refund', {
                    p_user_id: activation.user_id,
                    p_activation_id: activationId,
                    p_rental_id: null,
                    p_transaction_id: null,
                    p_reason: '5sim local timeout'
                })
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    status: newStatus,
                    sms_code: smsCode,
                    sms_text: smsText,
                    charged: newStatus === 'received'
                }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [CHECK-5SIM] Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
