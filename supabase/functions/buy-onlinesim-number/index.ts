import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONLINESIM_BASE_URL = 'https://onlinesim.io/api'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Service code mapping (5sim/SMS-Activate short codes → OnlineSIM service slugs)
// IMPORTANT: These slugs come from OnlineSIM getTariffs API
const SERVICE_CODE_MAP: Record<string, string> = {
    // Full names → OnlineSIM slugs
    'google': 'google',
    'whatsapp': 'whatsapp',
    'telegram': 'telegram',
    'facebook': '3223',         // ⚠️ OnlineSIM uses '3223' not 'facebook'
    'instagram': 'instagram',
    'twitter': 'twitter',
    'discord': 'discord',       // May not exist on OnlineSIM
    'microsoft': 'microsoft',
    'yahoo': 'yahoo',
    'amazon': 'amazon',         // May not exist on OnlineSIM
    'netflix': 'netflix',       // May not exist on OnlineSIM
    'uber': 'uber',
    'tiktok': 'tiktok',         // May not exist on OnlineSIM
    'snapchat': 'snapchat',     // May not exist on OnlineSIM
    'linkedin': 'linkedin',
    'viber': 'viber',
    'wechat': 'wechat',
    'line': 'linemessenger',    // ⚠️ OnlineSIM uses 'linemessenger' not 'line'
    'tinder': 'tinder',
    'paypal': 'paypal',         // May not exist on OnlineSIM
    'steam': 'steam',
    'apple': 'apple',
    'nike': 'nike',
    'gmail': 'google',
    // Additional OnlineSIM services
    'vkontakte': 'vkcom',
    'vk': 'vkcom',
    'yandex': 'yandex',
    'icq': 'icq',
    'gett': 'gett',
    'olx': 'olx',
    'qq': 'tencentqq',
    'kakaotalk': 'kakaotalk',
    'bolt': 'bolt',
    'airbnb': 'airbnb',
    'aol': 'aol',
    // Short codes (from SMS-Activate)
    'go': 'google',
    'wa': 'whatsapp',
    'tg': 'telegram',
    'fb': '3223',               // ⚠️ Facebook is '3223' on OnlineSIM
    'ig': 'instagram',
    'tw': 'twitter',
    'ds': 'discord',
    'tk': 'tiktok',
    'sn': 'snapchat',
    'vi': 'viber',
    'vb': 'viber',
    'wx': 'wechat',
    'li': 'linkedin',
    'am': 'amazon',
    'nf': 'netflix',
    'sf': 'snapchat',
    'dc': 'discord',
    'ms': 'microsoft',
    'ya': 'yahoo',
    'ap': 'apple',
    'ot': 'other',
    'any': 'any',
    // More SMS-Activate short codes
    'lf': 'lyft',       // Lyft
    'ub': 'uber',       // Uber
    'gl': 'google',     // Google alt
    'pf': 'paypal',     // PayPal
    'tn': 'tinder',     // Tinder
    'lyft': 'lyft',
}

// Country code mapping (5sim country → OnlineSIM country code - phone prefix)
const COUNTRY_CODE_MAP: Record<string, number> = {
    'russia': 7,
    'ukraine': 380,
    'kazakhstan': 77,
    'usa': 1,
    'england': 44,
    'uk': 44,
    'india': 91,
    'indonesia': 62,
    'philippines': 63,
    'poland': 48,
    'germany': 49,
    'france': 33,
    'spain': 34,
    'italy': 39,
    'brazil': 55,
    'mexico': 52,
    'canada': 1,
    'australia': 61,
    'netherlands': 31,
    'china': 86,
    'vietnam': 84,
    'thailand': 66,
    'malaysia': 60,
    'romania': 40,
    'colombia': 57,
    'argentina': 54,
    'turkey': 90,
    'egypt': 20,
    'nigeria': 234,
    'kenya': 254,
    'southafrica': 27,
    'morocco': 212,
}

// SMS-Activate numeric country ID to OnlineSIM phone prefix
const COUNTRY_ID_MAP: Record<string, number> = {
    '0': 7,    // Russia
    '1': 380,  // Ukraine
    '2': 77,   // Kazakhstan
    '3': 86,   // China
    '4': 63,   // Philippines
    '6': 62,   // Indonesia
    '7': 60,   // Malaysia
    '12': 44,  // England/UK
    '15': 48,  // Poland
    '16': 20,  // Egypt
    '22': 91,  // India
    '27': 49,  // Germany
    '32': 40,  // Romania
    '33': 57,  // Colombia
    '36': 1,   // Canada
    '38': 52,  // Mexico
    '40': 34,  // Spain
    '43': 31,  // Netherlands
    '45': 55,  // Brazil
    '46': 90,  // Turkey
    '52': 66,  // Thailand
    '58': 39,  // Italy
    '78': 33,  // France
    '175': 61, // Australia
    '187': 1,  // USA
}

function mapServiceCode(code: string): string | null {
    const lower = code.toLowerCase()
    const mapped = SERVICE_CODE_MAP[lower]
    if (!mapped) {
        console.warn(`⚠️ [ONLINESIM] Unknown service code: '${code}' - not in SERVICE_CODE_MAP`)
        // Return code as-is, OnlineSIM will reject if invalid
        return lower
    }
    return mapped
}

function mapCountryCode(country: string): number {
    // First try numeric ID mapping (SMS-Activate IDs)
    if (COUNTRY_ID_MAP[country]) {
        return COUNTRY_ID_MAP[country]
    }
    // Then try name mapping
    const lower = country.toLowerCase()
    if (COUNTRY_CODE_MAP[lower]) {
        return COUNTRY_CODE_MAP[lower]
    }
    // Default to Russia
    console.log('⚠️ [ONLINESIM] Unknown country, defaulting to 7 (Russia):', country)
    return 7
}

serve(async (req) => {
    console.log('🚀 [BUY-ONLINESIM] Function called')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get OnlineSIM API key
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
            throw new Error('OnlineSIM API key not configured. Please configure it in Admin > Providers.')
        }

        // Auth check
        const authHeader = req.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            throw new Error('Unauthorized - No token provided')
        }
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        const { country, operator, product, userId, expectedPrice } = await req.json()
        console.log('📞 [BUY-ONLINESIM] Request:', { country, operator, product, userId, expectedPrice })

        // Map to OnlineSIM codes
        const onlinesimService = mapServiceCode(product)
        const onlinesimCountry = mapCountryCode(country)

        console.log('🗺️ [BUY-ONLINESIM] Mapped codes:', { onlinesimService, onlinesimCountry })

        // 1. Check user balance
        const { data: userProfile, error: profileError } = await supabaseClient
            .from('users')
            .select('balance, frozen_balance')
            .eq('id', userId)
            .single()

        if (profileError || !userProfile) throw new Error('User profile not found')

        const frozenBalance = userProfile.frozen_balance || 0
        const availableBalance = userProfile.balance - frozenBalance
        const price = expectedPrice || 5.0

        if (availableBalance < price) {
            throw new Error(`Insufficient balance. Required: ${price}, Available: ${availableBalance}`)
        }

        const currentBalance = userProfile.balance
        console.log('💰 [BUY-ONLINESIM] Balance check:', { total: currentBalance, frozen: frozenBalance, available: availableBalance })

        // 2. Create pending transaction
        const { data: txn, error: txnError } = await supabaseClient
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'purchase',
                amount: -price,
                status: 'pending',
                description: `Purchase OnlineSIM activation for ${product} (${country})`,
                provider: 'onlinesim',
                balance_before: currentBalance,
                balance_after: currentBalance
            })
            .select()
            .single()

        if (txnError) {
            console.error('❌ [BUY-ONLINESIM] Failed to create transaction:', txnError)
            throw new Error(`Transaction creation failed: ${txnError.message}`)
        }

        // 3. Create ledger entry (freeze)
        await supabaseClient.from('balance_operations').insert({
            user_id: userId,
            operation_type: 'freeze',
            amount: price,
            balance_before: currentBalance,
            balance_after: currentBalance,
            frozen_before: frozenBalance,
            frozen_after: frozenBalance + price,
            reason: 'Freeze credits for OnlineSIM purchase',
            created_at: new Date().toISOString()
        })

        // 4. Freeze credits
        await supabaseClient.from('users').update({
            frozen_balance: frozenBalance + price
        }).eq('id', userId)

        console.log('🔒 [BUY-ONLINESIM] Credits frozen:', price)

        // Validate service before API call
        if (!onlinesimService || onlinesimService === 'undefined' || onlinesimService === 'null') {
            await refundFrozen(supabaseClient, userId, price, txn.id, frozenBalance, 'Service code is empty')
            throw new Error(`OnlineSIM: Invalid service code - product was: '${product}', mapped to: '${onlinesimService}'`)
        }

        // 5. Buy from OnlineSIM API
        // OnlineSIM endpoint: GET /api/getNum.php?apikey=XXX&service=SERVICE&country=COUNTRY
        const buyUrl = `${ONLINESIM_BASE_URL}/getNum.php?apikey=${ONLINESIM_API_KEY}&service=${onlinesimService}&country=${onlinesimCountry}`

        console.log('🌐 [BUY-ONLINESIM] API Call URL:', buyUrl.replace(ONLINESIM_API_KEY, '***'))
        console.log('🌐 [BUY-ONLINESIM] Service:', onlinesimService, 'Country:', onlinesimCountry)

        const response = await fetch(buyUrl)
        const responseText = await response.text()
        console.log('📥 [BUY-ONLINESIM] Raw Response:', responseText)

        let data: any
        try {
            data = JSON.parse(responseText)
        } catch (e) {
            console.error('❌ [BUY-ONLINESIM] Failed to parse response:', responseText)
            await refundFrozen(supabaseClient, userId, price, txn.id, frozenBalance, `OnlineSIM parse error`)
            throw new Error(`OnlineSIM error: ${responseText}`)
        }

        // Check OnlineSIM response
        // Success: { response: 1, tzid: 12345 } or { response: "1", tzid: "12345" }
        if (data.response !== 1 && data.response !== '1') {
            const errorMsg = getOnlinesimErrorMessage(data.response)
            console.error('❌ [BUY-ONLINESIM] API Error:', errorMsg, 'Service:', onlinesimService, 'Country:', onlinesimCountry, 'Full response:', JSON.stringify(data))
            await refundFrozen(supabaseClient, userId, price, txn.id, frozenBalance, `OnlineSIM error: ${errorMsg}`)
            throw new Error(`OnlineSIM: ${errorMsg} (service=${onlinesimService}, country=${onlinesimCountry})`)
        }

        // Success - Extract data
        const orderId = data.tzid.toString()

        // OnlineSIM doesn't return phone immediately - need to call getState
        // For now, we'll store tzid and get phone from first getState call
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000) // 20 minutes (aligned with SMS-Activate/5sim)

        // 6. Create activation record
        const { data: activation, error: actError } = await supabaseClient
            .from('activations')
            .insert({
                user_id: userId,
                order_id: orderId,
                phone: 'pending', // Will be updated on first status check
                service_code: product,
                country_code: country,
                operator: operator || 'any',
                price: price,
                frozen_amount: price,
                status: 'pending',
                expires_at: expiresAt.toISOString(),
                provider: 'onlinesim'
            })
            .select()
            .single()

        if (actError) {
            console.error('❌ [BUY-ONLINESIM] DB Save Error:', actError)
            await refundFrozen(supabaseClient, userId, price, txn.id, frozenBalance, `Activation save failed`)
            throw new Error('Failed to save activation')
        }

        // Link transaction
        await supabaseClient.from('transactions').update({ related_activation_id: activation.id }).eq('id', txn.id)

        // Try to get phone number from getState immediately
        try {
            const stateUrl = `${ONLINESIM_BASE_URL}/getState.php?apikey=${ONLINESIM_API_KEY}&tzid=${orderId}`
            const stateResponse = await fetch(stateUrl)
            const stateData = await stateResponse.json()

            if (Array.isArray(stateData) && stateData.length > 0 && stateData[0].number) {
                const phoneNumber = stateData[0].number
                await supabaseClient.from('activations').update({ phone: phoneNumber }).eq('id', activation.id)
                activation.phone = phoneNumber
                console.log('📞 [BUY-ONLINESIM] Phone retrieved:', phoneNumber)
            }
        } catch (e) {
            console.log('ℹ️ [BUY-ONLINESIM] Could not get phone immediately, will retry on status check')
        }

        console.log('✅ [BUY-ONLINESIM] Success:', { activation_id: activation.id, orderId })

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    id: activation.id,
                    activation_id: orderId,
                    phone: activation.phone,
                    service: product,
                    country: country,
                    price: price,
                    status: 'pending',
                    expires: expiresAt.toISOString(),
                    provider: 'onlinesim'
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [BUY-ONLINESIM] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message || String(error) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})

// Helper: Refund frozen balance (aligned with SMS-Activate pattern)
async function refundFrozen(
    supabase: any,
    userId: string,
    price: number,
    txnId: string,
    frozenBefore: number,
    reason: string
) {
    // Re-read current user state to get actual values (not stale)
    const { data: currentUser } = await supabase
        .from('users')
        .select('balance, frozen_balance')
        .eq('id', userId)
        .single()

    const currentBalance = currentUser?.balance || 0
    const currentFrozen = currentUser?.frozen_balance || 0
    const newFrozen = Math.max(0, currentFrozen - price)

    // Create ledger entry with proper balance tracking (like SMS-Activate)
    await supabase.from('balance_operations').insert({
        user_id: userId,
        operation_type: 'refund',
        amount: price,
        balance_before: currentBalance,
        balance_after: currentBalance, // Balance unchanged for freeze/unfreeze
        frozen_before: currentFrozen,
        frozen_after: newFrozen,
        reason: reason,
        created_at: new Date().toISOString()
    })

    // Unfreeze credits with CURRENT value
    await supabase.from('users').update({ frozen_balance: newFrozen }).eq('id', userId)

    // Update transaction status
    await supabase.from('transactions').update({
        status: 'failed',
        description: reason
    }).eq('id', txnId)
}

// Helper: Get OnlineSIM error message
function getOnlinesimErrorMessage(responseCode: string | number): string {
    const errorMap: Record<string, string> = {
        'NO_NUMBERS': 'No numbers available for this service/country',
        'NO_BALANCE': 'Insufficient balance on OnlineSIM account',
        'ERROR_WRONG_KEY': 'Invalid API key',
        'ERROR_NO_KEY': 'API key not provided',
        'ERROR_NO_SERVICE': 'Service not specified',
        'TZ_INPOOL': 'Order already in queue',
        'TZ_NUM_PREPARE': 'Number is being prepared',
    }
    return errorMap[responseCode.toString()] || `Unknown error: ${responseCode}`
}
