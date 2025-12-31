import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMSPVA_BASE_URL = 'https://smspva.com/priemnik.php'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Service code mapping (5sim/common → SMSPVA)
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
    // Short codes (from SMS-Activate and other providers)
    'go': 'opt1',
    'wa': 'opt4',
    'tg': 'opt29',
    'fb': 'opt2',
    'ig': 'opt16',
    'tw': 'opt41',
    'ds': 'opt25',
    'tk': 'opt20',
    'vi': 'opt5',   // Viber
    'vb': 'opt5',   // Viber alt
    'ot': 'opt4',   // Other/default to WhatsApp
    'li': 'opt14',  // LinkedIn
    'am': 'opt17',  // Amazon
    'nf': 'opt28',  // Netflix
    'sf': 'opt23',  // Snapchat
    'dc': 'opt25',  // Discord
    'ms': 'opt15',  // Microsoft
    'ya': 'opt65',  // Yahoo
    'ap': 'opt39',  // Apple
}

// Country code mapping (5sim country → SMSPVA country code)
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
    '0': 'RU',   // Russia
    '1': 'UA',   // Ukraine
    '2': 'KZ',   // Kazakhstan
    '3': 'CN',   // China
    '4': 'PH',   // Philippines
    '6': 'ID',   // Indonesia
    '7': 'MY',   // Malaysia
    '12': 'UK',  // England/UK
    '15': 'PL',  // Poland
    '16': 'EG',  // Egypt
    '22': 'IN',  // India
    '27': 'DE',  // Germany
    '32': 'RO',  // Romania
    '33': 'CO',  // Colombia
    '36': 'CA',  // Canada
    '38': 'MX',  // Mexico
    '40': 'ES',  // Spain
    '43': 'NL',  // Netherlands
    '45': 'BR',  // Brazil
    '46': 'TR',  // Turkey
    '52': 'TH',  // Thailand
    '58': 'IT',  // Italy
    '78': 'FR',  // France
    '175': 'AU', // Australia
    '187': 'US', // USA
}

function mapServiceCode(code: string): string {
    const lower = code.toLowerCase()
    return SERVICE_CODE_MAP[lower] || `opt${lower}`
}

function mapCountryCode(country: string): string {
    // First try numeric ID mapping (SMS-Activate IDs)
    if (COUNTRY_ID_MAP[country]) {
        return COUNTRY_ID_MAP[country]
    }
    // Then try name mapping
    const lower = country.toLowerCase()
    if (COUNTRY_CODE_MAP[lower]) {
        return COUNTRY_CODE_MAP[lower]
    }
    // If it's already a 2-letter code, use it
    if (country.length === 2) {
        return country.toUpperCase()
    }
    // Default to RU if unknown (most available)
    console.log('⚠️ [SMSPVA] Unknown country, defaulting to RU:', country)
    return 'RU'
}

// Country Prefix Map for Normalization (Explicit because DB table is unreliable)
const COUNTRY_PREFIX_MAP: Record<string, string> = {
    'RU': '7', 'KZ': '7', 'UA': '380',
    'US': '1', 'CA': '1',
    'UK': '44', 'GB': '44', 'FR': '33', 'DE': '49', 'ES': '34', 'IT': '39', 'NL': '31', 'PL': '48',
    'BR': '55', 'ID': '62', 'PH': '63', 'IN': '91', 'VN': '84', 'TH': '66', 'MY': '60',
    'CN': '86', 'AU': '61', 'RO': '40', 'CO': '57', 'AR': '54', 'TR': '90', 'EG': '20',
    'MA': '212', 'ZA': '27', 'NG': '234', 'KE': '254'
}

serve(async (req) => {
    console.log('🚀 [BUY-SMSPVA] Function called')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get SMSPVA API key from DB or env
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
            throw new Error('SMSPVA API key not configured. Please configure it in Admin > Providers.')
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
        console.log('📞 [BUY-SMSPVA] Request:', { country, operator, product, userId, expectedPrice })

        // Map to SMSPVA codes
        const smspvaService = mapServiceCode(product)
        const smspvaCountry = mapCountryCode(country)

        console.log('🗺️ [BUY-SMSPVA] Mapped codes:', { smspvaService, smspvaCountry })

        // 1. Check user balance AND frozen_balance atomically
        const { data: userProfile, error: profileError } = await supabaseClient
            .from('users')
            .select('balance, frozen_balance')
            .eq('id', userId)
            .single()

        if (profileError || !userProfile) throw new Error('User profile not found')

        const frozenBalance = userProfile.frozen_balance || 0
        const availableBalance = userProfile.balance - frozenBalance
        const price = expectedPrice || 5.0 // SMSPVA default price estimation

        if (availableBalance < price) {
            throw new Error(`Insufficient balance. Required: ${price}, Available: ${availableBalance} (${frozenBalance} frozen)`)
        }

        const currentBalance = userProfile.balance
        console.log('💰 [BUY-SMSPVA] Balance check:', {
            total: currentBalance,
            frozen: frozenBalance,
            available: availableBalance,
            required: price
        })

        // 2. Create pending transaction
        const { data: txn, error: txnError } = await supabaseClient
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'purchase',
                amount: -price,
                status: 'pending',
                description: `Purchase SMSPVA activation for ${product} (${country})`,
                provider: 'smspva',
                balance_before: currentBalance,
                balance_after: currentBalance
            })
            .select()
            .single()

        if (txnError) {
            console.error('❌ [BUY-SMSPVA] Failed to create transaction:', txnError)
            throw new Error(`Transaction creation failed: ${txnError.message}`)
        }

        console.log('📝 [BUY-SMSPVA] Transaction created:', txn.id)

        // 3. Create ledger entry (freeze)
        const { error: ledgerError } = await supabaseClient.from('balance_operations').insert({
            user_id: userId,
            operation_type: 'freeze',
            amount: price,
            balance_before: currentBalance,
            balance_after: currentBalance,
            frozen_before: frozenBalance,
            frozen_after: frozenBalance + price,
            reason: 'Freeze credits for SMSPVA purchase',
            created_at: new Date().toISOString()
        })

        if (ledgerError) {
            console.error('❌ [BUY-SMSPVA] Failed to create ledger entry:', ledgerError)
            await supabaseClient.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
            throw new Error('Failed to create ledger entry')
        }

        // 4. Freeze credits
        const { error: freezeError } = await supabaseClient.from('users').update({
            frozen_balance: frozenBalance + price
        }).eq('id', userId)

        if (freezeError) {
            console.error('❌ [BUY-SMSPVA] Failed to freeze balance:', freezeError)
            await supabaseClient.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
            throw new Error('Failed to freeze balance')
        }

        console.log('🔒 [BUY-SMSPVA] Credits frozen:', price)

        // 5. Buy from SMSPVA API
        // SMSPVA endpoint: GET https://smspva.com/priemnik.php?metod=get_number&country=RU&service=opt4&apikey=XXX
        const buyUrl = `${SMSPVA_BASE_URL}?metod=get_number&country=${smspvaCountry}&service=${smspvaService}&apikey=${SMSPVA_API_KEY}`

        console.log('🌐 [BUY-SMSPVA] API Call:', buyUrl.replace(SMSPVA_API_KEY, '***'))

        const response = await fetch(buyUrl)
        const responseText = await response.text()
        console.log('📥 [BUY-SMSPVA] Raw Response:', responseText)

        // Check for text-based errors first (SMSPVA returns plain text for some errors)
        if (responseText.includes('API KEY NOT FOUND') || responseText.includes('API KEY не получен')) {
            await refundFrozen(supabaseClient, userId, price, txn.id, frozenBalance, 'SMSPVA: Invalid API Key')
            throw new Error('SMSPVA: Invalid or missing API Key. Please check your configuration in Admin > Providers.')
        }
        if (responseText.includes('Недостаточно средств') || responseText.includes('Insufficient funds')) {
            await refundFrozen(supabaseClient, userId, price, txn.id, frozenBalance, 'SMSPVA: Insufficient balance')
            throw new Error('SMSPVA: Insufficient balance on provider account. Please top up your SMSPVA account.')
        }
        if (responseText.includes('Превышено количество') || responseText.includes('exceeded')) {
            await refundFrozen(supabaseClient, userId, price, txn.id, frozenBalance, 'SMSPVA: Rate limit exceeded')
            throw new Error('SMSPVA: Too many requests. Please wait a moment and try again.')
        }

        let data: any
        try {
            data = JSON.parse(responseText)
        } catch (e) {
            console.error('❌ [BUY-SMSPVA] Failed to parse JSON, treating as text error:', responseText)

            // Check if responseText contains known error patterns
            if (responseText.includes('API KEY')) {
                await refundFrozen(supabaseClient, userId, price, txn.id, frozenBalance, `SMSPVA: Invalid API Key`)
                throw new Error('SMSPVA: Invalid or missing API Key. Check your configuration.')
            }
            if (responseText.includes('баланс') || responseText.includes('balance') || responseText.includes('средств')) {
                await refundFrozen(supabaseClient, userId, price, txn.id, frozenBalance, `SMSPVA: Insufficient balance`)
                throw new Error('SMSPVA: Insufficient balance on provider account')
            }

            // Refund frozen
            await refundFrozen(supabaseClient, userId, price, txn.id, frozenBalance, `SMSPVA error: ${responseText.substring(0, 100)}`)
            throw new Error(`SMSPVA error: ${responseText.substring(0, 200)}`)
        }

        console.log('📥 [BUY-SMSPVA] Parsed Response:', JSON.stringify(data))

        // Check SMSPVA response
        // response=1 = success, response=2 = no numbers, others = error
        // Also check for text-based error messages
        if (data.response !== '1' && data.response !== 1) {
            let errorMsg = ''

            // Check if response is a text error message
            if (typeof data === 'string') {
                errorMsg = data
            } else if (data.response === 'error' || data.response === 'Error') {
                // SMSPVA sometimes returns {"response": "error", "message": "..."}
                // Include all fields for debugging
                errorMsg = data.message || data.error || data.text || data.errorMsg || `Unknown API error (service=${smspvaService}, country=${smspvaCountry}, response=${JSON.stringify(data).substring(0, 100)})`
            } else {
                errorMsg = getSmspvaErrorMessage(data.response)
            }

            console.error('❌ [BUY-SMSPVA] API Error:', errorMsg, 'Request params:', { smspvaService, smspvaCountry }, 'Full response:', JSON.stringify(data))

            await refundFrozen(supabaseClient, userId, price, txn.id, frozenBalance, `SMSPVA error: ${errorMsg}`)
            throw new Error(`SMSPVA: ${errorMsg}`)
        }

        // Success - Extract data
        const orderId = data.id.toString()
        let phone = data.number

        // Normalize Phone Number: Prepend prefix if missing
        try {
            // Retrieve prefix from Static Map (More reliable than DB)
            const prefix = COUNTRY_PREFIX_MAP[smspvaCountry]

            if (prefix) {
                // If phone doesn't start with prefix, add it.
                // Note: Be careful with RU (7) vs 8. SMSPVA might send 900xxxx. 
                if (!phone.startsWith(prefix)) {
                    phone = `${prefix}${phone}`
                    console.log(`🔧 [BUY-SMSPVA] Normalized phone: ${data.number} -> ${phone} (Prefix: ${prefix})`)
                }
            } else {
                console.log(`⚠️ [BUY-SMSPVA] No prefix mapping for ${smspvaCountry}, skipping normalization.`)
            }
        } catch (err) {
            console.warn('⚠️ [BUY-SMSPVA] Failed normalisation:', err)
        }

        const expiresAt = new Date(Date.now() + 20 * 60 * 1000) // 20 minutes (Standard timeout)

        // 6. Create activation record
        const { data: activation, error: actError } = await supabaseClient
            .from('activations')
            .insert({
                user_id: userId,
                order_id: orderId,
                phone: phone,
                service_code: product,
                country_code: country,
                operator: operator || 'any',
                price: price,
                frozen_amount: price,
                status: 'pending',
                expires_at: expiresAt.toISOString(),
                provider: 'smspva'
            })
            .select()
            .single()

        if (actError) {
            console.error('❌ [BUY-SMSPVA] DB Save Error:', actError)

            // Rollback: Refund and try to cancel on SMSPVA
            await refundFrozen(supabaseClient, userId, price, txn.id, frozenBalance, `Activation save failed: ${actError.message}`)

            // Try to cancel on SMSPVA
            try {
                await fetch(`${SMSPVA_BASE_URL}?metod=denial&country=${smspvaCountry}&service=${smspvaService}&id=${orderId}&apikey=${SMSPVA_API_KEY}`)
            } catch (e) {
                console.error('⚠️ [BUY-SMSPVA] Failed to cancel on SMSPVA:', e)
            }

            throw new Error('Failed to save activation')
        }

        // Link transaction
        await supabaseClient.from('transactions').update({ related_activation_id: activation.id }).eq('id', txn.id)

        console.log('✅ [BUY-SMSPVA] Success:', { activation_id: activation.id, phone, orderId })

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    id: activation.id,
                    activation_id: orderId,
                    phone: phone,
                    service: product,
                    country: country,
                    price: price,
                    status: 'pending',
                    expires: expiresAt.toISOString(),
                    provider: 'smspva'
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [BUY-SMSPVA] Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || String(error)
            }),
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

// Helper: Get SMSPVA error message
function getSmspvaErrorMessage(responseCode: string | number): string {
    const errorMap: Record<string, string> = {
        '2': 'NO_NUMBERS - Numbers are already taken, try again in 60 seconds',
        '3': 'NO_SMS - No SMS or invalid request ID',
        '5': 'RATE_LIMIT - Too many requests per minute',
        '6': 'BANNED - Account banned for 10 minutes (negative karma)',
        '7': 'MAX_CONCURRENT - Too many concurrent streams',
    }
    return errorMap[responseCode.toString()] || `Unknown error: ${responseCode}`
}
