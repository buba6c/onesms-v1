import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'

// Cache system
let cachedSettings: Record<string, string> | null = null;
let lastSettingsFetch = 0;
const SETTINGS_TTL = 60 * 1000;

let apiCache: Record<string, { data: any, timestamp: number }> = {};
const API_CACHE_TTL = 2 * 60 * 1000; // Cache API responses for 2 minutes to prevent 429

// Supabase client pour récupérer les settings
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

async function getSystemSettings(): Promise<Record<string, string>> {
    const now = Date.now();
    if (cachedSettings && (now - lastSettingsFetch < SETTINGS_TTL)) {
        return cachedSettings;
    }
    try {
        const { data, error } = await supabase.from('system_settings').select('key, value');
        if (error) throw error;
        const newSettings: Record<string, string> = {};
        if (data) {
            data.forEach((row: any) => { newSettings[row.key] = row.value; });
        }
        cachedSettings = newSettings;
        lastSettingsFetch = now;
        return cachedSettings;
    } catch (err) {
        console.error('❌ Error fetching settings:', err);
        return cachedSettings || {};
    }
}

interface TopCountryData {
  countryId: number
  countryCode: string
  countryName: string
  count: number
  price: number
  retailPrice: number
  share: number
  successRate: number
  rank: number
  compositeScore: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { service } = await req.json()

    if (!service) {
      return new Response(
        JSON.stringify({ error: 'Service code is required', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 🔑 Get settings with cache
    const settings = await getSystemSettings();
    let SMS_ACTIVATE_API_KEY = settings['sms_activate_api_key'] || Deno.env.get('SMS_ACTIVATE_API_KEY') || '';

    if (!SMS_ACTIVATE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'SMS-Activate (HeroSMS) API key not configured', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 💰 Récupérer la marge depuis system_settings (défaut 30%)
    const marginPercentage = settings['pricing_margin_percentage'] ? parseFloat(settings['pricing_margin_percentage']) : 30
    ; (req as any).__marginPercentage = marginPercentage

    console.log(`🏆 [TOP-COUNTRIES] Getting top countries for service: ${service} (Marge: ${marginPercentage}%)`)

    // Check Cache for API Response
    const cacheKey = `top_countries_${service}`;
    const now = Date.now();
    if (apiCache[cacheKey] && (now - apiCache[cacheKey].timestamp < API_CACHE_TTL)) {
      console.log('⚡ [TOP-COUNTRIES] Returning cached response to avoid 429')
      return new Response(apiCache[cacheKey].data, { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // 1️⃣ Try getTopCountriesByServiceRank first (may not be supported by all providers)
    console.log('📊 [TOP-COUNTRIES] Fetching ranked countries with prices...')
    const rankUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getTopCountriesByServiceRank&service=${service}&freePrice=true`
    const rankResponse = await fetch(rankUrl)

    if (!rankResponse.ok) {
      if (rankResponse.status === 429) {
        console.warn('⚠️ [TOP-COUNTRIES] Rate limit hit (429). Check your API usage.')
        if (apiCache[cacheKey]) {
           return new Response(apiCache[cacheKey].data, { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
        }
      }
      throw new Error(`API Error: ${rankResponse.status}`)
    }

    const rankText = await rankResponse.text()

    // Check for plain text error responses
    if (rankText === 'BAD_ACTION' || rankText === 'BAD_KEY' || rankText === 'NO_ACTIVATION') {
      console.warn(`⚠️ [TOP-COUNTRIES] Action not supported or API error: ${rankText}`)

      // Fallback to getPrices which is universally supported
      console.log('🔄 [TOP-COUNTRIES] Falling back to getPrices...')
      const pricesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${service}`
      const pricesResponse = await fetch(pricesUrl)
      const pricesText = await pricesResponse.text()

      // Check for text errors in fallback too
      if (pricesText.startsWith('BAD_') || pricesText.startsWith('NO_') || pricesText === 'ERROR') {
        console.error(`❌ [TOP-COUNTRIES] getPrices also failed: ${pricesText}`)
        return new Response(
          JSON.stringify({
            success: true,
            service,
            countries: [],
            message: `API error: ${pricesText}. Please check your HeroSMS API key.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      let pricesData: any
      try {
        pricesData = JSON.parse(pricesText)
      } catch (e) {
        console.error(`❌ [TOP-COUNTRIES] Failed to parse getPrices response: ${pricesText.substring(0, 100)}`)
        return new Response(
          JSON.stringify({
            success: true,
            service,
            countries: [],
            message: 'Failed to parse API response'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      // getPrices returns: { "countryId": { "service": { "cost": "0.50", "count": 100 } } }
      // We need to transform this to our format
      console.log(`✅ [TOP-COUNTRIES] getPrices returned data for ${Object.keys(pricesData).length} countries`)

      // 🗺️ Get country names (with cache)
      const countriesCacheKey = 'all_countries';
      let allCountriesText = '';
      if (apiCache[countriesCacheKey] && (now - apiCache[countriesCacheKey].timestamp < API_CACHE_TTL * 10)) {
         allCountriesText = apiCache[countriesCacheKey].data;
      } else {
         const countriesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`
         const countriesResponse = await fetch(countriesUrl)
         if (countriesResponse.ok) {
             allCountriesText = await countriesResponse.text()
             apiCache[countriesCacheKey] = { data: allCountriesText, timestamp: now };
         }
      }

      let allCountriesData: any = {}
      try {
        allCountriesData = JSON.parse(allCountriesText)
      } catch (e) {
        console.warn('⚠️ [TOP-COUNTRIES] Failed to parse countries')
      }

      const countryMap: Record<number, { code: string, name: string }> = {}
      Object.entries(allCountriesData).forEach(([id, country]: [string, any]) => {
        countryMap[parseInt(id)] = {
          code: country.eng?.toLowerCase().replace(/\s+/g, '_') || 'unknown',
          name: country.eng || 'Unknown'
        }
      })

      const MIN_PRICE_COINS = 10
      const USD_TO_FCFA = 600
      const FCFA_TO_COINS = 100
      const marginMultiplier = 1 + marginPercentage / 100

      const topCountries: TopCountryData[] = []

      Object.entries(pricesData).forEach(([countryId, data]: [string, any]) => {
        const cid = parseInt(countryId)
        const countryInfo = countryMap[cid]
        if (!countryInfo) return

        // data can be { "cost": "0.50", "count": 100 } or { "service": { "cost": ..., "count": ... } }
        let cost = 0
        let count = 0

        if (data[service]) {
          cost = parseFloat(data[service].cost) || 0
          count = parseInt(data[service].count) || 0
        } else if (data.cost !== undefined) {
          cost = parseFloat(data.cost) || 0
          count = parseInt(data.count) || 0
        }

        if (count <= 0) return

        const priceFCFA = cost * USD_TO_FCFA
        const baseCoins = (priceFCFA / FCFA_TO_COINS) * marginMultiplier

        // 1. Minimum logique (jamais sous 10)
        let finalPrice = Math.max(10, Math.ceil(baseCoins))

        // 2. Scaling pour étirer entre 10 et 70
        if (finalPrice < 70) {
            const perceivedMarkup = Math.ceil(baseCoins * 3.5)
            finalPrice = Math.max(10, Math.min(70, 10 + perceivedMarkup))
        }

        // 3. Modificateur Pays Premium
        const isPremium = ['usa', 'united states', 'uk', 'united kingdom', 'france', 'germany', 'canada', 'spain', 'italy', 'netherlands'].includes(countryInfo.name.toLowerCase())
        if (isPremium && finalPrice < 45) {
            finalPrice = 45 + (cid % 26) // 45 à 70
        }

        // 4. Jitter Déterministe pour variété visuelle sur tous les pays
        if (!isPremium && finalPrice <= 25) {
            const jitter = (cid + service.length * 7) % 36 // 0 à 35
            finalPrice = Math.min(70, Math.max(10, 15 + jitter))
        }

        const price = finalPrice

        topCountries.push({
          countryId: cid,
          countryCode: countryInfo.code,
          countryName: countryInfo.name,
          count,
          price,
          retailPrice: price,
          share: 0,
          successRate: null as any,
          rank: topCountries.length + 1,
          compositeScore: count > 1000 ? 80 : count > 100 ? 60 : 40
        })
      })

      // Sort by count (availability)
      topCountries.sort((a, b) => b.count - a.count)

      // Update ranks
      topCountries.forEach((c, i) => { c.rank = i + 1 })

      console.log(`🏆 [TOP-COUNTRIES] Returning ${topCountries.length} countries from getPrices fallback`)

      const finalResponseData = JSON.stringify({
        success: true,
        service,
        countries: topCountries,
        stats: {
          totalCountries: topCountries.length,
          avgSuccessRate: 0,
          avgPrice: topCountries.length > 0 ? (topCountries.reduce((sum, c) => sum + c.price, 0) / topCountries.length).toFixed(2) : 0,
          totalAvailable: topCountries.reduce((sum, c) => sum + c.count, 0)
        }
      });
      
      apiCache[cacheKey] = { data: finalResponseData, timestamp: now };

      return new Response(
        finalResponseData,
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Parse the successful JSON response
    let rankData: any
    try {
      rankData = JSON.parse(rankText)
    } catch (e) {
      console.error(`❌ [TOP-COUNTRIES] Failed to parse rankData: ${rankText.substring(0, 100)}`)
      return new Response(
        JSON.stringify({
          success: true,
          service,
          countries: [],
          message: 'Failed to parse API response'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Gérer le cas où le service n'existe pas
    if (rankData.error || Object.keys(rankData).length === 0) {
      console.warn(`⚠️ [TOP-COUNTRIES] No data for service ${service}`)
      return new Response(
        JSON.stringify({
          success: true,
          service,
          countries: [],
          message: 'No countries available for this service'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`✅ [TOP-COUNTRIES] Found ${Object.keys(rankData).length} ranked countries`)

    // NOTE: getListOfTopCountriesByService is NOT supported by HeroSMS
    // We skip this call and just use the rank data from getTopCountriesByServiceRank
    let statsData: any[] = []

    // 3️⃣ Récupérer le mapping des noms de pays (with cache)
    console.log('🗺️ [TOP-COUNTRIES] Fetching country names...')
    const countriesCacheKey = 'all_countries';
    let allCountriesData: any = {};
    if (apiCache[countriesCacheKey] && (now - apiCache[countriesCacheKey].timestamp < API_CACHE_TTL * 10)) {
       allCountriesData = JSON.parse(apiCache[countriesCacheKey].data);
    } else {
       const countriesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`
       const countriesResponse = await fetch(countriesUrl)
       if (countriesResponse.ok) {
           const text = await countriesResponse.text()
           apiCache[countriesCacheKey] = { data: text, timestamp: now };
           allCountriesData = JSON.parse(text);
       }
    }
    const countryMap: Record<number, { code: string, name: string }> = {}

    Object.entries(allCountriesData).forEach(([id, country]: [string, any]) => {
      countryMap[parseInt(id)] = {
        code: country.eng.toLowerCase().replace(/\s+/g, '_'),
        name: country.eng
      }
    })

    console.log(`✅ [TOP-COUNTRIES] Loaded ${Object.keys(countryMap).length} country names`)

    // 4️⃣ Merger les données et calculer le score composite
    const topCountries: TopCountryData[] = []

    Object.entries(rankData).forEach(([index, countryData]: [string, any]) => {
      const countryId = countryData.country
      const countryInfo = countryMap[countryId]

      if (!countryInfo) {
        console.warn(`⚠️ [TOP-COUNTRIES] Unknown country ID: ${countryId}`)
        return
      }

      // Trouver les stats de performance
      const stats = statsData.find((s: any) => s.country === countryId)

      const share = stats?.share || 0
      // ✅ CORRECTION: Ne pas mettre 95% par défaut si pas de stats
      // On laissera le frontend utiliser notre DB ou ne rien afficher
      const successRate = stats?.rate || null
      const rank = parseInt(index) + 1
      const count = countryData.count || 0

      // 💵 CONVERSION AUTOMATIQUE DES PRIX
      // Prix SMS-Activate en $ → FCFA → Pièces (Ⓐ)
      // Prix minimum: 10 Ⓐ pour tous les services
      const MIN_PRICE_COINS = 10
      const priceUSD = countryData.price || 0
      const USD_TO_FCFA = 600  // 1$ = 600 FCFA
      const FCFA_TO_COINS = 100  // 1Ⓐ = 100 FCFA

      // Récupérer la marge depuis system_settings (défaut 30%)
      const marginMultiplier = 1 + ((req as any).__marginPercentage || 30) / 100

      // Calcul: $0.50 × 600 = 300 FCFA ÷ 100 = 3Ⓐ × 1.3 = 3.9Ⓐ
      const priceFCFA = priceUSD * USD_TO_FCFA
      const baseCoins = (priceFCFA / FCFA_TO_COINS) * marginMultiplier

      // 1. Minimum logique (jamais sous 10)
      let finalPrice = Math.max(10, Math.ceil(baseCoins))

      // 2. Scaling pour étirer entre 10 et 70
      if (finalPrice < 70) {
          const perceivedMarkup = Math.ceil(baseCoins * 3.5)
          finalPrice = Math.max(10, Math.min(70, 10 + perceivedMarkup))
      }

      // 3. Modificateur Pays Premium
      const isPremium = ['usa', 'united states', 'uk', 'united kingdom', 'france', 'germany', 'canada', 'spain', 'italy', 'netherlands'].includes(countryInfo.name.toLowerCase())
      if (isPremium && finalPrice < 45) {
          finalPrice = 45 + (countryId % 26) // 45 à 70
      }

      // 4. Jitter Déterministe pour variété visuelle sur tous les pays
      if (!isPremium && finalPrice <= 25) {
          const jitter = (countryId + service.length * 7) % 36 // 0 à 35
          finalPrice = Math.min(70, Math.max(10, 15 + jitter))
      }

      const price = finalPrice
      const retailPrice = price

      // Calcul du score composite
      // ✅ CORRECTION: Utiliser UNIQUEMENT ranking + disponibilité + prix
      // Le success rate et share de getListOfTopCountriesByService ne matchent pas avec getTopCountriesByServiceRank
      // Donc on se base sur le ranking SMS-Activate qui est plus fiable
      const rankingScore = Math.max(0, 100 - rank)  // 100 points pour #1, 99 pour #2, etc.
      const availabilityBonus = count > 1000 ? 20 : count > 100 ? 10 : count > 0 ? 5 : 0  // 0-20 bonus
      const priceBonus = price > 0 ? Math.max(0, 10 - (price * 2)) : 0  // Prix bas = bonus élevé (0-10)

      const compositeScore = rankingScore + availabilityBonus + priceBonus

      topCountries.push({
        countryId,
        countryCode: countryInfo.code,
        countryName: countryInfo.name,
        count,  // Quantité de numéros disponibles chez SMS-Activate
        price,  // Prix en pièces (Ⓐ)
        retailPrice,
        share,
        successRate,
        rank,
        compositeScore
      })
    })

    // 5️⃣ Trier par score composite (décroissant)
    topCountries.sort((a, b) => b.compositeScore - a.compositeScore)

    console.log(`🏆 [TOP-COUNTRIES] Top 5 by composite score:`)
    topCountries.slice(0, 5).forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.countryName} - Score: ${c.compositeScore.toFixed(1)} (Price: ${c.price}Ⓐ, Count: ${c.count}, Rank: ${c.rank})`)
    })

    const finalSuccessResponse = JSON.stringify({
      success: true,
      service,
      countries: topCountries,
      stats: {
        totalCountries: topCountries.length,
        avgSuccessRate: (topCountries.reduce((sum, c) => sum + (c.successRate || 0), 0) / topCountries.length).toFixed(1),
        avgPrice: (topCountries.reduce((sum, c) => sum + c.price, 0) / topCountries.length).toFixed(2),
        totalAvailable: topCountries.reduce((sum, c) => sum + c.count, 0)
      }
    });

    apiCache[cacheKey] = { data: finalSuccessResponse, timestamp: now };

    return new Response(
      finalSuccessResponse,
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ [TOP-COUNTRIES] Error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
