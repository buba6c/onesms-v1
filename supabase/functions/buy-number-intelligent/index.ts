// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMSPoolClient } from '../_shared/smspool.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HEROSMS_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'
const FIVESIM_BASE_URL = 'https://5sim.net/v1'
const SMSPVA_BASE_URL = 'https://smspva.com/priemnik.php'
const ONLINESIM_BASE_URL = 'https://onlinesim.io/api'
const GRIZZLY_BASE_URL = 'https://api.grizzlysms.com/stubs/handler_api.php'
const TEXTVERIFIED_BASE_URL = 'https://www.textverified.com/api'

// Provider priority order - UPDATED: 5sim → grizzly → others
// TextVerified inserted AT START dynamically for USA countries
const DEFAULT_PROVIDER_PRIORITY = ['5sim', 'grizzly', 'sms-activate', 'onlinesim']

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

        // 🟢 SERVICE-SPECIFIC ROUTING OVERRIDE (PRIORITY WITH FALLBACK)
        const productLower = product?.toLowerCase() || ''

        // 1. Premium Check (TextVerified for WhatsApp/TikTok + US/UK)
        const isPremiumService = productLower === 'wa' || productLower === 'whatsapp' || productLower === 'tiktok' || productLower === 'lf'
        const isPremiumCountry = ['usa', 'us', 'united kingdom', 'uk', 'england'].includes(country.toLowerCase())

        if (isPremiumService && isPremiumCountry) {
            console.log('💎 [INTELLIGENT-BUY] Premium Service/Country detected → Prioritizing TextVerified')
            const tvKey = apiKeys['textverified_api_key'] // Use API key directly from map
            const tvUser = apiKeys['textverified_api_username']

            // Only try if configured
            if (tvKey && tvUser) {
                // Check TV Availability
                const checkRes = await checkTextVerified(tvKey, tvUser, country, product)
                if (checkRes.success) {
                    console.log('✅ [INTELLIGENT-BUY] TextVerified available → Using Premium')
                    return redirectToProvider('buy-textverified-number', 'textverified', body)
                } else {
                    console.log('⚠️ [INTELLIGENT-BUY] TextVerified unavailable → Falling back')
                }
            } else {
                console.log('⚠️ [INTELLIGENT-BUY] TextVerified not configured for Premium → Falling back')
            }
        }

        // 2. WhatsApp Priority (5sim) if NOT Premium routing
        if (productLower === 'wa' || productLower === 'whatsapp') {
            console.log('🟢 [INTELLIGENT-BUY] WhatsApp detected → Prioritizing 5sim')
            const fivesimKey = apiKeys['5sim']
            if (fivesimKey) {
                console.log('🔄 [INTELLIGENT-BUY] Checking 5sim availability for WhatsApp...')
                const checkResult = await checkProviderAvailability('5sim', fivesimKey, country, product, '')
                if (checkResult.success) {
                    console.log('✅ [INTELLIGENT-BUY] 5sim has WhatsApp stock → Using 5sim')
                    return redirectToProvider('buy-5sim-number', '5sim', body)
                }
            }
        }

        // Get provider priority from settings
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

        // 🔧 DYNAMIC PROVIDER PRIORITY
        const isUSACountry = ['usa', 'us', 'united states', '12'].includes(country.toLowerCase())
        const isEurope = ['france', 'germany', 'united kingdom', 'netherlands', 'spain', 'italy'].includes(country.toLowerCase()) || country.toLowerCase().includes('europe')

        // Override priority based on region
        if (isUSACountry) {
            // USA: SMSPool (Premium) -> TextVerified -> 5sim (Cheap)
            providerPriority = ['smspool', 'textverified', '5sim', 'sms-activate', 'grizzly']
            console.log('🇺🇸 [INTELLIGENT-BUY] USA detected → Priority:', providerPriority)
        } else if (isEurope) {
            // Europe: SMSPool (Real SIM) -> 5sim (Cheap) -> Grizzly
            providerPriority = ['smspool', '5sim', 'grizzly', 'sms-activate', 'onlinesim']
            console.log('🇪🇺 [INTELLIGENT-BUY] Europe detected → Priority:', providerPriority)
        } else {
            // Rest of World: SMSPool -> 5sim (Cheap) -> Grizzly
            providerPriority = ['smspool', '5sim', 'grizzly', 'sms-activate', 'onlinesim']
            console.log('🌍 [INTELLIGENT-BUY] Rest of World → Priority:', providerPriority)
        }

        // Direct provider mode
        if (providerMode !== 'intelligent' && providerMode !== 'smart') {
            console.log(`🧠 [INTELLIGENT-BUY] Direct ${providerMode} mode`)
            const directFn = getProviderFunction(providerMode)
            return redirectToProvider(directFn, providerMode, body)
        }

        // Intelligent/Smart mode: Try providers in priority order
        console.log('🧠 [INTELLIGENT-BUY] Smart mode - provider priority:', providerPriority)

        for (const provider of providerPriority) {
            // Need to handle composite keys or usernames for some providers?
            // For now assume single key mostly, but maybe TV needs 2
            const apiKey = getApiKeyForProvider(provider, apiKeys)
            const apiUser = provider === 'textverified' ? apiKeys['textverified_api_username'] : ''

            if (!apiKey) {
                console.log(`⏭️ [INTELLIGENT-BUY] Skipping ${provider} - no API key`)
                continue
            }

            console.log(`🔄 [INTELLIGENT-BUY] Trying ${provider}...`)

            const checkResult = await checkProviderAvailability(provider, apiKey, country, product, apiUser)

            if (checkResult.success) {
                console.log(`✅ [INTELLIGENT-BUY] ${provider} has stock`)
                return redirectToProvider(getProviderFunction(provider), provider, body)
            }

            if (isStockError(checkResult.error)) {
                console.log(`⚠️ [INTELLIGENT-BUY] ${provider} no stock: ${checkResult.error}`)
                continue // Try next provider
            }

            // Other error
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

// --- HELPERS ---

async function getApiKeys(supabase: any) {
    const keys: Record<string, string> = {}

    // Helper to fetch
    const fetchKey = async (name: string, envName: string) => {
        const { data } = await supabase.from('system_settings').select('value').eq('key', name).single()
        return data?.value || Deno.env.get(envName) || ''
    }

    keys.herosms = await fetchKey('sms_activate_api_key', 'SMS_ACTIVATE_API_KEY')
    keys['5sim'] = await fetchKey('5sim_api_key', 'FIVESIM_API_KEY')
    keys.smspva = await fetchKey('smspva_api_key', 'SMSPVA_API_KEY')
    keys.onlinesim = await fetchKey('onlinesim_api_key', 'ONLINESIM_API_KEY')
    keys.grizzly = await fetchKey('grizzly_api_key', 'GRIZZLY_API_KEY')
    keys.textverified_api_key = await fetchKey('textverified_api_key', 'TEXTVERIFIED_API_KEY')
    keys.textverified_api_username = await fetchKey('textverified_api_username', 'TEXTVERIFIED_API_USERNAME')
    keys.smspool = await fetchKey('smspool_api_key', 'SMSPOOL_API_KEY')

    return keys
}

function getApiKeyForProvider(provider: string, keys: Record<string, string>): string | undefined {
    if (provider === 'textverified') return keys['textverified_api_key']
    if (provider === 'sms-activate') return keys.herosms
    return keys[provider.toLowerCase()]
}

function getProviderFunction(provider: string): string {
    const functionMap: Record<string, string> = {
        'herosms': 'buy-sms-activate-number',
        'sms-activate': 'buy-sms-activate-number',
        '5sim': 'buy-5sim-number',
        'smspva': 'buy-smspva-number',
        'onlinesim': 'buy-onlinesim-number',
        'grizzly': 'buy-grizzly-number',
        'grizzly': 'buy-grizzly-number',
        'textverified': 'buy-textverified-number',
        'smspool': 'buy-smspool-number'
    }
    return functionMap[provider.toLowerCase()] || 'buy-sms-activate-number'
}

async function checkProviderAvailability(
    provider: string,
    apiKey: string,
    country: string,
    service: string,
    apiUser: string = ''
): Promise<{ success: boolean, error?: string }> {
    try {
        switch (provider.toLowerCase()) {
            case 'herosms':
            case 'sms-activate':
                return await checkHeroSms(apiKey, country, service)
            case 'grizzly':
                return await checkGrizzlySms(apiKey, country, service)
            case 'textverified':
                return await checkTextVerified(apiKey, apiUser, country, service)
            case '5sim':
                return await check5sim(apiKey, country, service)
            case 'smspva':
                return await checkSmspva(apiKey, country, service)
            case 'onlinesim':
                return await checkOnlinesim(apiKey, country, service)
            case 'onlinesim':
                return await checkOnlinesim(apiKey, country, service)
            case 'smspool':
                return await checkSmspool(apiKey, country, service)
            default:
                return { success: false, error: `Unknown provider check: ${provider}` }
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

async function checkTextVerified(apiKey: string, apiUser: string, country: string, service: string): Promise<{ success: boolean, error?: string }> {
    try {
        // 1. Auth (V2)
        const authRes = await fetch(`${TEXTVERIFIED_BASE_URL}/pub/v2/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey, api_username: apiUser })
        })
        if (!authRes.ok) return { success: false, error: 'Auth failed' }
        const authData = await authRes.json()
        const token = authData.bearer_token

        if (!token) return { success: false, error: 'No token' }

        // 2. Check Targets (Search by name)
        const targetRes = await fetch(`${TEXTVERIFIED_BASE_URL}/Targets`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const targets = await targetRes.json()
        const found = targets.find((t: any) => t.name.toLowerCase().includes(service.toLowerCase()))

        if (found && found.status !== 'Inactive') {
            return { success: true }
        }
        return { success: false, error: 'Service not found or inactive' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

async function checkGrizzlySms(apiKey: string, country: string, service: string): Promise<{ success: boolean, error?: string }> {
    try {
        const url = `${GRIZZLY_BASE_URL}?api_key=${apiKey}&action=getNumbersStatus&country=${country}&service=${service}`
        const response = await fetch(url)
        const text = await response.text()

        try {
            const data = JSON.parse(text)
            if (data[service] && parseInt(data[service]) > 0) return { success: true }
        } catch (e) { }

        if (text.includes('NO_NUMBERS') || text.includes('NO_BALANCE') || text.includes('BAD_KEY')) {
            return { success: false, error: text }
        }
        return { success: false, error: 'NO_NUMBERS' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

async function checkHeroSms(apiKey: string, country: string, service: string): Promise<{ success: boolean, error?: string }> {
    try {
        const url = `${HEROSMS_BASE_URL}?api_key=${apiKey}&action=getNumbersStatus&country=${country}&service=${service}`
        const response = await fetch(url)
        const text = await response.text()
        if (text.includes('NO_NUMBERS')) return { success: false, error: text }
        try {
            const data = JSON.parse(text)
            const key = Object.keys(data)[0]
            if (key && data[key]?.count > 0) return { success: true }
        } catch (e) {
            if (!text.includes('ERROR')) return { success: true }
        }
        return { success: false, error: 'NO_NUMBERS' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

async function check5sim(apiKey: string, country: string, service: string): Promise<{ success: boolean, error?: string }> {
    try {
        const url = `${FIVESIM_BASE_URL}/guest/prices?country=${country}&product=${service}`
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } })
        const data = await response.json()
        if (data.error) return { success: false, error: data.error }

        const countryData = data[country]
        if (countryData && countryData[service]) {
            for (const op of Object.values(countryData[service]) as any[]) {
                if (op.count > 0) return { success: true }
            }
        }
        return { success: false, error: 'NO_NUMBERS' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

async function checkSmspva(apiKey: string, country: string, service: string): Promise<{ success: boolean, error?: string }> {
    try {
        const smspvaCountry = country.toUpperCase().substring(0, 2)
        const smspvaService = `opt${service}`
        const url = `${SMSPVA_BASE_URL}?metod=get_count_new&country=${smspvaCountry}&service=${smspvaService}&apikey=${apiKey}`
        const response = await fetch(url)
        const text = await response.text()
        try {
            const data = JSON.parse(text)
            if (data.response == '1' && parseInt(data.count) > 0) return { success: true }
        } catch (e) { }
        return { success: false, error: 'NO_NUMBERS' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

async function checkOnlinesim(apiKey: string, country: string, service: string): Promise<{ success: boolean, error?: string }> {
    try {
        const url = `${ONLINESIM_BASE_URL}/getTariffs.php?apikey=${apiKey}&country=${country}`
        const response = await fetch(url)
        const data = await response.json()
        if (data.response === 'ERROR_WRONG_KEY') return { success: false, error: data.response }
        if (data[service] && data[service].count > 0) return { success: true }
        return { success: false, error: 'NO_NUMBERS' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

async function checkSmspool(apiKey: string, country: string, service: string): Promise<{ success: boolean, error?: string }> {
    try {
        // SMSPool doesn't have a lightweight check API that fits here perfectly without making heavy calls.
        // We assume availability if key is present to let the specific function handle the purchase attempt.
        // This reduces latency in the cascade check loop.
        if (apiKey && apiKey.length > 10) return { success: true }
        return { success: false, error: 'NO_KEY' }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

function isStockError(error?: string): boolean {
    if (!error) return false
    const stockErrors = ['NO_NUMBERS', 'NO_BALANCE', 'EMPTY_COUNTRY', 'NOT_AVAILABLE', 'no free phones', 'response":"2']
    return stockErrors.some(e => error.toUpperCase().includes(e.toUpperCase()))
}

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
