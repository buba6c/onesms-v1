/**
 * SMS-Activate.io API Client
 * Documentation: https://sms-activate.io/api2
 * Base URL: https://api.sms-activate.ae/stubs/handler_api.php
 */

import axios from 'axios'

const API_KEY = import.meta.env.VITE_SMS_ACTIVATE_API_KEY
const BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

const apiSmsActivate = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY
  }
})

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Service {
  code: string
  name: string
  cost: number
  count: number
}

export interface Country {
  id: number
  name: string
  code: string
  available: boolean
}

export interface Activation {
  id: number
  phone: string
  activationCode: string
  status: string
  sms?: Array<{
    text: string
    code: string
    date: string
  }>
  activationCost: string
  activationTime: string
}

export interface RentalNumber {
  id: number
  phone: string
  endDate: string
  status: string
}

// ============================================================================
// SERVICE & COUNTRY CODES MAPPING (5sim → SMS-Activate)
// ============================================================================

// Map 5sim service codes to SMS-Activate service codes
export const SERVICE_CODE_MAP: Record<string, string> = {
  'google': 'go',
  'whatsapp': 'wa',
  'telegram': 'tg',
  'facebook': 'fb',
  'instagram': 'ig',
  'twitter': 'tw',
  'discord': 'ds',
  'microsoft': 'mm',
  'yahoo': 'mb',
  'amazon': 'am',
  'netflix': 'nf',
  'uber': 'ub',
  'tiktok': 'tk',
  'snapchat': 'sn',
  'linkedin': 'ld',
  'viber': 'vi',
  'wechat': 'we',
  'line': 'lf',
  'signal': 'sg',
  'tinder': 'oi',
  'paypal': 'ts'
}

// Map 5sim country names to SMS-Activate country IDs
export const COUNTRY_CODE_MAP: Record<string, number> = {
  'russia': 0,
  'ukraine': 1,
  'kazakhstan': 2,
  'china': 3,
  'philippines': 4,
  'myanmar': 5,
  'indonesia': 6,
  'malaysia': 7,
  'kenya': 8,
  'tanzania': 9,
  'vietnam': 10,
  'kyrgyzstan': 11,
  'england': 12,
  'usa': 187,
  'canada': 36,
  'india': 22,
  'thailand': 52,
  'poland': 15,
  'brazil': 73,
  'romania': 32,
  'colombia': 33,
  'argentina': 39,
  'italy': 43,
  'spain': 56,
  'france': 78,
  'germany': 43,
  'portugal': 117,
  'mexico': 82,
  'australia': 175,
  'japan': 129,
  'southkorea': 196
}

// Reverse mapping for display
export const SMS_ACTIVATE_TO_5SIM_COUNTRY: Record<number, string> = 
  Object.fromEntries(Object.entries(COUNTRY_CODE_MAP).map(([k, v]) => [v, k]))

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert 5sim service code to SMS-Activate service code
 */
export const mapServiceCode = (fiveSimCode: string): string => {
  return SERVICE_CODE_MAP[fiveSimCode.toLowerCase()] || fiveSimCode
}

/**
 * Convert 5sim country name to SMS-Activate country ID
 */
export const mapCountryCode = (fiveSimCountry: string): number => {
  return COUNTRY_CODE_MAP[fiveSimCountry.toLowerCase()] || 0
}

/**
 * Parse SMS-Activate status code to readable status
 */
export const parseStatus = (statusCode: string): string => {
  const statusMap: Record<string, string> = {
    'WAIT_CODE': 'pending',
    'WAIT_RETRY': 'pending',
    'STATUS_OK': 'received',
    'STATUS_CANCEL': 'cancelled',
    'ACCESS_CANCEL': 'cancelled'
  }
  return statusMap[statusCode] || statusCode
}

// ============================================================================
// ACTIVATION API
// ============================================================================

/**
 * Get available services for a country
 */
export const getServices = async (countryId?: number): Promise<Service[]> => {
  try {
    const { data } = await apiSmsActivate.get('', {
      params: {
        action: 'getNumbersStatus',
        country: countryId || 0
      }
    })

    if (typeof data === 'string' && data.startsWith('BAD_')) {
      throw new Error(data)
    }

    // Parse response format: { serviceName_countryId: { count, cost } }
    const services: Service[] = []
    for (const [key, value] of Object.entries(data)) {
      const [serviceCode] = key.split('_')
      const serviceData = value as any
      
      services.push({
        code: serviceCode,
        name: serviceCode,
        cost: parseFloat(serviceData.retail_cost || serviceData.cost || '0'),
        count: parseInt(serviceData.count || '0', 10)
      })
    }

    return services
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] getServices error:', error)
    throw error
  }
}

/**
 * Get available countries
 */
export const getCountries = async (): Promise<Country[]> => {
  try {
    const { data } = await apiSmsActivate.get('', {
      params: { action: 'getCountries' }
    })

    if (typeof data === 'string' && data.startsWith('BAD_')) {
      throw new Error(data)
    }

    // Parse response format: { countryId: { eng: "CountryName" } }
    const countries: Country[] = []
    for (const [id, info] of Object.entries(data)) {
      const countryInfo = info as any
      countries.push({
        id: parseInt(id, 10),
        name: countryInfo.eng || countryInfo.rus,
        code: SMS_ACTIVATE_TO_5SIM_COUNTRY[parseInt(id, 10)] || `country_${id}`,
        available: true
      })
    }

    return countries
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] getCountries error:', error)
    throw error
  }
}

/**
 * Get pricing for a service and country
 */
export const getPrices = async (service?: string, country?: number): Promise<any> => {
  try {
    const { data } = await apiSmsActivate.get('', {
      params: {
        action: 'getNumbersStatus',
        country: country || 0,
        ...(service && { service })
      }
    })

    if (typeof data === 'string' && data.startsWith('BAD_')) {
      throw new Error(data)
    }

    return data
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] getPrices error:', error)
    throw error
  }
}

/**
 * Buy activation number
 */
export const buyActivation = async (
  service: string,
  country: number,
  operator?: string
): Promise<Activation> => {
  try {
    const params: any = {
      action: 'getNumber',
      service: mapServiceCode(service),
      country: country
    }

    if (operator && operator !== 'any') {
      params.operator = operator
    }

    const { data } = await apiSmsActivate.get('', { params })

    if (typeof data === 'string') {
      if (data.startsWith('ACCESS_NUMBER:')) {
        // Format: ACCESS_NUMBER:id:phone
        const [, id, phone] = data.split(':')
        return {
          id: parseInt(id, 10),
          phone: phone,
          activationCode: id,
          status: 'pending',
          activationCost: '0',
          activationTime: new Date().toISOString()
        }
      } else if (data.startsWith('BAD_')) {
        throw new Error(data)
      }
    }

    throw new Error('Invalid response format')
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] buyActivation error:', error)
    throw error
  }
}

/**
 * Get activation status and SMS
 */
export const getActivation = async (id: number): Promise<Activation> => {
  try {
    const { data } = await apiSmsActivate.get('', {
      params: {
        action: 'getStatus',
        id: id
      }
    })

    if (typeof data === 'string') {
      if (data.startsWith('STATUS_OK:')) {
        // Format: STATUS_OK:smsCode
        const code = data.split(':')[1]
        return {
          id,
          phone: '',
          activationCode: id.toString(),
          status: 'received',
          sms: [{
            text: code,
            code: code,
            date: new Date().toISOString()
          }],
          activationCost: '0',
          activationTime: new Date().toISOString()
        }
      } else if (data === 'STATUS_WAIT_CODE') {
        return {
          id,
          phone: '',
          activationCode: id.toString(),
          status: 'pending',
          activationCost: '0',
          activationTime: new Date().toISOString()
        }
      } else if (data.startsWith('BAD_')) {
        throw new Error(data)
      }
    }

    throw new Error('Invalid response format')
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] getActivation error:', error)
    throw error
  }
}

/**
 * Cancel activation
 */
export const cancelActivation = async (id: number): Promise<void> => {
  try {
    const { data } = await apiSmsActivate.get('', {
      params: {
        action: 'setStatus',
        id: id,
        status: 8 // 8 = Cancel
      }
    })

    if (typeof data === 'string' && data.startsWith('BAD_')) {
      throw new Error(data)
    }
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] cancelActivation error:', error)
    throw error
  }
}

/**
 * Finish activation (mark as complete)
 */
export const finishActivation = async (id: number): Promise<void> => {
  try {
    const { data } = await apiSmsActivate.get('', {
      params: {
        action: 'setStatus',
        id: id,
        status: 6 // 6 = Complete
      }
    })

    if (typeof data === 'string' && data.startsWith('BAD_')) {
      throw new Error(data)
    }
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] finishActivation error:', error)
    throw error
  }
}

// ============================================================================
// RENT API (NEW!)
// ============================================================================

/**
 * Get available rent services and countries
 */
export const getRentServices = async (): Promise<any> => {
  try {
    const { data } = await apiSmsActivate.get('', {
      params: { action: 'getRentServicesAndCountries' }
    })

    if (typeof data === 'string' && data.startsWith('BAD_')) {
      throw new Error(data)
    }

    return data
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] getRentServices error:', error)
    throw error
  }
}

/**
 * Rent a number
 * @param service - Service code (e.g., 'wa' for WhatsApp)
 * @param country - Country ID
 * @param rentTime - Rental duration in hours (4, 24, 168, 720)
 */
export const rentNumber = async (
  service: string,
  country: number,
  rentTime: number
): Promise<RentalNumber> => {
  try {
    const { data } = await apiSmsActivate.get('', {
      params: {
        action: 'getRentNumber',
        service: mapServiceCode(service),
        country: country,
        rent_time: rentTime
      }
    })

    if (typeof data === 'string') {
      if (data.startsWith('ACCESS_NUMBER:')) {
        // Format: ACCESS_NUMBER:id:phone
        const [, id, phone] = data.split(':')
        return {
          id: parseInt(id, 10),
          phone: phone,
          endDate: new Date(Date.now() + rentTime * 3600 * 1000).toISOString(),
          status: 'active'
        }
      } else if (data.startsWith('BAD_')) {
        throw new Error(data)
      }
    }

    throw new Error('Invalid response format')
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] rentNumber error:', error)
    throw error
  }
}

/**
 * Get rent status and SMS inbox
 */
export const getRentStatus = async (id: number): Promise<any> => {
  try {
    const { data } = await apiSmsActivate.get('', {
      params: {
        action: 'getRentStatus',
        id: id
      }
    })

    if (typeof data === 'string' && data.startsWith('BAD_')) {
      throw new Error(data)
    }

    return data
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] getRentStatus error:', error)
    throw error
  }
}

/**
 * Continue/Extend rent
 */
export const continueRent = async (id: number): Promise<void> => {
  try {
    const { data } = await apiSmsActivate.get('', {
      params: {
        action: 'continueRent',
        id: id
      }
    })

    if (typeof data === 'string' && data.startsWith('BAD_')) {
      throw new Error(data)
    }
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] continueRent error:', error)
    throw error
  }
}

/**
 * Get rent list (all active rentals)
 */
export const getRentList = async (): Promise<any> => {
  try {
    const { data } = await apiSmsActivate.get('', {
      params: { action: 'getRentList' }
    })

    if (typeof data === 'string' && data.startsWith('BAD_')) {
      throw new Error(data)
    }

    return data
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] getRentList error:', error)
    throw error
  }
}

// ============================================================================
// BALANCE & PROFILE
// ============================================================================

/**
 * Get user balance
 */
export const getBalance = async (): Promise<number> => {
  try {
    const { data } = await apiSmsActivate.get('', {
      params: { action: 'getBalance' }
    })

    if (typeof data === 'string') {
      if (data.startsWith('ACCESS_BALANCE:')) {
        return parseFloat(data.split(':')[1])
      } else if (data.startsWith('BAD_')) {
        throw new Error(data)
      }
    }

    return 0
  } catch (error: any) {
    console.error('❌ [SMS-ACTIVATE] getBalance error:', error)
    throw error
  }
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

const smsActivate = {
  // Activation
  getServices,
  getCountries,
  getPrices,
  buyActivation,
  getActivation,
  cancelActivation,
  finishActivation,
  
  // Rent (NEW!)
  getRentServices,
  rentNumber,
  getRentStatus,
  continueRent,
  getRentList,
  
  // Profile
  getBalance,
  
  // Mappers
  mapServiceCode,
  mapCountryCode,
  parseStatus
}

export default smsActivate
