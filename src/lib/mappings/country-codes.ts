/**
 * Country Code Mappings
 * Maps 5sim country names to SMS-Activate country IDs
 * 
 * Format: { '5sim_country_name': sms_activate_country_id }
 */

export const COUNTRY_CODE_MAP: Record<string, number> = {
  // Europe
  'russia': 0,
  'ukraine': 1,
  'poland': 15,
  'england': 12,
  'unitedkingdom': 12,
  'uk': 12,
  'france': 78,
  'germany': 43,
  'spain': 56,
  'italy': 58,
  'romania': 32,
  'netherlands': 48,
  'belgium': 82,
  'portugal': 117,
  'sweden': 46,
  'norway': 47,
  'finland': 163,
  'denmark': 172,
  'greece': 129,
  'czech': 63,
  'czechia': 63,
  'austria': 50,
  'switzerland': 173,
  'hungary': 45,
  'bulgaria': 83,
  
  // Asia
  'china': 3,
  'india': 22,
  'indonesia': 6,
  'philippines': 4,
  'vietnam': 10,
  'thailand': 52,
  'malaysia': 7,
  'singapore': 184,
  'japan': 182,
  'southkorea': 196,
  'korea': 196,
  'bangladesh': 60,
  'pakistan': 66,
  'myanmar': 5,
  'cambodia': 24,
  'hongkong': 14,
  'taiwan': 176,
  'israel': 13,
  'turkey': 62,
  'uae': 165,
  'emirates': 165,
  'saudiarabia': 53,
  'kuwait': 100,
  
  // Americas
  'usa': 187,
  'unitedstates': 187,
  'canada': 36,
  'mexico': 82,
  'brazil': 73,
  'argentina': 39,
  'chile': 151,
  'colombia': 33,
  'peru': 136,
  'venezuela': 77,
  
  // Africa
  'southafrica': 31,
  'nigeria': 19,
  'kenya': 8,
  'tanzania': 9,
  'egypt': 21,
  'morocco': 37,
  'algeria': 58,
  
  // Oceania
  'australia': 175,
  'newzealand': 67,
  
  // Central Asia
  'kazakhstan': 2,
  'kyrgyzstan': 11,
  'uzbekistan': 40,
  'tajikistan': 143,
  'georgia': 128,
  'armenia': 148,
  'azerbaijan': 35
}

/**
 * Reverse mapping: SMS-Activate country ID → 5sim country name
 */
export const REVERSE_COUNTRY_MAP: Record<number, string> = 
  Object.fromEntries(
    Object.entries(COUNTRY_CODE_MAP).map(([key, value]) => [value, key])
  )

/**
 * Country display names (human-readable)
 */
export const COUNTRY_DISPLAY_NAMES: Record<string, string> = {
  'russia': 'Russia',
  'ukraine': 'Ukraine',
  'poland': 'Poland',
  'england': 'United Kingdom',
  'unitedkingdom': 'United Kingdom',
  'uk': 'United Kingdom',
  'france': 'France',
  'germany': 'Germany',
  'spain': 'Spain',
  'italy': 'Italy',
  'romania': 'Romania',
  'netherlands': 'Netherlands',
  'usa': 'United States',
  'unitedstates': 'United States',
  'canada': 'Canada',
  'india': 'India',
  'china': 'China',
  'indonesia': 'Indonesia',
  'philippines': 'Philippines',
  'vietnam': 'Vietnam',
  'thailand': 'Thailand',
  'malaysia': 'Malaysia',
  'brazil': 'Brazil',
  'mexico': 'Mexico',
  'argentina': 'Argentina',
  'australia': 'Australia'
}

/**
 * Map 5sim country name to SMS-Activate country ID
 */
export const mapCountryCode = (fiveSimCountry: string): number => {
  const normalized = fiveSimCountry.toLowerCase().trim().replace(/\s+/g, '')
  return COUNTRY_CODE_MAP[normalized] || 0 // Default to Russia if not found
}

/**
 * Map SMS-Activate country ID to 5sim country name
 */
export const reverseMapCountryCode = (smsActivateId: number): string => {
  return REVERSE_COUNTRY_MAP[smsActivateId] || 'unknown'
}

/**
 * Get display name for a country
 */
export const getCountryDisplayName = (fiveSimCountry: string): string => {
  const normalized = fiveSimCountry.toLowerCase().trim().replace(/\s+/g, '')
  return COUNTRY_DISPLAY_NAMES[normalized] || fiveSimCountry
}

/**
 * Get all available SMS-Activate country IDs
 */
export const getAllSmsActivateCountryIds = (): number[] => {
  return Object.values(COUNTRY_CODE_MAP)
}

/**
 * Get all available 5sim country names
 */
export const getAll5simCountries = (): string[] => {
  return Object.keys(COUNTRY_CODE_MAP)
}

/**
 * Check if a country is supported
 */
export const isCountrySupported = (fiveSimCountry: string): boolean => {
  const normalized = fiveSimCountry.toLowerCase().trim().replace(/\s+/g, '')
  return normalized in COUNTRY_CODE_MAP
}

/**
 * Get country flag emoji by country name
 */
export const getCountryFlag = (fiveSimCountry: string): string => {
  const flags: Record<string, string> = {
    'russia': '🇷🇺',
    'ukraine': '🇺🇦',
    'poland': '🇵🇱',
    'england': '🇬🇧',
    'unitedkingdom': '🇬🇧',
    'uk': '🇬🇧',
    'france': '🇫🇷',
    'germany': '🇩🇪',
    'spain': '🇪🇸',
    'italy': '🇮🇹',
    'usa': '🇺🇸',
    'unitedstates': '🇺🇸',
    'canada': '🇨🇦',
    'india': '🇮🇳',
    'china': '🇨🇳',
    'brazil': '🇧🇷',
    'mexico': '🇲🇽',
    'australia': '🇦🇺'
  }
  
  const normalized = fiveSimCountry.toLowerCase().trim().replace(/\s+/g, '')
  return flags[normalized] || '🌍'
}
