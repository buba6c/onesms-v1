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
    console.log('✅ [FINISH-SMSPVA] Function called')

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

        // SMSPVA uses 'ban' method to mark number as used successfully
        // This prevents the number from being reused
        const smspvaService = mapServiceCode(activation.service_code)
        const smspvaCountry = mapCountryCode(activation.country_code)

        const banUrl = `${SMSPVA_BASE_URL}?metod=ban&country=${smspvaCountry}&service=${smspvaService}&id=${activation.order_id}&apikey=${SMSPVA_API_KEY}`

        console.log('🌐 [FINISH-SMSPVA] Calling ban/finish API')

        const response = await fetch(banUrl)
        const responseText = await response.text()

        console.log('📥 [FINISH-SMSPVA] Response:', responseText)

        let data: any
        try {
            data = JSON.parse(responseText)
        } catch (e) {
            // Non-JSON response - could still be success
            data = { response: responseText }
        }

        // Update activation status to completed
        await supabaseClient
            .from('activations')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', activationId)

        console.log('✅ [FINISH-SMSPVA] Activation marked as completed')

        return new Response(
            JSON.stringify({
                success: true,
                message: 'SMSPVA activation finished successfully'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [FINISH-SMSPVA] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
