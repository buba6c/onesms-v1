/**
 * OnlineSIM API Client
 * Documentation: https://onlinesim.io/docs/api
 * Base URL: https://onlinesim.io/api
 */

import axios from 'axios'

const API_KEY = import.meta.env.VITE_ONLINESIM_API_KEY
const BASE_URL = 'https://onlinesim.io/api'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface OnlinesimService {
    name: string
    count: number
    price: number
}

export interface OnlinesimCountry {
    country: number
    name: string
    enabled: boolean
}

export interface OnlinesimActivation {
    tzid: number
    response: string
    number?: string
    msg?: string
    service?: string
    country?: number
}

export interface OnlinesimBalance {
    balance: number
    frozen_balance: number
}

// ============================================================================
// SERVICE & COUNTRY CODES MAPPING
// ============================================================================

// OnlineSIM uses service names directly
export const SERVICE_CODE_MAP: Record<string, string> = {
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
    // Short codes mapping
    'go': 'google',
    'wa': 'whatsapp',
    'tg': 'telegram',
    'fb': 'facebook',
    'ig': 'instagram',
    'tw': 'twitter',
    'ds': 'discord',
    'tk': 'tiktok',
    'sn': 'snapchat',
    'vi': 'viber',
    'wx': 'apple',
}

// OnlineSIM uses phone country codes
export const COUNTRY_CODE_MAP: Record<string, number> = {
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

export const ONLINESIM_TO_COMMON_COUNTRY: Record<number, string> =
    Object.fromEntries(Object.entries(COUNTRY_CODE_MAP).map(([k, v]) => [v, k]))

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const mapServiceCode = (code: string): string => {
    const lower = code.toLowerCase()
    return SERVICE_CODE_MAP[lower] || lower
}

export const mapCountryCode = (country: string): number => {
    const lower = country.toLowerCase()
    return COUNTRY_CODE_MAP[lower] || 7
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get user balance
 */
export const getBalance = async (): Promise<OnlinesimBalance> => {
    try {
        const { data } = await axios.get(`${BASE_URL}/getBalance.php`, {
            params: { apikey: API_KEY }
        })

        if (data.response === 1 || data.response === '1') {
            return {
                balance: parseFloat(data.balance || '0'),
                frozen_balance: parseFloat(data.frozen_balance || '0')
            }
        }

        throw new Error(`OnlineSIM balance error: ${JSON.stringify(data)}`)
    } catch (error: any) {
        console.error('❌ [ONLINESIM] getBalance error:', error)
        throw error
    }
}

/**
 * Get available tariffs (services and counts)
 */
export const getTariffs = async (country?: number): Promise<any> => {
    try {
        const params: any = { apikey: API_KEY }
        if (country) params.country = country

        const { data } = await axios.get(`${BASE_URL}/getTariffs.php`, { params })
        return data
    } catch (error: any) {
        console.error('❌ [ONLINESIM] getTariffs error:', error)
        throw error
    }
}

/**
 * Buy activation number
 */
export const buyActivation = async (
    service: string,
    country: number
): Promise<OnlinesimActivation> => {
    try {
        const { data } = await axios.get(`${BASE_URL}/getNum.php`, {
            params: {
                apikey: API_KEY,
                service: mapServiceCode(service),
                country: country
            }
        })

        if (data.response === 1 || data.response === '1') {
            return {
                tzid: data.tzid,
                response: data.response.toString()
            }
        }

        throw new Error(getErrorMessage(data.response))
    } catch (error: any) {
        console.error('❌ [ONLINESIM] buyActivation error:', error)
        throw error
    }
}

/**
 * Get activation state (status and SMS)
 */
export const getState = async (tzid?: number): Promise<OnlinesimActivation[]> => {
    try {
        const params: any = { apikey: API_KEY }
        if (tzid) params.tzid = tzid

        const { data } = await axios.get(`${BASE_URL}/getState.php`, { params })

        if (Array.isArray(data)) {
            return data
        }

        if (data.response === 'ERROR_NO_OPERATIONS') {
            return []
        }

        throw new Error(getErrorMessage(data.response))
    } catch (error: any) {
        console.error('❌ [ONLINESIM] getState error:', error)
        throw error
    }
}

/**
 * Request next SMS (if first one was wrong)
 */
export const setOperationRevise = async (tzid: number): Promise<void> => {
    try {
        await axios.get(`${BASE_URL}/setOperationRevise.php`, {
            params: { apikey: API_KEY, tzid }
        })
    } catch (error: any) {
        console.error('❌ [ONLINESIM] setOperationRevise error:', error)
        throw error
    }
}

/**
 * Mark activation as successful and close
 */
export const setOperationOk = async (tzid: number, ban?: boolean): Promise<void> => {
    try {
        const params: any = { apikey: API_KEY, tzid }
        if (ban) params.ban = 1

        await axios.get(`${BASE_URL}/setOperationOk.php`, { params })
    } catch (error: any) {
        console.error('❌ [ONLINESIM] setOperationOk error:', error)
        throw error
    }
}

// ============================================================================
// RENT API FUNCTIONS
// ============================================================================

export interface OnlinesimRentResponse {
    tzid: number
    number: string
    end_date: string
    response: string | number
}

export interface OnlinesimRentMessage {
    text: string
    service: string
    date: string
    code?: string
}

/**
 * Rent a number for multiple days
 * @param service - Service code (e.g., 'whatsapp', 'telegram')
 * @param country - Country phone code (e.g., 7 for Russia)
 * @param days - Number of days to rent (1, 4, 7, 30)
 */
export const rentNumber = async (
    service: string,
    country: number,
    days: number
): Promise<OnlinesimRentResponse> => {
    try {
        const { data } = await axios.get(`${BASE_URL}/rent.tar.php`, {
            params: {
                apikey: API_KEY,
                service: mapServiceCode(service),
                country: country,
                days: days
            }
        })

        console.log('📥 [ONLINESIM] rentNumber response:', data)

        if (data.response === 1 || data.response === '1') {
            return {
                tzid: data.tzid,
                number: data.number,
                end_date: data.end_date,
                response: data.response.toString()
            }
        }

        throw new Error(getErrorMessage(data.response))
    } catch (error: any) {
        console.error('❌ [ONLINESIM] rentNumber error:', error)
        throw error
    }
}

/**
 * Get rent state (status and messages)
 * @param tzid - Transaction ID from rent operation
 */
export const getRentState = async (tzid: number): Promise<OnlinesimRentMessage[]> => {
    try {
        const { data } = await axios.get(`${BASE_URL}/getState.php`, {
            params: {
                apikey: API_KEY,
                tzid: tzid,
                message_to_code: 1 // Extract codes from messages
            }
        })

        console.log('📥 [ONLINESIM] getRentState response:', data)

        if (Array.isArray(data)) {
            // Parse messages from state
            return data
                .filter((item: any) => item.msg)
                .map((item: any) => ({
                    text: item.msg?.text || item.msg || '',
                    service: item.msg?.service || item.service || 'unknown',
                    date: item.msg?.date || item.created_at || new Date().toISOString(),
                    code: item.msg?.code || extractCodeFromText(item.msg?.text || item.msg || '')
                }))
        }

        if (data.response === 'ERROR_NO_OPERATIONS') {
            return []
        }

        return []
    } catch (error: any) {
        console.error('❌ [ONLINESIM] getRentState error:', error)
        return []
    }
}

/**
 * Extend rent duration
 * @param tzid - Transaction ID
 * @param days - Additional days to extend
 */
export const extendRent = async (tzid: number, days: number): Promise<{ success: boolean; end_date: string; price: number }> => {
    try {
        const { data } = await axios.get(`${BASE_URL}/rent.tar.php`, {
            params: {
                apikey: API_KEY,
                tzid: tzid,
                extension: days
            }
        })

        console.log('📥 [ONLINESIM] extendRent response:', data)

        if (data.response === 1 || data.response === '1') {
            return {
                success: true,
                end_date: data.end_date,
                price: parseFloat(data.price || '0')
            }
        }

        throw new Error(getErrorMessage(data.response))
    } catch (error: any) {
        console.error('❌ [ONLINESIM] extendRent error:', error)
        throw error
    }
}

/**
 * Close rent operation early
 * @param tzid - Transaction ID
 */
export const closeRent = async (tzid: number): Promise<void> => {
    try {
        const { data } = await axios.get(`${BASE_URL}/setOperationOk.php`, {
            params: {
                apikey: API_KEY,
                tzid: tzid
            }
        })

        console.log('📥 [ONLINESIM] closeRent response:', data)

        if (data.response !== 1 && data.response !== '1') {
            throw new Error(getErrorMessage(data.response))
        }
    } catch (error: any) {
        console.error('❌ [ONLINESIM] closeRent error:', error)
        throw error
    }
}

/**
 * Get available rent services and prices
 * @param country - Country phone code
 * @param days - Rent duration in days
 */
export const getRentTariffs = async (country: number, days: number = 1): Promise<any> => {
    try {
        const { data } = await axios.get(`${BASE_URL}/rent.tar.php`, {
            params: {
                apikey: API_KEY,
                country: country,
                days: days,
                type: 'list' // Get list of available services
            }
        })

        console.log('📥 [ONLINESIM] getRentTariffs response:', data)
        return data
    } catch (error: any) {
        console.error('❌ [ONLINESIM] getRentTariffs error:', error)
        throw error
    }
}

/**
 * Helper: Extract verification code from SMS text
 */
function extractCodeFromText(text: string): string | null {
    if (!text) return null

    // Common patterns for verification codes
    const patterns = [
        /\b(\d{4,8})\b/,           // 4-8 digit codes
        /code[:\s]+(\d{4,8})/i,   // "code: 123456"
        /verification[:\s]+(\d{4,8})/i, // "verification: 123456"
        /\b([A-Z0-9]{4,8})\b/      // Alphanumeric codes
    ]

    for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) return match[1]
    }

    return null
}

// ============================================================================
// HELPER: ERROR MESSAGES
// ============================================================================

function getErrorMessage(responseCode: string | number | undefined): string {
    if (!responseCode) return 'Unknown error'

    const errorMap: Record<string, string> = {
        'NO_NUMBERS': 'No numbers available',
        'NO_BALANCE': 'Insufficient balance',
        'ERROR_WRONG_KEY': 'Invalid API key',
        'ERROR_NO_KEY': 'API key not provided',
        'ERROR_NO_SERVICE': 'Service not specified',
        'ERROR_NO_OPERATIONS': 'No operations found',
        'TZ_INPOOL': 'Order in queue',
    }
    return errorMap[responseCode.toString()] || `Error: ${responseCode}`
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

const onlinesim = {
    // API functions
    getBalance,
    getTariffs,
    buyActivation,
    getState,
    setOperationRevise,
    setOperationOk,

    // Rent functions
    rentNumber,
    getRentState,
    extendRent,
    closeRent,
    getRentTariffs,

    // Mappers
    mapServiceCode,
    mapCountryCode,

    // Constants
    SERVICE_CODE_MAP,
    COUNTRY_CODE_MAP,
}

export default onlinesim

