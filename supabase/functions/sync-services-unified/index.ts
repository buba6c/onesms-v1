import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'

/**
 * 🎯 FONCTION DE SYNCHRONISATION UNIFIÉE INTELLIGENTE
 * 
 * Cette fonction remplace sync-all-services, sync-sms-activate et sync-rent-services
 * Elle synchronise intelligemment:
 * 1. Services ACTIVATION via getPrices (activation SMS)
 * 2. Services RENT via getRentServicesAndCountries (location de numéro)
 * 3. Prix avec conversion unifiée: USD → FCFA → Coins (Ⓐ) + marge système
 * 
 * FLUX DE SYNCHRONISATION:
 * - Récupère la marge système depuis system_settings
 * - Fetch services activation (getPrices pour TOP 50 pays)
 * - Fetch services rent (getRentServicesAndCountries pour pays RENT)
 * - Merge intelligemment les données (un service peut avoir activation ET rent)
 * - Applique la conversion de prix unifiée
 * - Stocke dans pricing_rules avec distinction activation_price vs rent_price
 */

interface ServiceData {
  code: string
  name: string
  category: string
  icon: string
  activationAvailable: boolean
  rentAvailable: boolean
  activationCount: number
  rentCount: number
  popularityScore: number
}

interface PricingData {
  serviceCode: string
  countryCode: string
  countryId: number
  activationPriceUSD?: number
  rentPriceUSD?: number
  activationCount?: number
  rentCount?: number
}

// 🎨 Service icon mapping (basé sur les services SMS-Activate officiels)
const SERVICE_ICONS: Record<string, string> = {
  wa: '💬', tg: '✈️', ig: '📷', fb: '👤', go: '🔍', tw: '🐦',
  ds: '💬', vi: '💜', wb: '💬', me: '📝', vk: '🔵', ok: '🟠',
  mm: '🪟', mb: '📧', wx: '', am: '📦', nf: '🎬', ub: '🚗',
  tk: '🎥', sn: '👻', ld: '💼', ts: '💳', st: '🎮', oi: '🔥',
  mo: '💛', bd: '💕', hw: '💰', dr: '🤖', lf: '🎥', fu: '👻',
  ka: '🛒', dl: '🛒', jg: '🚗', ni: '🏍️', gr: '💕', bo: '✈️',
  full: '🏠', any: '📱'
}

// 📂 Service category mapping (intelligent categorization)
const SERVICE_CATEGORIES: Record<string, string> = {
  // Messaging
  wa: 'messaging', tg: 'messaging', vi: 'messaging', ds: 'messaging', 
  wb: 'messaging', me: 'messaging', sk: 'messaging', sl: 'messaging',
  
  // Social
  ig: 'social', fb: 'social', tw: 'social', tk: 'social', sn: 'social',
  ld: 'social', vk: 'social', ok: 'social', rd: 'social', fu: 'social',
  
  // Tech
  go: 'tech', mm: 'tech', mb: 'tech', wx: 'tech', dr: 'tech', ya: 'tech',
  
  // Shopping
  am: 'shopping', ka: 'shopping', dl: 'shopping', dh: 'shopping', wr: 'shopping',
  
  // Entertainment
  nf: 'entertainment', st: 'entertainment', yo: 'entertainment', sp: 'entertainment',
  
  // Dating
  oi: 'dating', mo: 'dating', bd: 'dating', gr: 'dating', vz: 'dating',
  
  // Delivery/Transport
  ub: 'delivery', jg: 'delivery', ni: 'delivery', um: 'delivery', dd: 'delivery',
  
  // Finance
  ts: 'finance', hw: 'finance', pm: 'finance', bc: 'crypto', bn: 'crypto',
  
  // Rent-specific
  full: 'rent', any: 'rent'
}

// 🌍 Country mapping (SMS-Activate country IDs → codes)
const COUNTRY_ID_TO_CODE: Record<number, string> = {
  0: 'russia', 1: 'ukraine', 2: 'kazakhstan', 3: 'china', 4: 'philippines',
  5: 'myanmar', 6: 'indonesia', 7: 'malaysia', 8: 'kenya', 9: 'tanzania',
  10: 'vietnam', 11: 'kyrgyzstan', 12: 'england', 14: 'israel', 15: 'poland',
  16: 'hk', 17: 'morocco', 18: 'egypt', 19: 'nigeria', 20: 'macao',
  21: 'india', 22: 'ireland', 32: 'romania', 33: 'colombia', 36: 'canada',
  39: 'argentina', 43: 'germany', 45: 'brazil', 46: 'turkey', 52: 'thailand',
  56: 'spain', 58: 'italy', 62: 'southafrica', 73: 'brazil', 78: 'france',
  79: 'netherlands', 80: 'ghana', 82: 'mexico', 88: 'bangladesh', 90: 'pakistan',
  94: 'turkey', 108: 'philippines', 109: 'nigeria', 115: 'egypt', 132: 'uae',
  135: 'iraq', 168: 'chile', 174: 'singapore', 175: 'australia', 177: 'newzealand',
  187: 'usa'
}

// 📊 Fonction: Calcul du score de popularité basé sur la position API
function calculatePopularityScore(index: number, totalCount: number): number {
  // Les premiers services ont un score plus élevé (1000 → 1)
  return Math.max(1, 1000 - index)
}

// 💵 Fonction: Conversion de prix unifiée (USD → Coins avec marge)
// Prix minimum: 5 Ⓐ pour tous les services
const MIN_PRICE_COINS = 5

function convertPrice(priceUSD: number, marginPercentage: number): number {
  const USD_TO_FCFA = 600  // 1 USD = 600 FCFA
  const FCFA_TO_COINS = 100  // 1 Coin (Ⓐ) = 100 FCFA
  
  const priceFCFA = priceUSD * USD_TO_FCFA
  const priceCoins = priceFCFA / FCFA_TO_COINS
  const priceWithMargin = priceCoins * (1 + marginPercentage / 100)
  
  // Appliquer le prix minimum de 5 Ⓐ
  return Math.max(MIN_PRICE_COINS, Math.ceil(priceWithMargin))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!SMS_ACTIVATE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    console.log('🚀 [SYNC-UNIFIED] Démarrage de la synchronisation unifiée...')
    
    // 📊 Étape 1: Récupérer la marge système depuis system_settings
    console.log('💰 [SYNC-UNIFIED] Récupération de la marge système...')
    const { data: marginSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'pricing_margin_percentage')
      .single()
    
    const marginPercentage = marginSetting?.value ? parseFloat(marginSetting.value) : 30
    console.log(`✅ [SYNC-UNIFIED] Marge système: ${marginPercentage}%`)
    
    // 📋 Étape 2: Récupérer la liste officielle des services (order + display names)
    console.log('📋 [SYNC-UNIFIED] Récupération de la liste officielle des services...')
    const servicesListUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getServicesList`
    const servicesListResponse = await fetch(servicesListUrl)
    const servicesListData = await servicesListResponse.json()
    
    const serviceDisplayNames = new Map<string, string>()
    const serviceOrder = new Map<string, number>()
    
    if (servicesListData.status === 'success' && Array.isArray(servicesListData.services)) {
      servicesListData.services.forEach((svc: any, index: number) => {
        serviceDisplayNames.set(svc.code, svc.name)
        serviceOrder.set(svc.code, calculatePopularityScore(index, servicesListData.services.length))
      })
      console.log(`✅ [SYNC-UNIFIED] Chargé ${servicesListData.services.length} services officiels`)
    }
    
    // 🌍 Étape 3: Récupérer les pays
    console.log('🌍 [SYNC-UNIFIED] Récupération des pays...')
    const countriesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`
    const countriesResponse = await fetch(countriesUrl)
    const countriesData = await countriesResponse.json()
    
    const countryNames = new Map<number, string>()
    Object.entries(countriesData).forEach(([id, country]: [string, any]) => {
      countryNames.set(parseInt(id), country.eng)
    })
    console.log(`✅ [SYNC-UNIFIED] Chargé ${countryNames.size} pays`)
    
    // 📱 Étape 4: Synchroniser les services ACTIVATION (getPrices)
    console.log('📱 [SYNC-UNIFIED] Synchronisation des services ACTIVATION...')
    
    const topCountries = [187, 36, 43, 78, 12, 22, 4, 6, 7, 10, 52, 73, 33, 39, 82, 15, 58, 56, 32, 79]
    const activationData = new Map<string, PricingData[]>() // serviceCode → pricing data array
    
    for (const countryId of topCountries) {
      try {
        const pricesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&country=${countryId}`
        const pricesResponse = await fetch(pricesUrl)
        const pricesData = await pricesResponse.json()
        
        const countryServices = pricesData[countryId.toString()] || pricesData
        
        for (const [serviceCode, priceInfo] of Object.entries(countryServices)) {
          if (!activationData.has(serviceCode)) {
            activationData.set(serviceCode, [])
          }
          
          const info = priceInfo as any
          const priceUSD = parseFloat(info.retail_cost || info.cost || info.price || '0')
          const count = parseInt(info.count || info.quantity || '0', 10)
          
          if (priceUSD > 0 && count > 0) {
            activationData.get(serviceCode)!.push({
              serviceCode,
              countryCode: COUNTRY_ID_TO_CODE[countryId] || `country_${countryId}`,
              countryId,
              activationPriceUSD: priceUSD,
              activationCount: count
            })
          }
        }
        
        console.log(`✅ [ACTIVATION] Country ${countryId}: ${Object.keys(countryServices).length} services`)
      } catch (e) {
        console.error(`❌ [ACTIVATION] Error country ${countryId}:`, e)
      }
    }
    
    console.log(`📊 [ACTIVATION] Total: ${activationData.size} services with pricing`)
    
    // 🏠 Étape 5: Synchroniser les services RENT (getRentServicesAndCountries)
    console.log('🏠 [SYNC-UNIFIED] Synchronisation des services RENT...')
    
    const rentDurations = [4, 24, 168] // 4h, 1d, 1w
    const rentData = new Map<string, PricingData[]>() // serviceCode → pricing data array
    const rentCountries = new Set<number>()
    
    // Fetch global rent services (all countries)
    for (const duration of rentDurations) {
      try {
        const rentUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&rent_time=${duration}`
        const rentResponse = await fetch(rentUrl)
        const rentResponseData = await rentResponse.json()
        
        if (rentResponseData.countries) {
          Object.values(rentResponseData.countries).forEach((id: any) => rentCountries.add(parseInt(id)))
        }
        
        if (rentResponseData.services) {
          for (const [serviceCode, serviceInfo] of Object.entries(rentResponseData.services)) {
            const info = serviceInfo as any
            const priceUSD = parseFloat(info.cost || '0')
            const count = parseInt(info.quant?.current || info.quant || '0', 10)
            
            if (priceUSD > 0) {
              if (!rentData.has(serviceCode)) {
                rentData.set(serviceCode, [])
              }
              
              // Pour les données globales, on crée des entrées génériques
              // On les affectera aux pays RENT plus tard
              rentData.get(serviceCode)!.push({
                serviceCode,
                countryCode: 'global',
                countryId: 0,
                rentPriceUSD: priceUSD,
                rentCount: count
              })
            }
          }
          
          console.log(`✅ [RENT] Duration ${duration}h: ${Object.keys(rentResponseData.services).length} services`)
        }
      } catch (e) {
        console.error(`❌ [RENT] Error duration ${duration}h:`, e)
      }
    }
    
    console.log(`📊 [RENT] Total: ${rentData.size} services with rent pricing`)
    console.log(`🌍 [RENT] Countries: ${rentCountries.size} countries support RENT`)
    
    // 🔄 Étape 6: Merger les données ACTIVATION + RENT
    console.log('🔄 [SYNC-UNIFIED] Fusion des données activation + rent...')
    
    const allServiceCodes = new Set([...activationData.keys(), ...rentData.keys()])
    const servicesToUpsert: any[] = []
    const pricingRulesToUpsert: any[] = []
    
    for (const serviceCode of allServiceCodes) {
      const activationPricing = activationData.get(serviceCode) || []
      const rentPricing = rentData.get(serviceCode) || []
      
      // Déterminer si le service a activation/rent
      const hasActivation = activationPricing.length > 0
      const hasRent = rentPricing.length > 0
      
      // Calculer totaux
      const activationCount = activationPricing.reduce((sum, p) => sum + (p.activationCount || 0), 0)
      const rentCount = rentPricing.reduce((sum, p) => sum + (p.rentCount || 0), 0)
      
      // Déterminer display name et métadonnées
      const displayName = serviceDisplayNames.get(serviceCode) || serviceCode.toUpperCase()
      const icon = SERVICE_ICONS[serviceCode] || '📱'
      const category = SERVICE_CATEGORIES[serviceCode] || 'other'
      const popularityScore = serviceOrder.get(serviceCode) || 1
      
      // Créer l'entrée service
      servicesToUpsert.push({
        code: serviceCode,
        name: displayName,
        display_name: displayName,
        category,
        icon,
        active: hasActivation || hasRent,
        total_available: activationCount + rentCount,
        popularity_score: popularityScore,
        provider: 'sms-activate',
        updated_at: new Date().toISOString()
      })
      
      // Créer les pricing rules pour ACTIVATION
      for (const pricing of activationPricing) {
        const activationPrice = convertPrice(pricing.activationPriceUSD!, marginPercentage)
        
        pricingRulesToUpsert.push({
          service_code: serviceCode,
          country_code: pricing.countryCode,
          operator: 'any',
          activation_cost: pricing.activationPriceUSD! * 0.7, // Cost pour nous (30% de marge brute)
          activation_price: activationPrice, // Prix de vente en coins
          rent_cost: 0,
          rent_price: 0,
          available_count: pricing.activationCount || 0,
          active: (pricing.activationCount || 0) > 0,
          provider: 'sms-activate',
          margin_percentage: marginPercentage,
          last_synced_at: new Date().toISOString()
        })
      }
      
      // Créer les pricing rules pour RENT
      // Si on a des données globales, on les duplique pour chaque pays RENT
      if (hasRent) {
        const avgRentPriceUSD = rentPricing.reduce((sum, p) => sum + (p.rentPriceUSD || 0), 0) / rentPricing.length
        const rentPrice = convertPrice(avgRentPriceUSD, marginPercentage)
        
        // Dupliquer pour chaque pays RENT
        for (const countryId of Array.from(rentCountries)) {
          const countryCode = COUNTRY_ID_TO_CODE[countryId] || `country_${countryId}`
          
          pricingRulesToUpsert.push({
            service_code: serviceCode,
            country_code: countryCode,
            operator: 'any',
            activation_cost: 0,
            activation_price: 0,
            rent_cost: avgRentPriceUSD * 0.7, // Cost pour nous (30% de marge brute)
            rent_price: rentPrice, // Prix de vente en coins
            available_count: rentCount / rentCountries.size, // Distribuer équitablement
            active: true,
            provider: 'sms-activate',
            margin_percentage: marginPercentage,
            last_synced_at: new Date().toISOString()
          })
        }
      }
    }
    
    console.log(`📊 [MERGE] Services à synchroniser: ${servicesToUpsert.length}`)
    console.log(`💰 [MERGE] Règles de prix à synchroniser: ${pricingRulesToUpsert.length}`)
    
    // 💾 Étape 7: Écrire dans la base de données
    console.log('💾 [SYNC-UNIFIED] Écriture dans la base de données...')
    
    // Upsert services
    if (servicesToUpsert.length > 0) {
      const { error: servicesError } = await supabase
        .from('services')
        .upsert(servicesToUpsert, { onConflict: 'code,provider' })
      
      if (servicesError) {
        console.error('❌ [SYNC-UNIFIED] Services error:', servicesError)
      } else {
        console.log(`✅ [SYNC-UNIFIED] Synced ${servicesToUpsert.length} services`)
      }
    }
    
    // Delete old pricing rules + insert new ones
    if (pricingRulesToUpsert.length > 0) {
      await supabase
        .from('pricing_rules')
        .delete()
        .eq('provider', 'sms-activate')
      
      const batchSize = 100
      for (let i = 0; i < pricingRulesToUpsert.length; i += batchSize) {
        const batch = pricingRulesToUpsert.slice(i, i + batchSize)
        const { error: pricingError } = await supabase
          .from('pricing_rules')
          .insert(batch)
        
        if (pricingError) {
          console.error(`❌ [SYNC-UNIFIED] Pricing batch ${i / batchSize + 1} error:`, pricingError)
        }
      }
      
      console.log(`✅ [SYNC-UNIFIED] Synced ${pricingRulesToUpsert.length} pricing rules`)
    }
    
    // Update countries table
    const countriesToUpsert = []
    for (const [countryId, countryName] of countryNames.entries()) {
      const countryCode = COUNTRY_ID_TO_CODE[countryId] || `country_${countryId}`
      const isRentAvailable = rentCountries.has(countryId)
      
      countriesToUpsert.push({
        code: countryCode,
        name: countryName,
        active: true,
        provider: 'sms-activate',
        updated_at: new Date().toISOString()
      })
    }
    
    if (countriesToUpsert.length > 0) {
      await supabase
        .from('countries')
        .upsert(countriesToUpsert, { onConflict: 'code,provider' })
      
      console.log(`✅ [SYNC-UNIFIED] Synced ${countriesToUpsert.length} countries`)
    }
    
    // 📝 Étape 8: Logger la synchronisation
    await supabase.from('sync_logs').insert({
      sync_type: 'unified_services',
      status: 'success',
      services_synced: servicesToUpsert.length,
      countries_synced: countriesToUpsert.length,
      prices_synced: pricingRulesToUpsert.length,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      triggered_by: 'manual',
      metadata: {
        margin_percentage: marginPercentage,
        activation_services: activationData.size,
        rent_services: rentData.size,
        rent_countries: rentCountries.size,
        top_services: Array.from(allServiceCodes).slice(0, 10)
      }
    })
    
    console.log('✅ [SYNC-UNIFIED] Synchronisation terminée avec succès!')
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Synchronisation unifiée terminée',
        stats: {
          services: servicesToUpsert.length,
          countries: countriesToUpsert.length,
          pricingRules: pricingRulesToUpsert.length,
          marginPercentage,
          activationServices: activationData.size,
          rentServices: rentData.size,
          rentCountries: rentCountries.size
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ [SYNC-UNIFIED] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
