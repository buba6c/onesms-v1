import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HEROSMS_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'
const FIVESIM_BASE_URL = 'https://5sim.net/v1'
const SMSPVA_BASE_URL = 'https://smspva.com/priemnik.php'
const ONLINESIM_BASE_URL = 'https://onlinesim.io/api'

// Provider priority order (default)
const DEFAULT_PROVIDER_PRIORITY = ['herosms', '5sim', 'smspva', 'onlinesim']

/**
 * Intelligent Buy Number - Tries providers in priority order with automatic fallback
 * Supported providers: HeroSMS, 5sim, SMSPVA, OnlineSIM
 */
serve(async (req) => {
    console.log('🧠 [INTELLIGENT-BUY] Function called')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body = await req.json()
        const { country, operator, product, userId, expectedPrice } = body

        console.log('🧠 [INTELLIGENT-BUY] Request:', { country, product, expectedPrice })

        // Get provider mode
        const { data: modeSetting } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', 'sms_provider_mode')
            .single()

        const providerMode = modeSetting?.value || 'intelligent'

        // Get all API keys
        const apiKeys = await getApiKeys(supabaseClient)

        // Get provider priority (if configured)
        const { data: prioritySetting } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', 'provider_priority')
            .single()

        let providerPriority = DEFAULT_PROVIDER_PRIORITY
        try {
            if (prioritySetting?.value) {
                providerPriority = JSON.parse(prioritySetting.value)
            }
        } catch (e) {
            console.log('⚠️ [INTELLIGENT-BUY] Could not parse provider priority, using default')
        }

        // Direct provider mode (no fallback)
        if (providerMode === '5sim') {
            console.log('🧠 [INTELLIGENT-BUY] Direct 5sim mode')
            return redirectToProvider('buy-5sim-number', '5sim', body)
        }

        if (providerMode === 'sms-activate' || providerMode === 'herosms') {
            console.log('🧠 [INTELLIGENT-BUY] Direct HeroSMS mode')
            return redirectToProvider('buy-sms-activate-number', 'herosms', body)
        }

        if (providerMode === 'smspva') {
            console.log('🧠 [INTELLIGENT-BUY] Direct SMSPVA mode')
            return redirectToProvider('buy-smspva-number', 'smspva', body)
        }

        if (providerMode === 'onlinesim') {
            console.log('🧠 [INTELLIGENT-BUY] Direct OnlineSIM mode')
            return redirectToProvider('buy-onlinesim-number', 'onlinesim', body)
        }

        // Intelligent/Smart mode: Try providers in priority order
        console.log('🧠 [INTELLIGENT-BUY] Smart mode - provider priority:', providerPriority)

        for (const provider of providerPriority) {
            const apiKey = getApiKeyForProvider(provider, apiKeys)
            if (!apiKey) {
                console.log(`⏭️ [INTELLIGENT-BUY] Skipping ${provider} - no API key`)
                continue
            }

            console.log(`🔄 [INTELLIGENT-BUY] Trying ${provider}...`)

            const checkResult = await checkProviderAvailability(provider, apiKey, country, product)

            if (checkResult.success) {
                console.log(`✅ [INTELLIGENT-BUY] ${provider} has stock`)
                return redirectToProvider(getProviderFunction(provider), provider, body)
            }

            if (isStockError(checkResult.error)) {
                console.log(`⚠️ [INTELLIGENT-BUY] ${provider} no stock: ${checkResult.error}`)
                continue // Try next provider
            }

            // Other error (not stock related) - still try next provider but log it
            console.log(`❌ [INTELLIGENT-BUY] ${provider} error: ${checkResult.error}`)
        }

        // All providers exhausted
        return new Response(
            JSON.stringify({
                success: false,
                error: 'No numbers available from any provider. Please try again later or select a different country/service.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )

    } catch (error: any) {
        console.error('❌ [INTELLIGENT-BUY] Error:', error.message)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})

/**
 * Get all API keys from settings and env
 */
async function getApiKeys(supabase: any) {
    const keys: Record<string, string> = {}

    // HeroSMS
    keys.herosms = Deno.env.get('SMS_ACTIVATE_API_KEY') || ''
    const { data: heroKey } = await supabase.from('system_settings').select('value').eq('key', 'sms_activate_api_key').single()
    if (heroKey?.value) keys.herosms = heroKey.value

    // 5sim
    keys['5sim'] = Deno.env.get('FIVESIM_API_KEY') || ''
    const { data: fivesimKey } = await supabase.from('system_settings').select('value').eq('key', '5sim_api_key').single()
    if (fivesimKey?.value) keys['5sim'] = fivesimKey.value

    // SMSPVA
    keys.smspva = Deno.env.get('SMSPVA_API_KEY') || ''
    const { data: smspvaKey } = await supabase.from('system_settings').select('value').eq('key', 'smspva_api_key').single()
    if (smspvaKey?.value) keys.smspva = smspvaKey.value

    // OnlineSIM
    keys.onlinesim = Deno.env.get('ONLINESIM_API_KEY') || ''
    const { data: onlinesimKey } = await supabase.from('system_settings').select('value').eq('key', 'onlinesim_api_key').single()
    if (onlinesimKey?.value) keys.onlinesim = onlinesimKey.value

    return keys
}

/**
 * Get API key for a specific provider
 */
function getApiKeyForProvider(provider: string, keys: Record<string, string>): string | undefined {
    const key = keys[provider.toLowerCase()]
    return key && key.length > 0 ? key : undefined
}

/**
 * Get the Edge Function name for a provider
 */
function getProviderFunction(provider: string): string {
    const functionMap: Record<string, string> = {
        'herosms': 'buy-sms-activate-number',
        'sms-activate': 'buy-sms-activate-number',
        '5sim': 'buy-5sim-number',
        'smspva': 'buy-smspva-number',
        'onlinesim': 'buy-onlinesim-number'
    }
    return functionMap[provider.toLowerCase()] || 'buy-sms-activate-number'
}

/**
 * Check if a provider has availability for service/country
 */
async function checkProviderAvailability(
    provider: string,
    apiKey: string,
    country: string,
    service: string
): Promise<{ success: boolean, error?: string }> {
    try {
        switch (provider.toLowerCase()) {
            case 'herosms':
            case 'sms-activate':
                return await checkHeroSms(apiKey, country, service)
            case '5sim':
                return await check5sim(apiKey, country, service)
            case 'smspva':
                return await checkSmspva(apiKey, country, service)
            case 'onlinesim':
                return await checkOnlinesim(apiKey, country, service)
            default:
                return { success: false, error: `Unknown provider: ${provider}` }
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Check HeroSMS availability
 */
async function checkHeroSms(apiKey: string, country: string, service: string): Promise<{ success: boolean, error?: string }> {
    try {
        const url = `${HEROSMS_BASE_URL}?api_key=${apiKey}&action=getNumbersStatus&country=${country}&service=${service}`
        const response = await fetch(url)
        const text = await response.text()

        if (text.includes('NO_NUMBERS') || text.includes('NO_BALANCE') || text.includes('BAD')) {
            return { success: false, error: text }
        }

        // Check if there's count > 0
        try {
            const data = JSON.parse(text)
            const key = Object.keys(data)[0]
            if (key && data[key]?.count > 0) {
                return { success: true }
            }
        } catch (e) {
            // Text response - assume available if no error
            if (!text.includes('ERROR')) {
                return { success: true }
            }
        }

        return { success: false, error: 'NO_NUMBERS' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Check 5sim availability
 */
async function check5sim(apiKey: string, country: string, service: string): Promise<{ success: boolean, error?: string }> {
    try {
        const url = `${FIVESIM_BASE_URL}/guest/prices?country=${country}&product=${service}`
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        const data = await response.json()

        if (data.error || data.message?.includes('no prices')) {
            return { success: false, error: data.error || 'NO_NUMBERS' }
        }

        // Check if any operator has count > 0
        const countryData = data[country]
        if (countryData && countryData[service]) {
            for (const op of Object.values(countryData[service]) as any[]) {
                if (op.count > 0) {
                    return { success: true }
                }
            }
        }

        return { success: false, error: 'NO_NUMBERS' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Check SMSPVA availability
 */
async function checkSmspva(apiKey: string, country: string, service: string): Promise<{ success: boolean, error?: string }> {
    try {
        // SMSPVA uses different format - map codes
        const smspvaCountry = country.toUpperCase().substring(0, 2)
        const smspvaService = `opt${service}` // SMSPVA uses opt prefix

        const url = `${SMSPVA_BASE_URL}?metod=get_count_new&country=${smspvaCountry}&service=${smspvaService}&apikey=${apiKey}`
        const response = await fetch(url)
        const text = await response.text()

        try {
            const data = JSON.parse(text)
            if (data.response === '1' || data.response === 1) {
                const count = parseInt(data.count || '0')
                if (count > 0) {
                    return { success: true }
                }
            }
        } catch (e) {
            // Parse error
        }

        return { success: false, error: 'NO_NUMBERS' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Check OnlineSIM availability
 */
async function checkOnlinesim(apiKey: string, country: string, service: string): Promise<{ success: boolean, error?: string }> {
    try {
        const url = `${ONLINESIM_BASE_URL}/getTariffs.php?apikey=${apiKey}&country=${country}`
        const response = await fetch(url)
        const data = await response.json()

        if (data.response === 'ERROR_WRONG_KEY' || data.response === 'ERROR_NO_KEY') {
            return { success: false, error: data.response }
        }

        // Check if service is available
        if (data[service] && data[service].count > 0) {
            return { success: true }
        }

        // Try to find in nested structure
        for (const key of Object.keys(data)) {
            if (key.toLowerCase().includes(service.toLowerCase())) {
                const svc = data[key]
                if (svc?.count > 0 || (typeof svc === 'object' && Object.values(svc).some((v: any) => v?.count > 0))) {
                    return { success: true }
                }
            }
        }

        return { success: false, error: 'NO_NUMBERS' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

/**
 * Check if error is a stock-related error (should try next provider)
 */
function isStockError(error?: string): boolean {
    if (!error) return false
    const stockErrors = ['NO_NUMBERS', 'NO_BALANCE', 'EMPTY_COUNTRY', 'NOT_AVAILABLE', 'no free phones', 'response":"2']
    return stockErrors.some(e => error.toUpperCase().includes(e.toUpperCase()))
}

/**
 * Return redirect response for frontend to call the appropriate provider function
 */
function redirectToProvider(functionName: string, provider: string, body: any): Response {
    return new Response(
        JSON.stringify({
            success: true,
            redirect: functionName,
            provider: provider,
            body
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
}

