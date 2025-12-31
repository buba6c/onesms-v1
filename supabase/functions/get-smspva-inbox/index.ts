import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMSPVA_BASE_URL = 'https://smspva.com/priemnik.php'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Service code mapping
const SERVICE_CODE_MAP: Record<string, string> = {
    'google': 'opt1', 'whatsapp': 'opt4', 'telegram': 'opt29',
    'facebook': 'opt2', 'instagram': 'opt16', 'tiktok': 'opt20',
    'wa': 'opt4', 'tg': 'opt29', 'fb': 'opt2', 'ig': 'opt16', 'tk': 'opt20',
}

// Country code mapping
const COUNTRY_CODE_MAP: Record<string, string> = {
    'russia': 'RU', 'ukraine': 'UA', 'kazakhstan': 'KZ', 'usa': 'US',
    'england': 'UK', 'uk': 'UK', 'india': 'IN', 'indonesia': 'ID',
}

function mapServiceCode(code: string): string {
    return SERVICE_CODE_MAP[code.toLowerCase()] || `opt${code.toLowerCase()}`
}

function mapCountryCode(country: string): string {
    return COUNTRY_CODE_MAP[country.toLowerCase()] || country.toUpperCase()
}

serve(async (req) => {
    console.log('📥 [GET-SMSPVA-INBOX] Function called')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get SMSPVA API key
        let SMSPVA_API_KEY = Deno.env.get('SMSPVA_API_KEY')
        const { data: smspvaSetting } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', 'smspva_api_key')
            .single()

        if (smspvaSetting?.value) {
            SMSPVA_API_KEY = smspvaSetting.value
        }

        if (!SMSPVA_API_KEY) {
            throw new Error('SMSPVA API key not configured')
        }

        const { activationId } = await req.json()

        if (!activationId) {
            throw new Error('Missing activationId')
        }

        // Get activation from DB
        const { data: activation, error: actError } = await supabaseClient
            .from('activations')
            .select('*')
            .eq('id', activationId)
            .single()

        if (actError || !activation) {
            throw new Error(`Activation not found: ${activationId}`)
        }

        if (activation.provider !== 'smspva') {
            throw new Error('This activation is not from SMSPVA')
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

        // Call SMSPVA get_sms API to check for messages
        const smspvaService = mapServiceCode(activation.service_code)
        const smspvaCountry = mapCountryCode(activation.country_code)

        const smsUrl = `${SMSPVA_BASE_URL}?metod=get_sms&country=${smspvaCountry}&service=${smspvaService}&id=${activation.order_id}&apikey=${SMSPVA_API_KEY}`

        console.log('🌐 [GET-SMSPVA-INBOX] API Call')

        const response = await fetch(smsUrl)
        const responseText = await response.text()

        let data: any
        try {
            data = JSON.parse(responseText)
        } catch (e) {
            throw new Error(`Failed to parse SMSPVA response`)
        }

        const messages: Array<{ text: string; code: string; date: string }> = []

        // If SMS received (response = 1)
        if ((data.response === '1' || data.response === 1) && data.sms) {
            messages.push({
                text: data.sms,
                code: data.sms,
                date: new Date().toISOString()
            })
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    messages,
                    status: data.response === '1' || data.response === 1 ? 'received' : 'waiting'
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [GET-SMSPVA-INBOX] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
