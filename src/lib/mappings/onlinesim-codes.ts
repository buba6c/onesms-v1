/**
 * OnlineSIM Service and Country Code Mappings
 */

// ============================================================================
// SERVICE CODES
// ============================================================================

export const ONLINESIM_SERVICE_MAP: Record<string, string> = {
    // Full names (OnlineSIM uses service names directly)
    'google': 'google',
    'whatsapp': 'whatsapp',
    'telegram': 'telegram',
    'facebook': 'facebook',
    'instagram': 'instagram',
    'twitter': 'twitter',
    'discord': 'discord',
    'microsoft': 'microsoft',
    'yahoo': 'yahoo',
    'amazon': 'amazon',
    'netflix': 'netflix',
    'uber': 'uber',
    'tiktok': 'tiktok',
    'snapchat': 'snapchat',
    'linkedin': 'linkedin',
    'viber': 'viber',
    'wechat': 'wechat',
    'line': 'line',
    'tinder': 'tinder',
    'paypal': 'paypal',
    'steam': 'steam',
    'apple': 'apple',
    'spotify': 'spotify',
    'airbnb': 'airbnb',
    'aliexpress': 'aliexpress',
    'ebay': 'ebay',

    // Short codes (SMS-Activate style)
    'go': 'google',
    'wa': 'whatsapp',
    'tg': 'telegram',
    'fb': 'facebook',
    'ig': 'instagram',
    'tw': 'twitter',
    'ds': 'discord',
    'mm': 'microsoft',
    'mb': 'yahoo',
    'am': 'amazon',
    'nf': 'netflix',
    'ub': 'uber',
    'tk': 'tiktok',
    'sn': 'snapchat',
    'ld': 'linkedin',
    'vi': 'viber',
    'we': 'wechat',
    'lf': 'line',
    'oi': 'tinder',
    'ts': 'paypal',
    'wx': 'apple',
}

// ============================================================================
// COUNTRY CODES
// ============================================================================

// OnlineSIM uses phone country codes (numbers)
export const ONLINESIM_COUNTRY_MAP: Record<string, number> = {
    'russia': 7,
    'ukraine': 380,
    'kazakhstan': 77,
    'usa': 1,
    'unitedstates': 1,
    'england': 44,
    'uk': 44,
    'unitedkingdom': 44,
    'india': 91,
    'indonesia': 62,
    'philippines': 63,
    'myanmar': 95,
    'vietnam': 84,
    'thailand': 66,
    'malaysia': 60,
    'singapore': 65,
    'china': 86,
    'hongkong': 852,
    'taiwan': 886,
    'japan': 81,
    'southkorea': 82,
    'korea': 82,

    // Europe
    'poland': 48,
    'germany': 49,
    'france': 33,
    'spain': 34,
    'italy': 39,
    'netherlands': 31,
    'belgium': 32,
    'portugal': 351,
    'romania': 40,
    'czechrepublic': 420,
    'austria': 43,
    'sweden': 46,
    'norway': 47,
    'denmark': 45,
    'finland': 358,
    'ireland': 353,
    'greece': 30,
    'hungary': 36,
    'switzerland': 41,

    // Americas
    'canada': 1,
    'mexico': 52,
    'brazil': 55,
    'argentina': 54,
    'colombia': 57,
    'chile': 56,
    'peru': 51,

    // Africa & Middle East
    'nigeria': 234,
    'kenya': 254,
    'southafrica': 27,
    'egypt': 20,
    'morocco': 212,
    'turkey': 90,
    'saudiarabia': 966,
    'uae': 971,
    'israel': 972,

    // Oceania
    'australia': 61,
    'newzealand': 64,
}

export const ONLINESIM_COUNTRY_REVERSE_MAP: Record<number, string> =
    Object.fromEntries(Object.entries(ONLINESIM_COUNTRY_MAP).map(([k, v]) => [v, k]))

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getOnlinesimServiceCode(commonCode: string): string {
    const lower = commonCode.toLowerCase()
    return ONLINESIM_SERVICE_MAP[lower] || lower
}

export function getOnlinesimCountryCode(commonName: string): number {
    const lower = commonName.toLowerCase().replace(/[^a-z]/g, '')
    return ONLINESIM_COUNTRY_MAP[lower] || 7
}

export function getCommonCountryName(onlinesimCode: number): string {
    return ONLINESIM_COUNTRY_REVERSE_MAP[onlinesimCode] || `country_${onlinesimCode}`
}

export default {
    ONLINESIM_SERVICE_MAP,
    ONLINESIM_COUNTRY_MAP,
    ONLINESIM_COUNTRY_REVERSE_MAP,
    getOnlinesimServiceCode,
    getOnlinesimCountryCode,
    getCommonCountryName,
}
