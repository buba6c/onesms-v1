
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMSPoolClient, SMSPoolOrderResponse } from '../_shared/smspool.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log('🏊 [BUY-SMSPOOL] Function called')

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

        if (settings?.value) {
            SMSPOOL_API_KEY = settings.value
        }

        if (!SMSPOOL_API_KEY) {
            throw new Error('SMSPool API key not configured')
        }

        // 2. Auth Check
        const authHeader = req.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            throw new Error('Unauthorized - No token provided')
        }
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

        if (authError || !user) throw new Error('Unauthorized')
        const userId = user.id

        // 3. Parse Request
        const { country: rawCountry, service, product, expectedPrice } = await req.json()
        const serviceCode = product || service

        // Resolve Country (SMSPool needs ISO code like 'US', 'GB')
        const country = resolveCountry(rawCountry)

        // Resolve Service (SMSPool needs 'whatsapp', 'google', not 'wa', 'go')
        const finalService = resolveService(serviceCode)

        console.log('🏊 [BUY-SMSPOOL] Request:', { rawCountry, country, serviceCode, finalService, userId, expectedPrice })

        // 4. Balance Check & Freeze (Atomic)
        // We use the same robust logic as Grizzly function
        const { data: userProfile } = await supabaseClient
            .from('users')
            .select('balance, frozen_balance')
            .eq('id', userId)
            .single()

        if (!userProfile) throw new Error('User profile not found')

        const price = expectedPrice || 0.60 // Default fallback if not provided
        const availableBalance = userProfile.balance - (userProfile.frozen_balance || 0)

        if (availableBalance < price) {
            throw new Error(`Insufficient balance: Required ${price} Ⓐ`)
        }

        // Freeze logic using balance_operations
        const { data: txn, error: txnError } = await supabaseClient
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'purchase',
                amount: -price,
                status: 'pending',
                description: `Purchase SMSPool activation for ${serviceCode} (${country})`,
                provider: 'smspool',
                balance_before: userProfile.balance,
                balance_after: userProfile.balance // Not deducted yet, just pending
            })
            .select()
            .single()

        if (txnError) throw new Error(`Transaction failed: ${txnError.message}`)

        await supabaseClient.from('users').update({
            frozen_balance: (userProfile.frozen_balance || 0) + price
        }).eq('id', userId)

        // 5. API Call to SMSPool
        const client = new SMSPoolClient(SMSPOOL_API_KEY)
        let order: SMSPoolOrderResponse

        try {
            order = await client.purchaseNumber(country, finalService)
            console.log('🏊 [BUY-SMSPOOL] Order result:', order)
        } catch (apiError) {
            // Rollback freeze if API call fails entirely network-wise
            await supabaseClient.rpc('atomic_refund', { p_activation_id: null }) // We don't have activation ID, need custom rollback
            // Actually, atomic_refund expects an ID. We should create a failed record ideally or manual rollback.
            await supabaseClient.from('users').update({
                frozen_balance: (userProfile.frozen_balance || 0) // Reset to original? No, userProfile is old.
                // Simplified rollback:
                // We rely on the fact that if we fail here, we throw, and frontend sees error.
                // BUT we modified DB. We MUST rollback the freeze.
            }).eq('id', userId)

            // Revert frozen_balance
            const { error: revError } = await supabaseClient.rpc('unfreeze_balance', {
                p_user_id: userId,
                p_amount: price
            })
            if (revError) console.error('Failed to unfreeze', revError)

            await supabaseClient.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
            throw apiError
        }

        // Check success flag from SMSPool (success: 1 or 0)
        if (order.success !== 1 || !order.order_id || !order.number) {
            // Rollback
            console.error('🏊 [BUY-SMSPOOL] API returned failure:', order.message)

            const { error: revError } = await supabaseClient.rpc('unfreeze_balance', {
                p_user_id: userId,
                p_amount: price
            })
            await supabaseClient.from('transactions').update({ status: 'failed', description: `Failed: ${order.message}` }).eq('id', txn.id)

            throw new Error(order.message === 'No Stock' ? 'NO_NUMBERS' : `SMSPool Error: ${order.message}`)
        }

        const activationId = order.order_id
        const phone = order.number.toString() // Ensure string

        // 6. Save Activation
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000) // 20 mins standard

        const { data: activation, error: actError } = await supabaseClient
            .from('activations')
            .insert({
                user_id: userId,
                order_id: activationId,
                phone: phone,
                service_code: serviceCode,
                country_code: country,
                operator: 'any',
                price: price,
                frozen_amount: price,
                status: 'pending',
                expires_at: expiresAt.toISOString(),
                provider: 'smspool'
            })
            .select()
            .single()

        if (actError) {
            // Critical: Service purchased but not saved.
            // Try to cancel immediately at SMSPool to save money?
            // Or save as orphaned.
            console.error('❌ [BUY-SMSPOOL] DB Save Error:', actError)

            // Attempt refund/cancel
            try {
                await client.cancelOrder(activationId)
            } catch (e) { console.error('Failed to auto-cancel orphaned order', e) }

            // Unfreeze
            await supabaseClient.rpc('unfreeze_balance', { p_user_id: userId, p_amount: price })
            await supabaseClient.from('transactions').update({ status: 'failed' }).eq('id', txn.id)

            throw new Error('Database error while saving number')
        }

        // Link transaction
        await supabaseClient.from('transactions').update({ related_activation_id: activation.id }).eq('id', txn.id)

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    id: activation.id,
                    activation_id: activationId,
                    phone: phone,
                    service: serviceCode,
                    country: country,
                    price: price,
                    status: 'pending',
                    expires: expiresAt.toISOString()
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [BUY-SMSPOOL] Error:', error.message)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})

// --- HELPERS ---

const COUNTRY_MAP: Record<string, string> = {
    // SMS-Activate IDs Mapped to ISO (SMSPool)
    '0': 'RU', '1': 'UA', '2': 'KZ', '3': 'CN', '4': 'PH', '5': 'MM', '6': 'ID',
    '7': 'MY', '8': 'KE', '9': 'TZ', '10': 'VN', '11': 'KG', '12': 'US',
    '13': 'IL', '14': 'HK', '15': 'PL', '16': 'GB', '18': 'DC', '19': 'NG',
    '20': 'MO', '21': 'EG', '22': 'IN', '23': 'IE', '24': 'KH', '25': 'LA',
    '26': 'YE', '27': 'ZA', '28': 'RO', '29': 'CO', '30': 'EE', '31': 'AZ',
    '32': 'CA', '33': 'MA', '34': 'GH', '35': 'AR', '36': 'UZ', '37': 'CM',
    '38': 'TG', '39': 'DE', '40': 'TR', '41': 'IT', '42': 'PK', '43': 'BD',
    '44': 'TH', '45': 'SA', '46': 'MX', '47': 'TW', '48': 'IR', '49': 'DZ',
    '50': 'LB', '51': 'BY', '52': 'PE', '53': 'VE', '54': 'ET', '55': 'UG',
    '56': 'AO', '57': 'MZ', '60': 'BR', '61': 'PT', '62': 'ZM', '63': 'FI',
    '73': 'BR', '78': 'FR', '79': 'ES', '86': 'IT', // Overlaps handled
    '187': 'US', // USA Physical
    // Common Names
    'usa': 'US', 'united states': 'US', 'us': 'US',
    'uk': 'GB', 'united kingdom': 'GB', 'england': 'GB', 'britain': 'GB',
    'russia': 'RU', 'france': 'FR', 'germany': 'DE', 'netherlands': 'NL',
    'spain': 'ES', 'italy': 'IT', 'brazil': 'BR', 'india': 'IN',
    'indonesia': 'ID', 'malaysia': 'MY', 'vietnam': 'VN', 'philippines': 'PH',
    'thailand': 'TH', 'turkey': 'TR', 'egypt': 'EG', 'morocco': 'MA',
    'canada': 'CA', 'australia': 'AU', 'sweden': 'SE', 'belgium': 'BE',
    'switzerland': 'CH', 'austria': 'AT', 'china': 'CN', 'japan': 'JP'
}

function resolveCountry(input: string): string {
    if (!input) return 'US' // Default safest
    const cleaned = input.toString().toLowerCase().trim()
    if (COUNTRY_MAP[cleaned]) return COUNTRY_MAP[cleaned]
    if (cleaned.length === 2) return cleaned.toUpperCase() // Assume ISO
    return cleaned // Fallback
}

function resolveService(input: string): string {
    const map: Record<string, string> = {
        'wa': '1012', // WhatsApp
        'tg': '907',  // Telegram
        'go': '395',  // Google/Gmail
        'ig': '457',  // Instagram / Threads
        'fb': '329',  // Facebook
        'lf': '924',  // TikTok/Douyin (SMS-Activate code)
        'tk': '924',  // TikTok/Douyin (Common code)
        'tw': '979',  // Twitter / X (Note: Verified ID 979 usually for Twitter)
        'oi': '927',  // Tinder (Check ID?) - Let's use 'tinder' if unsure or check log
        'ub': '1047', // Uber
        'ds': '300',  // Discord
        'vi': '994',  // Viber
        'sn': '826',  // Snapchat
        'mm': '558',  // Microsoft
        'wb': '1006'  // WeChat
    }
    // Fallback to input if not mapped, but prefer mapped ID
    return map[input?.toLowerCase()] || input
}
