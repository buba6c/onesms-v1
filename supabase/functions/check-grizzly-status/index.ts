import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GRIZZLY_BASE_URL = 'https://api.grizzlysms.com/stubs/handler_api.php'

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

        // Get API Key
        let GRIZZLY_API_KEY = Deno.env.get('GRIZZLY_API_KEY')
        const { data: grizzlySetting } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', 'grizzly_api_key')
            .single()

        if (grizzlySetting?.value) GRIZZLY_API_KEY = grizzlySetting.value
        if (!GRIZZLY_API_KEY) throw new Error('Grizzly SMS API key not configured')

        const { activationId, userId } = await req.json()
        console.log('🐻 [CHECK-GRIZZLY] Checking activation:', activationId)

        // 1. Get activation
        const { data: activation, error: actError } = await supabaseClient
            .from('activations')
            .select('*')
            .eq('id', activationId)
            .single()

        if (actError || !activation) throw new Error('Activation not found')
        if (activation.provider !== 'grizzly') throw new Error('Not a Grizzly activation')

        // If already received, return cached
        if (activation.status === 'received' && activation.charged) {
            return new Response(
                JSON.stringify({
                    success: true,
                    data: { status: 'received', sms_code: activation.sms_code, sms_text: activation.sms_text, charged: true }
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Call Grizzly API - GET STATUS
        // GET /stubs/handler_api.php?api_key=...&action=getStatus&id=...
        const url = `${GRIZZLY_BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getStatus&id=${activation.order_id}`
        const response = await fetch(url)
        const text = await response.text()
        console.log('📥 [CHECK-GRIZZLY] Response:', text)

        // Handle Status
        let status = activation.status
        let smsCode = null
        let smsText = null

        if (text === 'STATUS_WAIT_CODE') {
            status = 'waiting'
        } else if (text.startsWith('STATUS_OK')) {
            // Success! Format: STATUS_OK:CODE
            status = 'received'
            smsCode = text.split(':')[1]
            smsText = `Your code is ${smsCode}` // Grizzly often just sends code
        } else if (text === 'STATUS_CANCEL') {
            status = 'cancelled'
        } else {
            // Other statuses or errors
            console.log('⚠️ [CHECK-GRIZZLY] Unknown/Error status:', text)
        }

        // 3. Update DB if changed
        if (status !== activation.status) {
            if (status === 'received' && !activation.charged) {
                // CHARGE USER (Complete transaction)
                await supabaseClient.rpc('atomic_complete_activation', {
                    p_activation_id: activationId,
                    p_sms_code: smsCode,
                    p_sms_text: smsText
                })
            } else if (status === 'cancelled') {
                // REFUND USER
                await supabaseClient.rpc('atomic_refund', {
                    p_activation_id: activationId
                })
            } else {
                // Just update status (waiting)
                await supabaseClient
                    .from('activations')
                    .update({ status: status })
                    .eq('id', activationId)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    status: status,
                    sms_code: smsCode,
                    sms_text: smsText
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [CHECK-GRIZZLY] Error:', error.message)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
