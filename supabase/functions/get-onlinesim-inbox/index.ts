import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONLINESIM_BASE_URL = 'https://onlinesim.io/api'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log('📥 [GET-ONLINESIM-INBOX] Function called')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

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

        // If we already have SMS stored, return it
        if (activation.sms_code) {
            return new Response(
                JSON.stringify({
                    success: true,
                    data: {
                        messages: [{
                            text: activation.sms_text || activation.sms_code,
                            code: activation.sms_code,
                            date: activation.updated_at || activation.created_at
                        }]
                    }
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Call OnlineSIM getState API
        const stateUrl = `${ONLINESIM_BASE_URL}/getState.php?apikey=${ONLINESIM_API_KEY}&tzid=${activation.order_id}`

        const response = await fetch(stateUrl)
        const responseText = await response.text()

        let data: any
        try {
            data = JSON.parse(responseText)
        } catch (e) {
            throw new Error(`Failed to parse OnlineSIM response`)
        }

        const messages: Array<{ text: string; code: string; date: string }> = []

        if (Array.isArray(data) && data.length > 0) {
            const operation = data.find((op: any) => op.tzid?.toString() === activation.order_id) || data[0]

            if (operation.msg) {
                const codeMatch = operation.msg.match(/\d{4,8}/)
                messages.push({
                    text: operation.msg,
                    code: codeMatch ? codeMatch[0] : operation.msg,
                    date: new Date().toISOString()
                })
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    messages,
                    status: messages.length > 0 ? 'received' : 'waiting'
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [GET-ONLINESIM-INBOX] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
