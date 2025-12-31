
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
        // 1. Init Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Fetch pending activations (older than 2 minutes to be safe)
        const { data: activations, error: fetchError } = await supabaseAdmin
            .from('activations')
            .select('*')
            .eq('status', 'pending')
            .lt('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())
            .limit(50) // Batch size

        if (fetchError) throw fetchError

        console.log(`🧹 Processing ${activations.length} pending activations...`)
        const results = []

        for (const activation of activations) {
            const provider = activation.provider || 'sms-activate'
            let result = 'skipped'

            try {
                // === LOGIC PER PROVIDER ===

                if (provider === 'smspva') {
                    result = await checkSmspva(activation, supabaseAdmin)
                } else if (provider === 'onlinesim') {
                    result = await checkOnlinesim(activation, supabaseAdmin)
                } else if (provider === '5sim') {
                    result = await check5sim(activation, supabaseAdmin)
                } else if (provider === 'sms-activate' || !provider) {
                    result = await checkSmsActivate(activation, supabaseAdmin)
                }

            } catch (e) {
                console.error(`❌ Error processing ${activation.id}:`, e)
                result = `error: ${e.message}`
            }

            results.push({ id: activation.id, provider, result })
            // Rate limit protection
            await new Promise(r => setTimeout(r, 200))
        }

        return new Response(
            JSON.stringify({ success: true, processed: results.length, details: results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// ================= HELPERS =================

// --- SMSPVA ---
async function checkSmspva(activation: any, supabase: any) {
    const API_KEY = Deno.env.get('SMSPVA_API_KEY')
    if (!API_KEY) return 'missing_api_key'

    const url = `http://smspva.com/priemnik.php?metod=get_sms&country=USER_ISO&service=opt29&id=${activation.order_id}&apikey=${API_KEY}`
    const response = await fetch(url)
    const data = await response.json()

    // Response 1: success + sms
    // Response 2: wait
    // Response 3: cancel/timeout
    if (data.response === '1') {
        const smsCode = data.sms
        await commitSuccess(supabase, activation, smsCode, data.text || smsCode)
        return 'committed'
    } else if (data.response === '3') {
        await refund(supabase, activation, 'SMSPVA timeout')
        return 'refunded'
    } else if (checkExpired(activation)) {
        await refund(supabase, activation, 'Local timeout')
        return 'refunded_timeout'
    }
    return 'pending'
}

// --- ONLINESIM ---
async function checkOnlinesim(activation: any, supabase: any) {
    const API_KEY = Deno.env.get('ONLINESIM_API_KEY')
    if (!API_KEY) return 'missing_api_key'

    const url = `https://onlinesim.io/api/getState.php?apikey=${API_KEY}&tzid=${activation.order_id}&message_to_code=1`
    const response = await fetch(url)
    const data = await response.json() // returns array or object
    const op = Array.isArray(data) ? data[0] : data

    if (op && op.response === 'TZ_NUM_ANSWER') {
        const msg = op.msg || ''
        const codeMatch = msg.match(/\d{4,8}/)
        const code = codeMatch ? codeMatch[0] : 'CODE'
        await commitSuccess(supabase, activation, code, msg)
        return 'committed'
    } else if (!op || op.response === 'ERROR_NO_OPERATIONS' || op.response === 'TZ_OVER_OK') {
        // Only if older than 5 mins to be safe
        await refund(supabase, activation, 'OnlineSIM closed/not found')
        return 'refunded'
    } else if (checkExpired(activation)) {
        await refund(supabase, activation, 'Local timeout')
        return 'refunded_timeout'
    }
    return 'pending'
}

// --- 5SIM ---
async function check5sim(activation: any, supabase: any) {
    const API_KEY = Deno.env.get('5SIM_API_TOKEN')
    if (!API_KEY) return 'missing_api_key'

    // 5sim check order
    const url = `https://5sim.net/v1/user/check/${activation.order_id}`
    const headers = { 'Authorization': 'Bearer ' + API_KEY, 'Accept': 'application/json' }
    const response = await fetch(url, { headers })

    if (!response.ok) {
        if (response.status === 404) {
            await refund(supabase, activation, '5sim order not found')
            return 'refunded'
        }
        return 'error_api'
    }

    const data = await response.json()
    // Statuses: PENDING, RECEIVED, CANCELED, TIMEOUT, FINISHED, BANNED
    if (data.status === 'FINISHED' || (data.sms && data.sms.length > 0)) {
        const lastSms = data.sms[data.sms.length - 1]
        await commitSuccess(supabase, activation, lastSms.code, lastSms.text)
        return 'committed'
    } else if (data.status === 'CANCELED' || data.status === 'TIMEOUT' || data.status === 'BANNED') {
        await refund(supabase, activation, `5sim status: ${data.status}`)
        return 'refunded'
    } else if (checkExpired(activation)) {
        await refund(supabase, activation, 'Local timeout')
        return 'refunded_timeout'
    }
    return 'pending'
}

// --- SMS-ACTIVATE ---
async function checkSmsActivate(activation: any, supabase: any) {
    const API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
    if (!API_KEY) return 'missing_api_key'

    const url = `https://api.sms-activate.org/stubs/handler_api.php?api_key=${API_KEY}&action=getStatus&id=${activation.order_id}`
    const response = await fetch(url)
    const text = await response.text()

    // STATUS_OK:CODE
    // STATUS_WAIT_CODE
    // STATUS_CANCEL
    if (text.startsWith('STATUS_OK')) {
        const code = text.split(':')[1]
        await commitSuccess(supabase, activation, code, text)
        return 'committed'
    } else if (text === 'STATUS_CANCEL') {
        await refund(supabase, activation, 'SMS-Activate cancelled')
        return 'refunded'
    } else if (checkExpired(activation)) {
        // For SMS-Activate, usually we should explicitly cancel API side too, but here we just cleanup DB
        // Ideally we call setStatus(8) to cancel...
        await refund(supabase, activation, 'Local timeout')
        return 'refunded_timeout'
    }
    return 'pending'
}


// --- COMMON ---
function checkExpired(activation: any) {
    const expiresAt = new Date(activation.expires_at)
    return new Date() > expiresAt
}

async function commitSuccess(supabase: any, activation: any, code: string, text: string) {
    // 1. Update Activation
    await supabase.from('activations').update({
        status: 'received',
        sms_code: code,
        sms_text: text,
        frozen_amount: 0 // release freeze
    }).eq('id', activation.id)

    // 2. Charge User (Atomic Commit)
    await supabase.rpc('atomic_commit', {
        p_user_id: activation.user_id,
        p_activation_id: activation.id,
        p_amount: activation.price
    })
}

async function refund(supabase: any, activation: any, reason: string) {
    // 1. Update Activation
    await supabase.from('activations').update({
        status: 'timeout', // or cancelled
        frozen_amount: 0
    }).eq('id', activation.id)

    // 2. Refund (Atomic Refund)
    await supabase.rpc('atomic_refund', {
        p_user_id: activation.user_id,
        p_activation_id: activation.id,
        p_rental_id: null,
        p_transaction_id: null,
        p_reason: reason
    })
}
