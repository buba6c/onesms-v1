/**
 * SMSPVA API Client
 * Documentation: https://smspva.com/new_theme_api.html
 * Base URL: https://smspva.com/priemnik.php
 */

import axios from 'axios'

const API_KEY = import.meta.env.VITE_SMSPVA_API_KEY
const BASE_URL = 'https://smspva.com/priemnik.php'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SmspvaService {
    code: string
    name: string
    cost: number
    count: number
}

export interface SmspvaCountry {
    id: string
    name: string
    code: string
    available: boolean
}

export interface SmspvaActivation {
    id: string
    phone: string
    status: string
    sms?: string
    response: string
}

// ============================================================================
// SERVICE & COUNTRY CODES MAPPING
// ============================================================================

// Map 5sim/common service codes to SMSPVA service codes (opt format)
export const SERVICE_CODE_MAP: Record<string, string> = {
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
    // Short codes
    'go': 'opt1',
    'wa': 'opt4',
    'tg': 'opt29',
    'fb': 'opt2',
    'ig': 'opt16',
    'tw': 'opt41',
    'ds': 'opt25',
    'tk': 'opt20',
    'sn': 'opt23',
    'ld': 'opt14',
    'vi': 'opt5',
}

// Map country names to SMSPVA country codes (ISO 2-letter)
export const COUNTRY_CODE_MAP: Record<string, string> = {
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

// Reverse mapping
export const SMSPVA_TO_COMMON_COUNTRY: Record<string, string> =
    Object.fromEntries(Object.entries(COUNTRY_CODE_MAP).map(([k, v]) => [v, k]))

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert common service code to SMSPVA service code
 */
export const mapServiceCode = (code: string): string => {
    const lower = code.toLowerCase()
    return SERVICE_CODE_MAP[lower] || `opt${lower}`
}

/**
 * Convert common country name to SMSPVA country code
 */
export const mapCountryCode = (country: string): string => {
    const lower = country.toLowerCase()
    return COUNTRY_CODE_MAP[lower] || country.toUpperCase()
}

/**
 * Parse SMSPVA response code to readable status
 */
export const parseResponseCode = (code: string | number): string => {
    const responseMap: Record<string, string> = {
        '1': 'success',
        '2': 'waiting',
        '3': 'expired',
        '4': 'already_retrieved',
        '5': 'rate_limit',
        '6': 'banned',
        '7': 'max_concurrent'
    }
    return responseMap[code.toString()] || `unknown_${code}`
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get user balance
 */
export const getBalance = async (): Promise<number> => {
    try {
        const { data } = await axios.get(BASE_URL, {
            params: { metod: 'get_balance', apikey: API_KEY }
        })

        if (data.response === '1' || data.response === 1) {
            return parseFloat(data.balance || '0')
        }

        throw new Error(`SMSPVA balance error: ${JSON.stringify(data)}`)
    } catch (error: any) {
        console.error('❌ [SMSPVA] getBalance error:', error)
        throw error
    }
}

/**
 * Get available number count for a service/country
 */
export const getNumberCount = async (service: string, country: string): Promise<number> => {
    try {
        const { data } = await axios.get(BASE_URL, {
            params: {
                metod: 'get_count_new',
                country: mapCountryCode(country),
                service: mapServiceCode(service),
                apikey: API_KEY
            }
        })

        if (data.response === '1' || data.response === 1) {
            return parseInt(data.count || '0', 10)
        }

        return 0
    } catch (error: any) {
        console.error('❌ [SMSPVA] getNumberCount error:', error)
        return 0
    }
}

/**
 * Get service price for a country
 */
export const getServicePrice = async (service: string, country: string): Promise<number> => {
    try {
        const { data } = await axios.get(BASE_URL, {
            params: {
                metod: 'get_service_price',
                country: mapCountryCode(country),
                service: mapServiceCode(service),
                apikey: API_KEY
            }
        })

        if (data.response === '1' || data.response === 1) {
            return parseFloat(data.price || '0')
        }

        return 0
    } catch (error: any) {
        console.error('❌ [SMSPVA] getServicePrice error:', error)
        return 0
    }
}

/**
 * Buy activation number
 */
export const buyActivation = async (
    service: string,
    country: string,
    operator?: string
): Promise<SmspvaActivation> => {
    try {
        const params: any = {
            metod: 'get_number',
            country: mapCountryCode(country),
            service: mapServiceCode(service),
            apikey: API_KEY
        }

        if (operator && operator !== 'any') {
            params.operator = operator
        }

        const { data } = await axios.get(BASE_URL, { params })

        if (data.response === '1' || data.response === 1) {
            return {
                id: data.id.toString(),
                phone: data.number,
                status: 'pending',
                response: data.response
            }
        }

        throw new Error(getErrorMessage(data.response))
    } catch (error: any) {
        console.error('❌ [SMSPVA] buyActivation error:', error)
        throw error
    }
}

/**
 * Get SMS for activation
 */
export const getSms = async (
    id: string,
    service: string,
    country: string
): Promise<SmspvaActivation> => {
    try {
        const { data } = await axios.get(BASE_URL, {
            params: {
                metod: 'get_sms',
                country: mapCountryCode(country),
                service: mapServiceCode(service),
                id: id,
                apikey: API_KEY
            }
        })

        if (data.response === '1' || data.response === 1) {
            return {
                id,
                phone: data.number || '',
                status: 'received',
                sms: data.sms,
                response: data.response
            }
        }

        if (data.response === '2' || data.response === 2) {
            return {
                id,
                phone: data.number || '',
                status: 'waiting',
                response: data.response
            }
        }

        if (data.response === '3' || data.response === 3) {
            return {
                id,
                phone: '',
                status: 'expired',
                response: data.response
            }
        }

        return {
            id,
            phone: '',
            status: parseResponseCode(data.response),
            response: data.response
        }
    } catch (error: any) {
        console.error('❌ [SMSPVA] getSms error:', error)
        throw error
    }
}

/**
 * Cancel activation (denial)
 */
export const cancelActivation = async (
    id: string,
    service: string,
    country: string
): Promise<void> => {
    try {
        const { data } = await axios.get(BASE_URL, {
            params: {
                metod: 'denial',
                country: mapCountryCode(country),
                service: mapServiceCode(service),
                id: id,
                apikey: API_KEY
            }
        })

        console.log('📥 [SMSPVA] cancelActivation response:', data)
    } catch (error: any) {
        console.error('❌ [SMSPVA] cancelActivation error:', error)
        throw error
    }
}

/**
 * Finish activation (ban) - marks as used
 */
export const finishActivation = async (
    id: string,
    service: string,
    country: string
): Promise<void> => {
    try {
        const { data } = await axios.get(BASE_URL, {
            params: {
                metod: 'ban',
                country: mapCountryCode(country),
                service: mapServiceCode(service),
                id: id,
                apikey: API_KEY
            }
        })

        console.log('📥 [SMSPVA] finishActivation response:', data)
    } catch (error: any) {
        console.error('❌ [SMSPVA] finishActivation error:', error)
        throw error
    }
}

// ============================================================================
// HELPER: ERROR MESSAGES
// ============================================================================

function getErrorMessage(responseCode: string | number): string {
    const errorMap: Record<string, string> = {
        '2': 'NO_NUMBERS - Numbers are already taken',
        '3': 'EXPIRED - Request expired or invalid ID',
        '5': 'RATE_LIMIT - Too many requests per minute',
        '6': 'BANNED - Account banned for 10 minutes',
        '7': 'MAX_CONCURRENT - Too many concurrent streams',
    }
    return errorMap[responseCode.toString()] || `Unknown error: ${responseCode}`
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

const smspva = {
    // API functions
    getBalance,
    getNumberCount,
    getServicePrice,
    buyActivation,
    getSms,
    cancelActivation,
    finishActivation,

    // Mappers
    mapServiceCode,
    mapCountryCode,
    parseResponseCode,

    // Constants
    SERVICE_CODE_MAP,
    COUNTRY_CODE_MAP,
}

export default smspva
