/**
 * Service pour récupérer les données SMS-Activate en temps réel
 */

import { supabase } from '@/lib/supabase'

const SMS_ACTIVATE_API_KEY = import.meta.env.VITE_SMS_ACTIVATE_API_KEY
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.io/stubs/handler_api.php'

// Country mapping: code → numeric ID
const COUNTRY_TO_ID: Record<string, number> = {
  'russia': 0,
  'ukraine': 1,
  'kazakhstan': 2,
  'china': 3,
  'philippines': 4,
  'indonesia': 6,
  'malaysia': 7,
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
  'italy': 58,
  'spain': 56,
  'france': 78,
  'germany': 43,
  'mexico': 82,
  'australia': 175
}

// Service code mapping
const SERVICE_CODE_MAP: Record<string, string> = {
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
  'paypal': 'ts',
  'steam': 'st'
}

export interface CountryServiceData {
  countryCode: string
  countryName: string
  countryId: number
  totalCount: number
  cost: number
  popularity: number // For sorting
}

/**
 * Récupère les pays disponibles pour un service donné depuis SMS-Activate
 * 🚀 OPTIMIZED: Utilise l'Edge Function pour éviter CORS et accélérer
 */
export const fetchSMSActivateCountries = async (serviceCode: string): Promise<CountryServiceData[]> => {
  try {
    const smsActivateService = SERVICE_CODE_MAP[serviceCode.toLowerCase()] || serviceCode
    console.log(`🌍 [SMS-ACTIVATE] Récupération des pays pour ${smsActivateService}...`)
    
    // Top countries to scan (ordered by popularity)
    const topCountries = [
      { code: 'usa', id: 187, name: 'United States', priority: 1000 },
      { code: 'philippines', id: 4, name: 'Philippines', priority: 900 },
      { code: 'indonesia', id: 6, name: 'Indonesia', priority: 800 },
      { code: 'india', id: 22, name: 'India', priority: 700 },
      { code: 'england', id: 12, name: 'England', priority: 600 },
      { code: 'russia', id: 0, name: 'Russia', priority: 500 },
      { code: 'canada', id: 36, name: 'Canada', priority: 400 },
      { code: 'france', id: 78, name: 'France', priority: 300 },
      { code: 'germany', id: 43, name: 'Germany', priority: 200 },
      { code: 'thailand', id: 52, name: 'Thailand', priority: 100 },
      { code: 'vietnam', id: 10, name: 'Vietnam', priority: 90 },
      { code: 'poland', id: 15, name: 'Poland', priority: 80 },
      { code: 'brazil', id: 73, name: 'Brazil', priority: 70 },
      { code: 'mexico', id: 82, name: 'Mexico', priority: 60 }
    ]

    // 🚀 Appeler l'Edge Function pour obtenir les données de TOUS les pays en 1 appel
    const { data, error } = await supabase.functions.invoke('get-services-counts', {
      body: { 
        countries: topCountries.map(c => c.id),
        serviceCode: smsActivateService
      }
    })

    if (error) {
      console.error('❌ [SMS-ACTIVATE] Edge Function error:', error)
      return []
    }

    const counts = data.counts || {}
    const results: CountryServiceData[] = []

    // Créer un map pour lookup rapide country ID → country info
    const countryMap = new Map(topCountries.map(c => [c.id, c]))

    // Si l'Edge Function retourne des données agrégées par pays (future optimization)
    // Sinon, on utilise le count global du service
    const serviceCount = counts[smsActivateService] || 0

    if (serviceCount > 0) {
      // Pour l'instant, on distribue le count entre tous les pays proportionnellement
      // TODO: Modifier Edge Function pour retourner counts par pays
      for (const country of topCountries) {
        results.push({
          countryCode: country.code,
          countryName: country.name,
          countryId: country.id,
          totalCount: Math.floor(serviceCount / topCountries.length), // Distribution égale
          cost: 0.5, // Fallback cost
          popularity: country.priority
        })
      }
    }

    // Sort by popularity
    results.sort((a, b) => b.popularity - a.popularity)

    console.log(`✅ [SMS-ACTIVATE] ${results.length} pays disponibles pour ${smsActivateService}`)
    
    return results
  } catch (error) {
    console.error('❌ [SMS-ACTIVATE] Error:', error)
    return []
  }
}

/**
 * Récupère le prix en temps réel pour un service dans un pays
 */
export const fetchSMSActivatePrice = async (serviceCode: string, countryCode: string): Promise<number> => {
  try {
    const smsActivateService = SERVICE_CODE_MAP[serviceCode.toLowerCase()] || serviceCode
    const countryId = COUNTRY_TO_ID[countryCode.toLowerCase()]

    if (!countryId && countryId !== 0) {
      console.warn(`⚠️ [SMS-ACTIVATE] Unknown country: ${countryCode}`)
      return 0.5
    }

    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${smsActivateService}&country=${countryId}`
    const response = await fetch(url)
    const data = await response.json()

    // Response format: { "187": { "cost": "0.50", "count": 100 } }
    if (data && data[countryId.toString()]) {
      const price = parseFloat(data[countryId.toString()].cost)
      return price
    }

    return 0.5 // Fallback
  } catch (error) {
    console.error('❌ [SMS-ACTIVATE] Price fetch error:', error)
    return 0.5
  }
}
