import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'
const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!

// Supabase client pour récupérer les settings
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

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
    
    // 💰 Récupérer la marge depuis system_settings (défaut 30%)
    const { data: marginSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'pricing_margin_percentage')
      .single()
    
    const marginPercentage = marginSetting?.value ? parseFloat(marginSetting.value) : 30
    ;(req as any).__marginPercentage = marginPercentage
    
    console.log(`🏆 [TOP-COUNTRIES] Getting top countries for service: ${service} (Marge: ${marginPercentage}%)`)
    
    // 1️⃣ Appeler getTopCountriesByServiceRank (considère le rang utilisateur + Free Price)
    console.log('📊 [TOP-COUNTRIES] Fetching ranked countries with prices...')
    const rankUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getTopCountriesByServiceRank&service=${service}&freePrice=true`
    const rankResponse = await fetch(rankUrl)
    
    if (!rankResponse.ok) {
      throw new Error(`API Error: ${rankResponse.status}`)
    }
    
    const rankData = await rankResponse.json()
    
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
    
    // 2️⃣ Appeler getListOfTopCountriesByService (stats de performance)
    console.log('📈 [TOP-COUNTRIES] Fetching performance stats...')
    const statsUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getListOfTopCountriesByService&service=${service}&length=50`
    const statsResponse = await fetch(statsUrl)
    
    let statsData: any[] = []
    if (statsResponse.ok) {
      statsData = await statsResponse.json()
      console.log(`✅ [TOP-COUNTRIES] Found ${statsData.length} countries with stats`)
    } else {
      console.warn('⚠️ [TOP-COUNTRIES] Failed to fetch stats, continuing without them')
    }
    
    // 3️⃣ Récupérer le mapping des noms de pays
    console.log('🗺️ [TOP-COUNTRIES] Fetching country names...')
    const countriesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`
    const countriesResponse = await fetch(countriesUrl)
    
    const allCountriesData = await countriesResponse.json()
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
      const priceUSD = countryData.price || 0
      const USD_TO_FCFA = 600  // 1$ = 600 FCFA
      const FCFA_TO_COINS = 100  // 1Ⓐ = 100 FCFA
      
      // Récupérer la marge depuis system_settings (défaut 30%)
      const marginMultiplier = 1 + ((req as any).__marginPercentage || 30) / 100
      
      // Calcul: $0.50 × 600 = 300 FCFA ÷ 100 = 3Ⓐ × 1.3 = 3.9Ⓐ
      const priceFCFA = priceUSD * USD_TO_FCFA
      const priceCoins = (priceFCFA / FCFA_TO_COINS) * marginMultiplier
      const price = Math.ceil(priceCoins)  // Arrondir au supérieur
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
    
    return new Response(
      JSON.stringify({ 
        success: true,
        service,
        countries: topCountries,
        stats: {
          totalCountries: topCountries.length,
          avgSuccessRate: (topCountries.reduce((sum, c) => sum + c.successRate, 0) / topCountries.length).toFixed(1),
          avgPrice: (topCountries.reduce((sum, c) => sum + c.price, 0) / topCountries.length).toFixed(2),
          totalAvailable: topCountries.reduce((sum, c) => sum + c.count, 0)
        }
      }),
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
