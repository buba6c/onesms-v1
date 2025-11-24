/**
 * Service Code Mappings
 * Maps 5sim service names to SMS-Activate service codes
 * 
 * Format: { '5sim_service_name': 'sms_activate_code' }
 */

export const SERVICE_CODE_MAP: Record<string, string> = {
  // Popular services
  'google': 'go',
  'whatsapp': 'wa',
  'telegram': 'tg',
  'facebook': 'fb',
  'instagram': 'ig',
  'twitter': 'tw',
  'discord': 'ds',
  
  // Microsoft services
  'microsoft': 'mm',
  'outlook': 'mm',
  'hotmail': 'mm',
  
  // Email providers
  'yahoo': 'mb',
  'gmail': 'go',
  'aol': 'ot',
  
  // E-commerce
  'amazon': 'am',
  'ebay': 'eb',
  'aliexpress': 'al',
  'walmart': 'wm',
  
  // Streaming
  'netflix': 'nf',
  'spotify': 'sp',
  'youtube': 'yt',
  'hulu': 'hu',
  
  // Social Media
  'linkedin': 'ld',
  'snapchat': 'sn',
  'tiktok': 'tk',
  'reddit': 're',
  'pinterest': 'pn',
  'tumblr': 'tu',
  
  // Messaging
  'viber': 'vi',
  'wechat': 'we',
  'line': 'lf',
  'signal': 'sg',
  'skype': 'oi',
  'kakaotalk': 'kt',
  
  // Dating
  'tinder': 'oi',
  'badoo': 'bd',
  'okcupid': 'ok',
  'bumble': 'bu',
  
  // Ride sharing
  'uber': 'ub',
  'lyft': 'ly',
  'bolt': 'bo',
  
  // Payment
  'paypal': 'ts',
  'venmo': 'vn',
  'cashapp': 'ca',
  
  // Crypto
  'binance': 'bn',
  'coinbase': 'cb',
  'kraken': 'kr',
  
  // Gaming
  'steam': 'st',
  'playstation': 'ps',
  'xbox': 'xb',
  'twitch': 'tc',
  'epicgames': 'eg',
  
  // Food delivery
  'doordash': 'dd',
  'ubereats': 'ue',
  'grubhub': 'gh',
  
  // Others
  'airbnb': 'ab',
  'booking': 'bk',
  'expedia': 'ex'
}

/**
 * Reverse mapping: SMS-Activate code → 5sim service name
 */
export const REVERSE_SERVICE_MAP: Record<string, string> = 
  Object.fromEntries(
    Object.entries(SERVICE_CODE_MAP).map(([key, value]) => [value, key])
  )

/**
 * Map 5sim service code to SMS-Activate service code
 */
export const mapServiceCode = (fiveSimCode: string): string => {
  const normalized = fiveSimCode.toLowerCase().trim()
  return SERVICE_CODE_MAP[normalized] || normalized
}

/**
 * Map SMS-Activate service code to 5sim service name
 */
export const reverseMapServiceCode = (smsActivateCode: string): string => {
  return REVERSE_SERVICE_MAP[smsActivateCode] || smsActivateCode
}

/**
 * Get all available service codes for SMS-Activate
 */
export const getAllSmsActivateCodes = (): string[] => {
  return Object.values(SERVICE_CODE_MAP)
}

/**
 * Get all available 5sim service names
 */
export const getAll5simServices = (): string[] => {
  return Object.keys(SERVICE_CODE_MAP)
}

/**
 * Check if a service is supported
 */
export const isServiceSupported = (fiveSimCode: string): boolean => {
  return fiveSimCode.toLowerCase() in SERVICE_CODE_MAP
}
