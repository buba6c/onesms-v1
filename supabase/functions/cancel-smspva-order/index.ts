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
    console.log('❌ [CANCEL-SMSPVA] Function called')

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

        const { orderId, activationId, userId } = await req.json()

        console.log('❌ [CANCEL-SMSPVA] Starting cancellation:', { orderId, activationId, userId })

        // Find activation - tolerant lookup for legacy data
        let activation = null

        if (activationId) {
            // Primary lookup by activationId (most reliable)
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
                .eq('provider', 'smspva')
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
                console.log('⚠️ [CANCEL-SMSPVA] Found legacy activation (provider NULL)')
                activation = data
            }
        }

        if (!activation) {
            throw new Error(`SMSPVA activation not found: orderId=${orderId}, activationId=${activationId}`)
        }

        // Safety check: reject if provider is explicitly another provider (not smspva, not null)
        if (activation.provider && activation.provider !== 'smspva') {
            throw new Error(`Activation belongs to provider '${activation.provider}', not SMSPVA. Use correct cancel function.`)
        }

        console.log('📋 [CANCEL-SMSPVA] Activation found:', {
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
            console.log('⚠️ [CANCEL-SMSPVA] Could not lock - already processed')
            return new Response(
                JSON.stringify({ success: true, message: 'Already processed', alreadyProcessed: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('🔒 [CANCEL-SMSPVA] Activation locked')

        // Cancel on SMSPVA API using 'denial' method
        const smspvaService = mapServiceCode(activation.service_code)
        const smspvaCountry = mapCountryCode(activation.country_code)

        const cancelUrl = `${SMSPVA_BASE_URL}?metod=denial&country=${smspvaCountry}&service=${smspvaService}&id=${activation.order_id}&apikey=${SMSPVA_API_KEY}`

        console.log('🌐 [CANCEL-SMSPVA] API Call:', cancelUrl.replace(SMSPVA_API_KEY, '***'))

        const response = await fetch(cancelUrl)
        const responseText = await response.text()
        console.log('📥 [CANCEL-SMSPVA] API Response:', responseText)

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
            p_reason: 'Cancelled by user (SMSPVA)'
        })

        let finalBalance = 0
        let finalFrozen = 0
        let refundedAmount = activation.frozen_amount || 0

        if (refundError) {
            console.error('⚠️ [CANCEL-SMSPVA] atomic_refund failed:', refundError)
            return new Response(
                JSON.stringify({ success: false, error: 'Refund failed', detail: refundError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } else {
            console.log('💰 [CANCEL-SMSPVA] atomic_refund SUCCESS:', refundResult)
            finalBalance = refundResult?.balance_after || 0
            finalFrozen = refundResult?.frozen_after || 0
            refundedAmount = refundResult?.refunded || refundedAmount
        }

        console.log('✅ [CANCEL-SMSPVA] Completed:', {
            activation_id: activation.id,
            refunded: refundedAmount,
            newBalance: finalBalance
        })

        return new Response(
            JSON.stringify({
                success: true,
                message: 'SMSPVA activation cancelled and refunded',
                refunded: refundedAmount,
                newBalance: finalBalance,
                newFrozenBalance: finalFrozen
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [CANCEL-SMSPVA] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
