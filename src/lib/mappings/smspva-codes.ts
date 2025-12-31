/**
 * SMSPVA Service and Country Code Mappings
 * Used for translating between common codes and SMSPVA-specific codes
 */

// ============================================================================
// SERVICE CODES
// ============================================================================

/**
 * Map common/5sim service codes to SMSPVA service codes (opt format)
 */
export const SMSPVA_SERVICE_MAP: Record<string, string> = {
    // Full names
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
    'outlook': 'opt15',
    'spotify': 'opt19',
    'airbnb': 'opt6',
    'aliexpress': 'opt22',
    'alibaba': 'opt22',
    'ebay': 'opt12',
    'deliveroo': 'opt73',
    'doordash': 'opt74',
    'lyft': 'opt75',
    'grab': 'opt76',
    'gojek': 'opt77',
    'shopee': 'opt78',
    'lazada': 'opt79',
    'tokopedia': 'opt80',
    'bukalapak': 'opt81',

    // Short codes (SMS-Activate style)
    'go': 'opt1',
    'wa': 'opt4',
    'tg': 'opt29',
    'fb': 'opt2',
    'ig': 'opt16',
    'tw': 'opt41',
    'ds': 'opt25',
    'mm': 'opt15',
    'mb': 'opt65',
    'am': 'opt17',
    'nf': 'opt28',
    'ub': 'opt7',
    'tk': 'opt20',
    'sn': 'opt23',
    'ld': 'opt14',
    'vi': 'opt5',
    'we': 'opt37',
    'lf': 'opt26',
    'oi': 'opt8',
    'ts': 'opt18',
    'wx': 'opt39', // Apple
}

/**
 * Reverse map: SMSPVA code → common name
 */
export const SMSPVA_SERVICE_REVERSE_MAP: Record<string, string> =
    Object.fromEntries(
        Object.entries(SMSPVA_SERVICE_MAP)
            .filter(([k]) => k.length > 2) // Only full names
            .map(([k, v]) => [v, k])
    )

// ============================================================================
// COUNTRY CODES
// ============================================================================

/**
 * Map common country names to SMSPVA country codes (ISO 2-letter)
 */
export const SMSPVA_COUNTRY_MAP: Record<string, string> = {
    // Major countries
    'russia': 'RU',
    'ukraine': 'UA',
    'kazakhstan': 'KZ',
    'usa': 'US',
    'unitedstates': 'US',
    'england': 'UK',
    'uk': 'UK',
    'unitedkingdom': 'UK',
    'india': 'IN',
    'indonesia': 'ID',
    'philippines': 'PH',
    'myanmar': 'MM',
    'vietnam': 'VN',
    'thailand': 'TH',
    'malaysia': 'MY',
    'singapore': 'SG',
    'china': 'CN',
    'hongkong': 'HK',
    'taiwan': 'TW',
    'japan': 'JP',
    'southkorea': 'KR',
    'korea': 'KR',

    // Europe
    'poland': 'PL',
    'germany': 'DE',
    'france': 'FR',
    'spain': 'ES',
    'italy': 'IT',
    'netherlands': 'NL',
    'belgium': 'BE',
    'portugal': 'PT',
    'romania': 'RO',
    'czechrepublic': 'CZ',
    'austria': 'AT',
    'sweden': 'SE',
    'norway': 'NO',
    'denmark': 'DK',
    'finland': 'FI',
    'ireland': 'IE',
    'greece': 'GR',
    'hungary': 'HU',
    'switzerland': 'CH',

    // Americas
    'canada': 'CA',
    'mexico': 'MX',
    'brazil': 'BR',
    'argentina': 'AR',
    'colombia': 'CO',
    'chile': 'CL',
    'peru': 'PE',
    'venezuela': 'VE',

    // Africa & Middle East
    'nigeria': 'NG',
    'kenya': 'KE',
    'southafrica': 'ZA',
    'egypt': 'EG',
    'morocco': 'MA',
    'algeria': 'DZ',
    'turkey': 'TR',
    'saudiarabia': 'SA',
    'uae': 'AE',
    'israel': 'IL',

    // Oceania
    'australia': 'AU',
    'newzealand': 'NZ',
}

/**
 * Reverse map: SMSPVA code → common name
 */
export const SMSPVA_COUNTRY_REVERSE_MAP: Record<string, string> =
    Object.fromEntries(Object.entries(SMSPVA_COUNTRY_MAP).map(([k, v]) => [v, k]))

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get SMSPVA service code from common code
 */
export function getSmspvaServiceCode(commonCode: string): string {
    const lower = commonCode.toLowerCase()
    return SMSPVA_SERVICE_MAP[lower] || `opt${lower}`
}

/**
 * Get common service code from SMSPVA code
 */
export function getCommonServiceCode(smspvaCode: string): string {
    return SMSPVA_SERVICE_REVERSE_MAP[smspvaCode] || smspvaCode.replace('opt', '')
}

/**
 * Get SMSPVA country code from common name
 */
export function getSmspvaCountryCode(commonName: string): string {
    const lower = commonName.toLowerCase().replace(/[^a-z]/g, '')
    return SMSPVA_COUNTRY_MAP[lower] || commonName.toUpperCase().substring(0, 2)
}

/**
 * Get common country name from SMSPVA code
 */
export function getCommonCountryName(smspvaCode: string): string {
    return SMSPVA_COUNTRY_REVERSE_MAP[smspvaCode] || smspvaCode.toLowerCase()
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    SMSPVA_SERVICE_MAP,
    SMSPVA_SERVICE_REVERSE_MAP,
    SMSPVA_COUNTRY_MAP,
    SMSPVA_COUNTRY_REVERSE_MAP,
    getSmspvaServiceCode,
    getCommonServiceCode,
    getSmspvaCountryCode,
    getCommonCountryName,
}
