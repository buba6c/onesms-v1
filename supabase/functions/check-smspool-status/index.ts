
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMSPoolClient } from '../_shared/smspool.ts'

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

        // 1. Get API Key
        let SMSPOOL_API_KEY = Deno.env.get('SMSPOOL_API_KEY')
        const { data: settings } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', 'smspool_api_key')
            .single()

        if (settings?.value) SMSPOOL_API_KEY = settings.value
        if (!SMSPOOL_API_KEY) throw new Error('SMSPool API key not configured')

        // 2. Auth Check
        const authHeader = req.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
        if (authError || !user) throw new Error('Unauthorized')

        // 3. Parse Request
        const { activationId } = await req.json()
        if (!activationId) throw new Error('Activation ID required')

        // 4. Get Activation Details
        const { data: activation, error: actError } = await supabaseClient
            .from('activations')
            .select('*')
            .eq('id', activationId)
            .eq('user_id', user.id)
            .single()

        if (actError || !activation) throw new Error('Activation not found')

        // If already completed/expired, just return info
        if (['completed', 'expired', 'refunded'].includes(activation.status)) {
            return new Response(
                JSON.stringify({
                    status: activation.status,
                    sms_text: activation.sms_text,
                    sms_code: activation.sms_code
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const providerOrderId = activation.order_id

        // 5. API Check
        const client = new SMSPoolClient(SMSPOOL_API_KEY)
        const check = await client.checkOrder(providerOrderId)
        // console.log('🏊 [CHECK-SMSPOOL] Result:', check)

        // Status: 1=Pending, 2=Completed, 3=Expired/Refunded/Cancelled
        // IMPORTANT: SMSPool may return string "3" instead of number 3
        const statusNum = Number(check.status)
        let newStatus = activation.status
        let smsCode = null
        let smsText = null

        if (statusNum === 2 && check.sms) {
            newStatus = 'completed'
            smsText = check.full_sms || check.sms
            smsCode = check.sms // Assuming 'sms' field contains the code or relevant part. Docs say 'sms' is code often?
            // Wait, typically 'sms' is the code in unofficial wrappers, but official might vary.
            // SMSPool documentation "sms": "123456", "full_sms": "Your code is 123456"

            // Update DB
            await supabaseClient.from('activations').update({
                status: 'completed',
                sms_code: smsCode,
                sms_text: smsText,
                cost: activation.frozen_amount // Confirm cost
            }).eq('id', activationId)

            // Release Frozen Balance (Atomic op usually handles this, but we need to finalize)
            // Ideally call 'atomic_complete_activation' RPC if exists, or manually update.
            // For now, we assume simple update.
            await supabaseClient.rpc('finalize_activation', {
                p_activation_id: activationId,
                p_cost: activation.frozen_amount
            })

        } else if (statusNum === 3) {
            // SMSPool reports status 3 (Cancelled/Refunded).
            // However, we disable immediate refund here because of potential false positives.
            // The system will auto-refund via CRON after 20 minutes expiration anyway.
            console.log('⚠️ [CHECK-SMSPOOL] Status 3 detected - Waiting for CRON expiration instead of immediate refund')
            // newStatus = 'expired'
            // await supabaseClient.rpc('atomic_refund', { p_activation_id: activationId })
        } else {
            // Unknown status, do NOT refund, just log
            console.log('🤔 [CHECK-SMSPOOL] Unknown status, not acting:', statusNum)
        }

        return new Response(
            JSON.stringify({
                status: newStatus,
                sms_code: smsCode,
                sms_text: smsText,
                time_left: check.time_left
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [CHECK-SMSPOOL] Error:', error.message)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
