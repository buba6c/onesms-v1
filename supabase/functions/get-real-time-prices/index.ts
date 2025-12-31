import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

/**
 * ============================================================================
 * get-real-time-prices - Récupération des prix en temps réel depuis SMS-Activate
 * ============================================================================
 * 
 * Cette fonction remplace pricing_rules en appelant directement l'API SMS-Activate
 * pour obtenir les prix actuels sans cache ni synchronisation.
 * 
 * ENDPOINTS:
 * - getPrices: Prix d'activation par service/pays
 * - getRentServicesAndCountries: Prix de location par durée
 * 
 * CONVERSION:
 * - API retourne USD
 * - Convertir en FCFA (1 USD = 600 FCFA)
 * - Convertir en Coins (1 Coin = 10 FCFA)
 * - Appliquer marge (10% par défaut)
 * ============================================================================
 */

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// COUNTRY_CODE_MAP: Convertir nom de pays en ID SMS-Activate
const COUNTRY_CODE_MAP: Record<string, number> = {
  'russia': 0, 'ukraine': 1, 'kazakhstan': 2, 'china': 3, 'philippines': 4,
  'myanmar': 5, 'indonesia': 6, 'malaysia': 7, 'kenya': 8, 'tanzania': 9,
  'vietnam': 10, 'kyrgyzstan': 11, 'england': 12, 'uk': 12, 'united_kingdom': 12,
  'israel': 13, 'hong_kong': 14, 'hongkong': 14, 'poland': 15, 'egypt': 16,
  'nigeria': 17, 'macau': 18, 'morocco': 19, 'ghana': 20, 'argentina': 21,
  'india': 22, 'uzbekistan': 23, 'cambodia': 24, 'cameroon': 25, 'chad': 26,
  'germany': 27, 'lithuania': 28, 'croatia': 29, 'sweden': 30, 'iraq': 31,
  'romania': 32, 'colombia': 33, 'austria': 34, 'belarus': 35, 'canada': 36,
  'saudi_arabia': 37, 'saudi': 37, 'mexico': 38, 'south_africa': 39, 'spain': 40,
  'iran': 41, 'algeria': 42, 'netherlands': 43, 'bangladesh': 44, 'brazil': 45,
  'turkey': 46, 'japan': 47, 'south_korea': 48, 'korea': 48, 'taiwan': 49,
  'singapore': 50, 'uae': 51, 'united_arab_emirates': 51, 'thailand': 52,
  'pakistan': 53, 'nepal': 54, 'sri_lanka': 55, 'portugal': 56, 'new_zealand': 57,
  'italy': 58, 'belgium': 59, 'switzerland': 60, 'greece': 61, 'czech': 62,
  'czech_republic': 62, 'hungary': 63, 'denmark': 64, 'norway': 65, 'finland': 66,
  'ireland': 67, 'slovakia': 68, 'bulgaria': 69, 'serbia': 70, 'slovenia': 71,
  'north_macedonia': 72, 'macedonia': 72, 'peru': 73, 'chile': 74, 'ecuador': 75,
  'venezuela': 76, 'bolivia': 77, 'france': 78, 'paraguay': 79, 'uruguay': 80,
  'costa_rica': 81, 'panama': 82, 'dominican_republic': 83, 'el_salvador': 84,
  'guatemala': 85, 'honduras': 86, 'nicaragua': 87, 'cuba': 88, 'haiti': 89,
  'jamaica': 90, 'trinidad_and_tobago': 91, 'puerto_rico': 92, 'barbados': 93,
  'bahamas': 94, 'afghanistan': 108, 'laos': 117, 'sudan': 129, 'jordan': 141,
  'palestine': 163, 'bahrain': 165, 'ethiopia': 172, 'australia': 175,
  'usa': 187, 'united_states': 187
}

// Convertir nom pays -> ID numérique SMS-Activate
function getCountryId(country: string): string {
  // Si déjà numérique, utiliser tel quel
  if (/^\d+$/.test(country)) {
    return country
  }
  const normalized = country.toLowerCase().replace(/[\s-]+/g, '_')
  const id = COUNTRY_CODE_MAP[normalized]
  return id !== undefined ? String(id) : country
}

// Constants de conversion
const USD_TO_FCFA = 600
const FCFA_TO_COINS = 10
const MARGIN_PERCENTAGE = 10 // 10% de marge

interface PriceResult {
  serviceCode: string
  countryCode: string
  priceUSD: number
  priceFCFA: number
  priceCoins: number
  count: number
  type: 'activation' | 'rental'
}

/**
 * Convertir prix USD → Coins avec marge
 * Prix minimum: 5 Ⓐ pour tous les services
 */
const MIN_PRICE_COINS = 5

function convertPrice(priceUSD: number): number {
  const priceFCFA = priceUSD * USD_TO_FCFA
  const priceCoins = priceFCFA / FCFA_TO_COINS
  const priceWithMargin = priceCoins * (1 + MARGIN_PERCENTAGE / 100)
  // Appliquer le prix minimum de 5 Ⓐ
  return Math.max(MIN_PRICE_COINS, Math.ceil(priceWithMargin))
}

serve(async (req) => {
  console.log('💰 [GET-PRICES] Function called')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'activation' // activation | rental
    const serviceCode = url.searchParams.get('service')
    const countryCodeParam = url.searchParams.get('country')
    
    // Convertir nom pays en ID numérique SMS-Activate
    const countryId = countryCodeParam ? getCountryId(countryCodeParam) : null

    console.log('📊 [GET-PRICES] Request:', { type, serviceCode, countryCodeParam, countryId })

    if (!SMS_ACTIVATE_API_KEY) {
      throw new Error('SMS_ACTIVATE_API_KEY not configured')
    }

    const results: PriceResult[] = []

    // ========================================================================
    // ACTIVATION PRICES
    // ========================================================================
    if (type === 'activation' || type === 'all') {
      console.log('📱 [GET-PRICES] Fetching activation prices...')

      // Si service + country spécifiés, récupérer prix précis
      if (serviceCode && countryId) {
        const pricesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${serviceCode}&country=${countryId}`
        
        try {
          const response = await fetch(pricesUrl)
          const data = await response.json()

          console.log('💰 [GET-PRICES] API Response for specific:', JSON.stringify(data).slice(0, 500))

          // Format: { "0": { "wa": { "cost": "0.50", "count": 100 } } }
          // OR: { "0": { "cost": "0.50", "count": 100 } }
          if (data && data[countryId]) {
            const countryData = data[countryId]
            
            // Si service spécifique
            if (countryData[serviceCode]) {
              const priceData = countryData[serviceCode]
              const priceUSD = parseFloat(priceData.cost || priceData.price || 0)
              const count = parseInt(priceData.count || 0)

              results.push({
                serviceCode,
                countryCode: countryCodeParam || countryId,
                priceUSD,
                priceFCFA: priceUSD * USD_TO_FCFA,
                priceCoins: convertPrice(priceUSD),
                count,
                type: 'activation'
              })
            }
            // Si pas de service spécifique, prendre le premier
            else if (countryData.cost) {
              const priceUSD = parseFloat(countryData.cost)
              const count = parseInt(countryData.count || 0)

              results.push({
                serviceCode: serviceCode || 'unknown',
                countryCode: countryCodeParam || countryId,
                priceUSD,
                priceFCFA: priceUSD * USD_TO_FCFA,
                priceCoins: convertPrice(priceUSD),
                count,
                type: 'activation'
              })
            }
          }
        } catch (e) {
          console.error('❌ [GET-PRICES] Failed to fetch activation price:', e)
        }
      }
      // Sinon, récupérer tous les prix d'un pays
      else if (countryId) {
        const pricesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&country=${countryId}`
        
        console.log('📡 [GET-PRICES] Fetching all services for country:', countryId, 'URL:', pricesUrl.replace(SMS_ACTIVATE_API_KEY!, '***'))
        
        try {
          const response = await fetch(pricesUrl)
          const data = await response.json()

          console.log('💰 [GET-PRICES] API Response for country:', JSON.stringify(data).slice(0, 500))

          // Format: { "0": { "wa": { "cost": "0.50", "count": 100 }, "tg": {...} } }
          if (data && data[countryId]) {
            const services = data[countryId]
            
            for (const [svc, svcData] of Object.entries(services)) {
              const priceData = svcData as any
              const priceUSD = parseFloat(priceData.cost || priceData.price || 0)
              const count = parseInt(priceData.count || 0)

              if (priceUSD > 0) {
                results.push({
                  serviceCode: svc,
                  countryCode: countryCodeParam || countryId,
                  priceUSD,
                  priceFCFA: priceUSD * USD_TO_FCFA,
                  priceCoins: convertPrice(priceUSD),
                  count,
                  type: 'activation'
                })
              }
            }
          }
        } catch (e) {
          console.error('❌ [GET-PRICES] Failed to fetch country prices:', e)
        }
      }
    }

    // ========================================================================
    // RENTAL PRICES
    // ========================================================================
    if (type === 'rental' || type === 'all') {
      console.log('🏠 [GET-PRICES] Fetching rental prices...')

      const rentUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries`
      
      // Ajouter paramètres optionnels
      const rentParams = new URLSearchParams()
      if (countryCode) rentParams.append('country', countryCode)
      
      try {
        const response = await fetch(`${rentUrl}&${rentParams.toString()}`)
        const data = await response.json()

        console.log('🏠 [GET-PRICES] Rent API Response:', data)

        // Format: { "services": { "full": { "cost": 42.93, "quant": 20 }, "wa": {...} } }
        if (data && data.services) {
          for (const [svc, svcData] of Object.entries(data.services)) {
            const rentalData = svcData as any
            const priceUSD = parseFloat(rentalData.cost || 0)
            const count = parseInt(rentalData.quant || rentalData.count || 0)

            if (priceUSD > 0) {
              results.push({
                serviceCode: svc,
                countryCode: countryCode || (data.countries && data.countries[0]) || 'unknown',
                priceUSD,
                priceFCFA: priceUSD * USD_TO_FCFA,
                priceCoins: convertPrice(priceUSD),
                count,
                type: 'rental'
              })
            }
          }
        }
      } catch (e) {
        console.error('❌ [GET-PRICES] Failed to fetch rental prices:', e)
      }
    }

    console.log(`✅ [GET-PRICES] Returning ${results.length} prices`)

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        meta: {
          usdToFcfa: USD_TO_FCFA,
          fcfaToCoins: FCFA_TO_COINS,
          marginPercentage: MARGIN_PERCENTAGE
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [GET-PRICES] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
