import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMSPVA_BASE_URL = 'https://smspva.com/priemnik.php'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Service code mapping (synced with buy-smspva-number)
const SERVICE_CODE_MAP: Record<string, string> = {
    'google': 'opt1',
    'whatsapp': 'opt4',
    'telegram': 'opt29',
    'facebook': 'opt2',
    'instagram': 'opt16',
    'twitter': 'opt41',
    'discord': 'opt25',
    'microsoft': 'opt15',
    'yahoo': 'opt65',
    'amazon': 'opt17',
    'netflix': 'opt28',
    'uber': 'opt7',
    'tiktok': 'opt20',
    'snapchat': 'opt23',
    'linkedin': 'opt14',
    'viber': 'opt5',
    'wechat': 'opt37',
    'line': 'opt26',
    'tinder': 'opt8',
    'paypal': 'opt18',
    'steam': 'opt46',
    'apple': 'opt39',
    'nike': 'opt72',
    'gmail': 'opt1',
    // Short codes
    'go': 'opt1',
    'wa': 'opt4',
    'tg': 'opt29',
    'fb': 'opt2',
    'ig': 'opt16',
    'tw': 'opt41',
    'ds': 'opt25',
    'tk': 'opt20',
    'vi': 'opt5',
    'vb': 'opt5',
    'ot': 'opt4',
    'li': 'opt14',
    'am': 'opt17',
    'nf': 'opt28',
    'sf': 'opt23',
    'dc': 'opt25',
    'ms': 'opt15',
    'ya': 'opt65',
    'ap': 'opt39',
}

// Country code mapping (synced with buy-smspva-number)
const COUNTRY_CODE_MAP: Record<string, string> = {
    'russia': 'RU',
    'ukraine': 'UA',
    'kazakhstan': 'KZ',
    'usa': 'US',
    'england': 'UK',
    'uk': 'UK',
    'india': 'IN',
    'indonesia': 'ID',
    'philippines': 'PH',
    'poland': 'PL',
    'germany': 'DE',
    'france': 'FR',
    'spain': 'ES',
    'italy': 'IT',
    'brazil': 'BR',
    'mexico': 'MX',
    'canada': 'CA',
    'australia': 'AU',
    'netherlands': 'NL',
    'china': 'CN',
    'vietnam': 'VN',
    'thailand': 'TH',
    'malaysia': 'MY',
    'romania': 'RO',
    'colombia': 'CO',
    'argentina': 'AR',
    'turkey': 'TR',
    'egypt': 'EG',
    'nigeria': 'NG',
    'kenya': 'KE',
    'southafrica': 'ZA',
    'morocco': 'MA',
}

// SMS-Activate numeric country ID to SMSPVA code
const COUNTRY_ID_MAP: Record<string, string> = {
    '0': 'RU', '1': 'UA', '2': 'KZ', '3': 'CN', '4': 'PH', '6': 'ID', '7': 'MY',
    '12': 'UK', '15': 'PL', '16': 'EG', '22': 'IN', '27': 'DE', '32': 'RO',
    '33': 'CO', '36': 'CA', '38': 'MX', '40': 'ES', '43': 'NL', '45': 'BR',
    '46': 'TR', '52': 'TH', '58': 'IT', '78': 'FR', '175': 'AU', '187': 'US',
}

function mapServiceCode(code: string): string {
    return SERVICE_CODE_MAP[code.toLowerCase()] || `opt${code.toLowerCase()}`
}

function mapCountryCode(country: string): string {
    // First try numeric ID mapping
    if (COUNTRY_ID_MAP[country]) {
        return COUNTRY_ID_MAP[country]
    }
    // Then try name mapping
    const lower = country.toLowerCase()
    if (COUNTRY_CODE_MAP[lower]) {
        return COUNTRY_CODE_MAP[lower]
    }
    // If already 2-letter code
    if (country.length === 2) {
        return country.toUpperCase()
    }
    return 'RU' // Default
}

serve(async (req) => {
    console.log('🔍 [CHECK-SMSPVA] Function called')

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

        console.log('🔍 [CHECK-SMSPVA] Checking activation:', activationId)

        // Get activation from DB
        const { data: activation, error: actError } = await supabaseClient
            .from('activations')
            .select('*')
            .eq('id', activationId)
            .eq('id', activationId)
            .maybeSingle()

        if (actError) {
            throw new Error(`Database error: ${actError.message}`)
        }

        if (!activation) {
            console.warn(`⚠️ [CHECK-SMSPVA] Activation ${activationId} not found (deleted?). Returning cancelled status to stop polling.`)
            return new Response(
                JSON.stringify({
                    success: true,
                    data: {
                        status: 'cancelled',
                        sms_code: null,
                        sms_text: null,
                        charged: false
                    }
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (activation.provider !== 'smspva') {
            throw new Error('This activation is not from SMSPVA')
        }

        console.log('📋 [CHECK-SMSPVA] Activation found:', {
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

        // Map codes for API call
        const smspvaService = mapServiceCode(activation.service_code)
        const smspvaCountry = mapCountryCode(activation.country_code)

        // Call SMSPVA get_sms API
        const checkUrl = `${SMSPVA_BASE_URL}?metod=get_sms&country=${smspvaCountry}&service=${smspvaService}&id=${activation.order_id}&apikey=${SMSPVA_API_KEY}`

        console.log('🌐 [CHECK-SMSPVA] API Call:', checkUrl.replace(SMSPVA_API_KEY, '***'))

        const response = await fetch(checkUrl)
        const responseText = await response.text()

        console.log('📥 [CHECK-SMSPVA] Raw Response:', responseText)

        let data: any
        try {
            data = JSON.parse(responseText)
        } catch (e) {
            console.error('❌ [CHECK-SMSPVA] Failed to parse response:', responseText)
            throw new Error(`SMSPVA parse error: ${responseText}`)
        }

        console.log('📥 [CHECK-SMSPVA] Parsed Response:', data)

        let smsCode = null
        let smsText = null
        let newStatus = activation.status

        // SMSPVA response codes:
        // response=1, sms="123456" = SMS received
        // response=2, sms=null = Still waiting
        // response=3 = Expired/Invalid
        // response=4 = Already retrieved (missed first response)

        if ((data.response === '1' || data.response === 1) && data.sms) {
            // SMS received!
            smsCode = data.sms
            smsText = data.sms
            newStatus = 'received'

            console.log('✅ [CHECK-SMSPVA] SMS received:', smsCode)

            // Find related transaction
            const { data: transaction } = await supabaseClient
                .from('transactions')
                .select('id')
                .eq('related_activation_id', activationId)
                .eq('status', 'pending')
                .eq('status', 'pending')
                .maybeSingle()

            // Re-freeze if late SMS (already refunded)
            if (!activation.charged && (activation.frozen_amount ?? 0) <= 0) {
                console.log('🧊 [CHECK-SMSPVA] Late SMS - re-freezing before commit...')
                await supabaseClient.rpc('atomic_freeze', {
                    p_user_id: activation.user_id,
                    p_amount: activation.price,
                    p_reason: 'Late SMSPVA SMS - re-freeze for charge'
                })
            }

            // Commit the charge
            const { data: commitResult, error: commitError } = await supabaseClient.rpc('atomic_commit', {
                p_user_id: activation.user_id,
                p_amount: activation.price,
                p_activation_id: activationId,
                p_rental_id: null,
                p_transaction_id: transaction?.id ?? null,
                p_reason: 'SMSPVA SMS received - auto charge'
            })

            if (commitError) {
                console.error('❌ [CHECK-SMSPVA] atomic_commit failed:', commitError)
            } else {
                console.log('✅ [CHECK-SMSPVA] atomic_commit success:', commitResult)
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

        } else if (data.response === '3' || data.response === 3) {
            // Expired or invalid
            console.log('⏰ [CHECK-SMSPVA] Activation expired/invalid')
            newStatus = 'timeout'

            await supabaseClient
                .from('activations')
                .update({ status: 'timeout', frozen_amount: 0 })
                .eq('id', activationId)

            // Refund
            const { error: refundError } = await supabaseClient.rpc('atomic_refund', {
                p_user_id: activation.user_id,
                p_activation_id: activationId,
                p_rental_id: null,
                p_transaction_id: null,
                p_reason: 'SMSPVA timeout'
            })

            if (refundError) {
                console.error('❌ [CHECK-SMSPVA] Refund error:', refundError)
            }

        } else if (data.response === '2' || data.response === 2) {
            // Still waiting
            console.log('⏳ [CHECK-SMSPVA] Still waiting for SMS')

            // Check local timeout
            const expiresAt = new Date(activation.expires_at)
            if (new Date() > expiresAt) {
                console.log('⏰ [CHECK-SMSPVA] Local timeout reached')
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
                    p_reason: 'SMSPVA local timeout'
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
        console.error('❌ [CHECK-SMSPVA] Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
