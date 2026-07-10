// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Grizzly API (Grizzly compatible)
const GRIZZLY_BASE_URL = 'https://api.grizzlysms.com/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// COUNTRY_CODE_MAP
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

function getCountryId(country: string): string {
  if (/^\d+$/.test(country)) return country
  const normalized = country.toLowerCase().replace(/[\s-]+/g, '_')
  const id = COUNTRY_CODE_MAP[normalized]
  return id !== undefined ? String(id) : country
}

const USD_TO_FCFA = 600
const FCFA_TO_COINS = 10
const MARGIN_PERCENTAGE = 10
const MIN_PRICE_COINS = 10

interface PriceResult {
  serviceCode: string
  countryCode: string
  priceUSD: number
  priceFCFA: number
  priceCoins: number
  count: number
  type: 'activation' | 'rental'
}

function convertPrice(priceUSD: number, countryCode: string = '', serviceCode: string = ''): number {
  const priceFCFA = priceUSD * USD_TO_FCFA
  const baseCoins = (priceFCFA / FCFA_TO_COINS) * (1 + MARGIN_PERCENTAGE / 100)

  // 1. Minimum logique (jamais sous 10)
  let finalPrice = Math.max(10, Math.ceil(baseCoins))

  // 2. Scaling pour étirer entre 10 et 70
  if (finalPrice < 70) {
      const perceivedMarkup = Math.ceil(baseCoins * 3.5)
      finalPrice = Math.max(10, Math.min(70, 10 + perceivedMarkup))
  }

  // 3. Modificateur Pays Premium
  const isPremium = ['usa', 'united states', 'us', 'uk', 'united kingdom', 'gb', 'france', 'fr', 'germany', 'de', 'canada', 'ca', 'spain', 'es', 'italy', 'it', 'netherlands', 'nl'].includes(countryCode.toLowerCase())
  const hash = (countryCode.charCodeAt(0) || 0) + (serviceCode.length * 7 || 0)

  if (isPremium && finalPrice < 45) {
      finalPrice = 45 + (hash % 26) // 45 à 70
  }

  // 4. Jitter Déterministe pour variété visuelle sur tous les pays
  if (!isPremium && finalPrice <= 25) {
      const jitter = hash % 36 // 0 à 35
      finalPrice = Math.min(70, Math.max(10, 15 + jitter))
  }

  return finalPrice
}

serve(async (req) => {
  console.log('💰 [GET-PRICES] Function called')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // CRITICAL FIX: Support BOTH invocation methods
    // 1. POST body (cloudFunctions.invoke): { type, service, country }
    // 2. GET query params (direct HTTP): ?type=...&service=...

    let type = 'activation'
    let serviceCode: string | null = null
    let countryCodeParam: string | null = null

    // Try POST body first
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        type = body.type || 'activation'
        serviceCode = body.service || null
        countryCodeParam = body.country || null
        console.log('📊 [GET-PRICES] POST body:', { type, serviceCode, countryCodeParam })
      } catch (e) {
        console.warn('⚠️ [GET-PRICES] Body parse failed')
      }
    }

    // Fallback to URL params
    if (!serviceCode && !countryCodeParam) {
      const url = new URL(req.url)
      type = url.searchParams.get('type') || 'activation'
      serviceCode = url.searchParams.get('service')
      countryCodeParam = url.searchParams.get('country')
      console.log('📊 [GET-PRICES] URL params:', { type, serviceCode, countryCodeParam })
    }

    const countryCode = countryCodeParam
    const countryId = countryCodeParam ? getCountryId(countryCodeParam) : null

    console.log('📊 [GET-PRICES] Final:', { type, serviceCode, countryId })

    // Get API key from DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Grizzly API key from DB (prioritized over Grizzly)
    let GRIZZLY_API_KEY = Deno.env.get('GRIZZLY_API_KEY')
    const { data: apiKeySetting } = await supabase.from('system_settings').select('value').eq('key', 'grizzly_api_key').maybeSingle()
    if (apiKeySetting?.value) GRIZZLY_API_KEY = apiKeySetting.value

    if (!GRIZZLY_API_KEY) {
      throw new Error('Grizzly API key not configured')
    }

    const results: PriceResult[] = []

    // ACTIVATION PRICES
    if (type === 'activation' || type === 'all') {
      console.log('📱 [GET-PRICES] Fetching activation prices...')

      // Service + Country specific
      if (serviceCode && countryId) {
        const url = `${GRIZZLY_BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getPrices&service=${serviceCode}&country=${countryId}`
        try {
          const response = await fetch(url)
          const data = await response.json()
          if (data && data[countryId]) {
            const countryData = data[countryId]
            if (countryData[serviceCode]) {
              const priceData = countryData[serviceCode]
              const priceUSD = parseFloat(priceData.cost || priceData.price || 0)
              const count = parseInt(priceData.count || 0)
              results.push({ serviceCode, countryCode: countryCodeParam || countryId, priceUSD, priceFCFA: priceUSD * USD_TO_FCFA, priceCoins: convertPrice(priceUSD, countryCodeParam || countryId, serviceCode), count, type: 'activation' })
            } else if (countryData.cost) {
              const priceUSD = parseFloat(countryData.cost)
              const count = parseInt(countryData.count || 0)
              results.push({ serviceCode: serviceCode || 'unknown', countryCode: countryCodeParam || countryId, priceUSD, priceFCFA: priceUSD * USD_TO_FCFA, priceCoins: convertPrice(priceUSD, countryCodeParam || countryId, serviceCode || 'unknown'), count, type: 'activation' })
            }
          }
        } catch (e) { console.error('❌ [GET-PRICES] Grizzly error:', e) }
      }

      // Service only (fetch all countries for this service)
      else if (serviceCode && !countryId) {
        console.log('🌍 [GET-PRICES] Fetching ALL countries for service:', serviceCode)

        // 5sim fallback
        const FIVESIM_API_KEY = Deno.env.get('FIVESIM_API_KEY')
        const { data: fivesimKeySetting } = await supabase.from('system_settings').select('value').eq('key', '5sim_api_key').maybeSingle()
        const final5simKey = fivesimKeySetting?.value || FIVESIM_API_KEY

        if (final5simKey) {
          try {
            console.log('🔹 [GET-PRICES] Fetching 5sim prices...')
            const response = await fetch(`https://5sim.net/v1/guest/prices?product=${serviceCode}`, {
              headers: { 'Authorization': `Bearer ${final5simKey}` }
            })
            const data = await response.json()

            if (data && !data.error) {
              Object.entries(data).forEach(([country, products]: [string, any]) => {
                if (products && products[serviceCode]) {
                  const pData = products[serviceCode]
                  let cost = 0
                  let count = 0

                  if (pData.cost) {
                    cost = parseFloat(pData.cost)
                    count = parseInt(pData.count || 0)
                  } else {
                    let minCost = 999
                    let totalCount = 0
                    Object.values(pData).forEach((prov: any) => {
                      if (prov.cost) {
                        minCost = Math.min(minCost, parseFloat(prov.cost))
                        totalCount += parseInt(prov.count || 0)
                      }
                    })
                    if (minCost < 999) {
                      cost = minCost
                      count = totalCount
                    }
                  }

                  if (cost > 0 && count > 0) {
                    const priceUSD = cost * 0.011 // RUB to USD
                    results.push({
                      serviceCode,
                      countryCode: country,
                      priceUSD,
                      priceFCFA: priceUSD * USD_TO_FCFA,
                      priceCoins: convertPrice(priceUSD, country, serviceCode),
                      count,
                      type: 'activation'
                    })
                  }
                }
              })
            }
          } catch (e) {
            console.error('❌ [GET-PRICES] 5sim error:', e)
          }
        }
      }

      // Country only (all services)
      else if (countryId) {
        const url = `${GRIZZLY_BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getPrices&country=${countryId}`
        try {
          const response = await fetch(url)
          const data = await response.json()
          if (data && data[countryId]) {
            const services = data[countryId]
            for (const [svc, svcData] of Object.entries(services)) {
              const priceData = svcData as any
              const priceUSD = parseFloat(priceData.cost || priceData.price || 0)
              const count = parseInt(priceData.count || 0)
              if (priceUSD > 0) {
                results.push({ serviceCode: svc, countryCode: countryCodeParam || countryId, priceUSD, priceFCFA: priceUSD * USD_TO_FCFA, priceCoins: convertPrice(priceUSD, countryCodeParam || countryId, svc), count, type: 'activation' })
              }
            }
          }
        } catch (e) { console.error('❌ [GET-PRICES] Country prices error:', e) }
      }
    }

    // RENTAL PRICES
    if (type === 'rental' || type === 'all') {
      console.log('🏠 [GET-PRICES] Fetching rental prices...')
      const rentUrl = `${GRIZZLY_BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getRentServicesAndCountries`
      const rentParams = new URLSearchParams()
      if (countryCode) rentParams.append('country', countryCode)

      try {
        const response = await fetch(`${rentUrl}&${rentParams.toString()}`)
        const data = await response.json()
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
                priceCoins: convertPrice(priceUSD, countryCode || (data.countries && data.countries[0]) || 'unknown', svc),
                count,
                type: 'rental'
              })
            }
          }
        }
      } catch (e) { console.error('❌ [GET-PRICES] Rental error:', e) }
    }

    console.log(`✅ [GET-PRICES] Returning ${results.length} prices`)

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        meta: { usdToFcfa: USD_TO_FCFA, fcfaToCoins: FCFA_TO_COINS, marginPercentage: MARGIN_PERCENTAGE }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('❌ [GET-PRICES] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
