// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ONLINESIM_BASE_URL = 'https://onlinesim.io/api'

// OnlineSIM uses phone country codes (different from SMS-Activate IDs)
const COUNTRY_CODE_MAP: Record<string, number> = {
    'russia': 7, 'ru': 7,
    'ukraine': 380, 'ua': 380,
    'kazakhstan': 77, 'kz': 77,
    'usa': 1, 'us': 1,
    'england': 44, 'uk': 44, 'gb': 44,
    'india': 91, 'in': 91,
    'indonesia': 62, 'id': 62,
    'philippines': 63, 'ph': 63,
    'poland': 48, 'pl': 48,
    'germany': 49, 'de': 49,
    'france': 33, 'fr': 33,
    'spain': 34, 'es': 34,
    'italy': 39, 'it': 39,
    'brazil': 55, 'br': 55,
    'mexico': 52, 'mx': 52,
    'canada': 1, 'ca': 1,
    'australia': 61, 'au': 61,
}

const mapCountryCode = (country: string | number): number => {
    if (typeof country === 'number') return country
    const trimmed = (country || '').toString().trim().toLowerCase()
    return COUNTRY_CODE_MAP[trimmed] || 7 // Default: Russia
}

// Rent duration mapping: convert hours to days
const HOURS_TO_DAYS: Record<number, number> = {
    4: 1,      // 4 hours → 1 day (minimum for OnlineSIM)
    24: 1,     // 1 day
    48: 2,     // 2 days
    72: 3,     // 3 days
    168: 7,    // 1 week
    720: 30,   // 1 month
}

const mapHoursToDays = (hours: number): number => {
    return HOURS_TO_DAYS[hours] || Math.max(1, Math.ceil(hours / 24))
}

serve(async (req) => {
    console.log('🟢 [BUY-ONLINESIM-RENT] Function called')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const authHeader = req.headers.get('Authorization') ?? ''

        // Admin client with SERVICE_ROLE_KEY
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // Extract and verify user from JWT token
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Unauthorized - No token provided')
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) {
            console.error('❌ [BUY-ONLINESIM-RENT] Auth error:', authError?.message)
            throw new Error('Unauthorized')
        }

        const { country, product, userId, duration = '4hours', expectedPrice, rentHours } = await req.json()

        console.log('🟢 [BUY-ONLINESIM-RENT] Request:', { country, product, userId, duration, rentHours, expectedPrice })

        // Get OnlineSIM API key
        let ONLINESIM_API_KEY = Deno.env.get('ONLINESIM_API_KEY')

        const { data: onlinesimSetting } = await supabaseAdmin
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

        // Convert hours to days for OnlineSIM
        const hours = rentHours || 4
        const days = mapHoursToDays(hours)

        console.log(`🟢 [BUY-ONLINESIM-RENT] Converting ${hours}h → ${days} days`)

        // Get service info
        let serviceName = product
        const { data: serviceData } = await supabaseAdmin
            .from('services')
            .select('*')
            .eq('code', product)
            .single()

        if (serviceData) {
            serviceName = serviceData.name
        }

        const onlinesimCountry = mapCountryCode(country)

        // Get price from OnlineSIM tariffs
        let price = expectedPrice || 0

        if (!price || price <= 0) {
            try {
                const tariffsUrl = `${ONLINESIM_BASE_URL}/rent.tar.php?apikey=${ONLINESIM_API_KEY}&country=${onlinesimCountry}&days=${days}&type=list`
                const tariffsResponse = await fetch(tariffsUrl)
                const tariffsData = await tariffsResponse.json()

                console.log('💰 [BUY-ONLINESIM-RENT] Tariffs:', tariffsData)

                if (tariffsData[product]) {
                    price = parseFloat(tariffsData[product].price || '0')
                }
            } catch (e) {
                console.warn('⚠️ [BUY-ONLINESIM-RENT] Could not fetch tariffs:', e)
            }
        }

        if (!price || price <= 0) {
            throw new Error(`Rent not available for ${serviceName} in ${country} for ${days} days`)
        }

        console.log(`💰 [BUY-ONLINESIM-RENT] Final rent price: $${price} for ${days} days`)

        // Check user balance
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('balance, frozen_balance')
            .eq('id', userId)
            .single()

        if (profileError || !userProfile) {
            throw new Error('User profile not found')
        }

        if (userProfile.balance < price) {
            throw new Error(`Insufficient balance. Required: ${price}Ⓐ, Available: ${userProfile.balance}Ⓐ`)
        }

        // Rent number from OnlineSIM
        const rentUrl = `${ONLINESIM_BASE_URL}/rent.tar.php?apikey=${ONLINESIM_API_KEY}&service=${product}&country=${onlinesimCountry}&days=${days}`

        console.log('🌐 [BUY-ONLINESIM-RENT] API Call:', rentUrl.replace(ONLINESIM_API_KEY, 'KEY_HIDDEN'))

        const rentResponse = await fetch(rentUrl)
        const rentData = await rentResponse.json()

        console.log('📥 [BUY-ONLINESIM-RENT] API Response:', rentData)

        if (rentData.response !== 1 && rentData.response !== '1') {
            const errorMsg = rentData.response === 'NO_NUMBERS'
                ? `No numbers available for ${serviceName} in ${country}. Try again later.`
                : rentData.response === 'NO_BALANCE'
                    ? 'Insufficient balance on OnlineSIM provider'
                    : `OnlineSIM error: ${rentData.response}`
            throw new Error(errorMsg)
        }

        const { tzid, number, end_date } = rentData

        // Calculate end_date (OnlineSIM format may vary, normalize to ISO)
        let normalizedEndDate: string
        try {
            normalizedEndDate = new Date(end_date).toISOString()
        } catch (e) {
            // Fallback: current time + days
            normalizedEndDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        }

        console.log('📞 [BUY-ONLINESIM-RENT] Number rented:', {
            tzid,
            number,
            end_date: normalizedEndDate,
            price,
            days
        })

        // Create rental record
        const { data: rental, error: rentalError } = await supabaseAdmin
            .from('rentals')
            .insert({
                user_id: userId,
                rent_id: tzid.toString(),
                rental_id: tzid.toString(),
                phone: number,
                service_code: product,
                country_code: country,
                operator: 'auto',
                total_cost: price,
                hourly_rate: price / (days * 24),
                status: 'active',
                end_date: normalizedEndDate,
                expires_at: normalizedEndDate,
                rent_hours: days * 24,
                duration_hours: days * 24,
                provider: 'onlinesim',
                message_count: 0,
                frozen_amount: 0  // Will be updated by secure_freeze_balance
            })
            .select()
            .single()

        if (rentalError) {
            console.error('❌ [BUY-ONLINESIM-RENT] Failed to create rental:', rentalError)

            // Try to cancel on OnlineSIM
            try {
                await fetch(`${ONLINESIM_BASE_URL}/setOperationOk.php?apikey=${ONLINESIM_API_KEY}&tzid=${tzid}`)
            } catch (e) {
                console.error('Failed to cancel rent on OnlineSIM:', e)
            }

            throw new Error(`Failed to create rental record: ${rentalError.message}`)
        }

        console.log('✅ [BUY-ONLINESIM-RENT] Rental created:', rental.id)

        // Freeze balance atomically
        const { data: freezeResult, error: freezeError } = await supabaseAdmin.rpc('secure_freeze_balance', {
            p_user_id: userId,
            p_amount: price,
            p_rental_id: rental.id,
            p_reason: `OnlineSIM rent ${serviceName} ${country} (${days}d)`
        })

        if (freezeError || !freezeResult?.success) {
            console.error('❌ [BUY-ONLINESIM-RENT] secure_freeze_balance failed:', freezeError || freezeResult)

            // Rollback: Cancel rent on OnlineSIM
            try {
                await fetch(`${ONLINESIM_BASE_URL}/setOperationOk.php?apikey=${ONLINESIM_API_KEY}&tzid=${tzid}`)
            } catch (e) {
                console.error('Failed to cancel rent after freeze failure:', e)
            }

            // Delete rental record
            await supabaseAdmin.from('rentals').delete().eq('id', rental.id)

            throw new Error(freezeResult?.error || freezeError?.message || 'Failed to freeze balance')
        }

        console.log('✅ [BUY-ONLINESIM-RENT] Balance frozen:', freezeResult)

        // Create transaction
        await supabaseAdmin
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'rental',
                amount: -price,
                description: `OnlineSIM Rent ${serviceName} in ${country} for ${days} days`,
                status: 'pending',
                related_rental_id: rental.id,
                balance_before: userProfile.balance,
                balance_after: userProfile.balance
            })

        console.log('✅ [BUY-ONLINESIM-RENT] Success')

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    id: rental.id,
                    rental_id: tzid,
                    rent_id: tzid,
                    phone: number,
                    service: product,
                    country: country,
                    price: price,
                    total_cost: price,
                    status: 'active',
                    expires: normalizedEndDate,
                    end_date: normalizedEndDate,
                    duration_hours: days * 24,
                    rent_hours: days * 24,
                    provider: 'onlinesim'
                }
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error: any) {
        console.error('❌ [BUY-ONLINESIM-RENT] Error:', error)
        console.error('❌ [BUY-ONLINESIM-RENT] Error stack:', error.stack)

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || String(error),
                details: error.stack || error.toString()
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
