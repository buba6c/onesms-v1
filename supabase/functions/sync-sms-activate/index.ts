import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function: Detect service icon based on name/code
function detectServiceIcon(code: string, name: string): string {
  const lowerCode = code.toLowerCase()
  const lowerName = name.toLowerCase()
  
  // Social networks
  if (lowerName.includes('instagram') || lowerCode === 'ig') return '📷'
  if (lowerName.includes('facebook') || lowerCode === 'fb') return '👤'
  if (lowerName.includes('twitter') || lowerCode === 'tw') return '🐦'
  if (lowerName.includes('tiktok') || lowerCode === 'lf') return '🎥'
  if (lowerName.includes('snapchat') || lowerCode === 'sn') return '👻'
  if (lowerName.includes('linkedin') || lowerCode === 'li') return '💼'
  if (lowerName.includes('vk') || lowerCode === 'vk') return '🔵'
  
  // Messengers
  if (lowerName.includes('whatsapp') || lowerCode === 'wa') return '💬'
  if (lowerName.includes('telegram') || lowerCode === 'tg') return '✈️'
  if (lowerName.includes('viber') || lowerCode === 'vi') return '💜'
  if (lowerName.includes('discord') || lowerCode === 'ds') return '💬'
  if (lowerName.includes('wechat') || lowerCode === 'wb') return '💬'
  if (lowerName.includes('line') || lowerCode === 'me') return '📝'
  
  // Tech/Email
  if (lowerName.includes('google') || lowerCode === 'go') return '🔍'
  if (lowerName.includes('microsoft') || lowerCode === 'mm') return '🪟'
  if (lowerName.includes('apple') || lowerCode === 'wx') return ''
  if (lowerName.includes('yahoo') || lowerCode === 'mb') return '📧'
  if (lowerName.includes('mail') || lowerName.includes('email')) return '✉️'
  
  // Shopping
  if (lowerName.includes('amazon') || lowerCode === 'am') return '📦'
  if (lowerName.includes('ebay') || lowerCode === 'dh') return '🛍️'
  if (lowerName.includes('shopee') || lowerCode === 'ka') return '🛒'
  if (lowerName.includes('lazada') || lowerCode === 'dl') return '🛒'
  if (lowerName.includes('walmart') || lowerCode === 'wr') return '🏬'
  
  // Streaming/Entertainment
  if (lowerName.includes('netflix') || lowerCode === 'nf') return '🎬'
  if (lowerName.includes('youtube')) return '▶️'
  if (lowerName.includes('spotify')) return '🎵'
  
  // Dating
  if (lowerName.includes('tinder') || lowerCode === 'oi') return '🔥'
  if (lowerName.includes('bumble') || lowerCode === 'mo') return '💛'
  if (lowerName.includes('badoo') || lowerCode === 'bd') return '💕'
  if (lowerName.includes('hinge') || lowerCode === 'vz') return '💕'
  
  // Transport/Delivery
  if (lowerName.includes('uber') || lowerCode === 'ub') return '🚗'
  if (lowerName.includes('grab') || lowerCode === 'jg') return '🚗'
  if (lowerName.includes('gojek') || lowerCode === 'ni') return '🏍️'
  
  // Finance
  if (lowerName.includes('paypal') || lowerCode === 'ts') return '💳'
  if (lowerName.includes('alipay') || lowerCode === 'hw') return '💰'
  
  // Default
  return '📱'
}

// Helper function: Detect service category
function detectServiceCategory(code: string, name: string): string {
  const lowerCode = code.toLowerCase()
  const lowerName = name.toLowerCase()
  
  // Social networks
  if (['ig', 'fb', 'tw', 'lf', 'sn', 'li', 'vk', 'ok'].includes(lowerCode)) return 'social'
  if (lowerName.includes('social')) return 'social'
  
  // Messengers
  if (['wa', 'tg', 'vi', 'ds', 'wb', 'me'].includes(lowerCode)) return 'messenger'
  if (lowerName.includes('messenger') || lowerName.includes('chat')) return 'messenger'
  
  // Tech/Email
  if (['go', 'mm', 'mb', 'wx'].includes(lowerCode)) return 'tech'
  if (lowerName.includes('google') || lowerName.includes('microsoft') || lowerName.includes('apple')) return 'tech'
  if (lowerName.includes('mail') || lowerName.includes('email')) return 'email'
  
  // Shopping/E-commerce
  if (['am', 'dh', 'ka', 'dl', 'wr'].includes(lowerCode)) return 'shopping'
  if (lowerName.includes('shop') || lowerName.includes('store') || lowerName.includes('market')) return 'shopping'
  
  // Streaming
  if (['nf'].includes(lowerCode)) return 'streaming'
  if (lowerName.includes('netflix') || lowerName.includes('youtube') || lowerName.includes('spotify')) return 'streaming'
  
  // Dating
  if (['oi', 'mo', 'bd', 'vz'].includes(lowerCode)) return 'dating'
  if (lowerName.includes('tinder') || lowerName.includes('dating') || lowerName.includes('bumble')) return 'dating'
  
  // Transport
  if (['ub', 'jg', 'ni'].includes(lowerCode)) return 'transport'
  if (lowerName.includes('uber') || lowerName.includes('taxi') || lowerName.includes('ride')) return 'transport'
  
  // Finance
  if (['ts', 'hw'].includes(lowerCode)) return 'finance'
  if (lowerName.includes('pay') || lowerName.includes('bank') || lowerName.includes('wallet')) return 'finance'
  
  // Default
  return 'other'
}

// Service code mapping: SMS-Activate → 5sim
const SMS_ACTIVATE_TO_SERVICE: Record<string, string> = {
  'go': 'google',
  'wa': 'whatsapp',
  'tg': 'telegram',
  'fb': 'facebook',
  'ig': 'instagram',
  'tw': 'twitter',
  'ds': 'discord',
  'mm': 'microsoft',
  'mb': 'yahoo',
  'am': 'amazon',
  'nf': 'netflix',
  'ub': 'uber',
  'tk': 'tiktok',
  'sn': 'snapchat',
  'ld': 'linkedin',
  'vi': 'viber',
  'ts': 'paypal',
  'st': 'steam'
}

// Country code mapping: SMS-Activate → 5sim (CORRECTED)
const SMS_ACTIVATE_TO_COUNTRY: Record<number, string> = {
  0: 'russia',
  1: 'ukraine',
  2: 'kazakhstan',
  3: 'china',
  4: 'philippines',
  5: 'myanmar',
  6: 'indonesia',
  7: 'malaysia',
  8: 'kenya',
  9: 'tanzania',
  10: 'vietnam',
  11: 'kyrgyzstan',
  12: 'england',        // ✅ FIXED: was 'usa'
  13: 'china',
  14: 'israel',
  15: 'poland',
  16: 'hk',
  17: 'morocco',
  18: 'egypt',
  19: 'nigeria',
  20: 'macao',
  21: 'india',          // ✅ FIXED
  22: 'ireland',        // ✅ FIXED: was 'india'
  32: 'romania',
  33: 'colombia',
  36: 'canada',
  39: 'argentina',
  43: 'germany',
  52: 'thailand',
  56: 'spain',
  58: 'italy',
  62: 'southafrica',
  73: 'brazil',
  78: 'france',
  79: 'netherlands',
  80: 'ghana',
  82: 'mexico',
  88: 'bangladesh',
  90: 'pakistan',
  94: 'turkey',
  108: 'philippines',
  109: 'nigeria',
  115: 'egypt',
  132: 'uae',
  135: 'iraq',
  168: 'chile',
  174: 'singapore',
  175: 'australia',
  177: 'newzealand',
  187: 'usa'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    console.log('🔄 [SYNC-SMS-ACTIVATE] Starting sync...')

    // 0. Fetch master service list from SMS-Activate (defines official order)
    const servicesListUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getServicesList`
    const servicesListResponse = await fetch(servicesListUrl)
    const servicesListData = await servicesListResponse.json()
    
    // Build service order map: code → position (1000, 999, 998...)
    const masterServiceOrder = new Map<string, number>()
    const serviceDisplayNames = new Map<string, string>()
    
    if (servicesListData.status === 'success' && Array.isArray(servicesListData.services)) {
      const services = servicesListData.services
      console.log(`📋 [SYNC-SMS-ACTIVATE] Master service list: ${services.length} services`)
      
      // Assign popularity_score based on API position: first service = 1000, second = 999, etc.
      services.forEach((svc: any, index: number) => {
        const popularityScore = 1000 - index
        masterServiceOrder.set(svc.code, popularityScore)
        serviceDisplayNames.set(svc.code, svc.name)
      })
    } else {
      console.warn('⚠️ [SYNC-SMS-ACTIVATE] Could not fetch service list, using fallback order')
    }

    // 1. Fetch countries from SMS-Activate
    const countriesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`
    const countriesResponse = await fetch(countriesUrl)
    const countriesData = await countriesResponse.json()

    console.log('🌍 [SYNC-SMS-ACTIVATE] Fetched countries:', Object.keys(countriesData).length)

    // 2. Fetch services and prices from TOP 50 countries (increased coverage)
    // Tier 1-5: Most popular countries for comprehensive data
    const topCountries = [
      // Tier 1 - Americas (10)
      187, 36, 73, 33, 39, 82, 78, 168, 43, 14,
      // Tier 2 - Europe (10)
      12, 22, 15, 58, 56, 32, 79, 16, 18, 21,
      // Tier 3 - Asia Pacific (10)  
      4, 6, 7, 10, 52, 3, 175, 11, 177, 174,
      // Tier 4 - Middle East & Africa (10)
      132, 115, 62, 94, 135, 109, 80, 108, 88, 90,
      // Tier 5 - Eastern Europe & CIS (10)
      0, 1, 2, 5, 8, 9, 13, 17, 19, 20
    ]
    
    const allPricesData: Record<string, any> = {}
    const countryPopularity: Record<number, number> = {} // Track service count per country
    const countryServiceOrder: Record<number, Map<string, number>> = {} // Track service order per country
    
    for (const countryId of topCountries) {
      try {
        // Utiliser getPrices au lieu de getNumbersStatus pour avoir cost + count
        const pricesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&country=${countryId}`
        const pricesResponse = await fetch(pricesUrl)
        const pricesData = await pricesResponse.json()
        
        // getPrices retourne {187: {service1: {...}, service2: {...}}}
        // Extraire les services du pays
        const countryServices = pricesData[countryId.toString()] || pricesData
        const serviceCount = Object.keys(countryServices).length
        countryPopularity[countryId] = serviceCount
        
        console.log(`📊 [SYNC-SMS-ACTIVATE] Country ${countryId}: ${serviceCount} services`)
        
        // Track service order for this country (order from API = display order)
        const orderMap = new Map<string, number>()
        Object.keys(countryServices).forEach((serviceCode, index) => {
          orderMap.set(serviceCode, index + 1) // 1-based ordering
        })
        countryServiceOrder[countryId] = orderMap
        
        // Merge prices (country-specific keys)
        for (const [service, priceInfo] of Object.entries(countryServices)) {
          const key = `${service}_${countryId}`
          allPricesData[key] = priceInfo
        }
      } catch (e) {
        console.error(`⚠️ [SYNC-SMS-ACTIVATE] Failed to fetch country ${countryId}:`, e)
      }
    }

    console.log('💰 [SYNC-SMS-ACTIVATE] Total price entries:', Object.keys(allPricesData).length)
    
    // Debug: Afficher un exemple de données
    const firstKey = Object.keys(allPricesData)[0]
    if (firstKey) {
      console.log('🔍 [DEBUG] Example price data:', firstKey, '→', JSON.stringify(allPricesData[firstKey]))
    }
    
    // Use merged data
    const pricesData = allPricesData

    // 3. Update countries table WITH popularity ranking and display_order
    const countriesToUpsert = []
    
    // Sort countries by popularity (most services = most popular)
    const sortedCountries = Object.entries(countryPopularity)
      .sort(([, a], [, b]) => b - a) // Descending order
      .map(([id]) => parseInt(id))
    
    for (const [countryId, countryInfo] of Object.entries(countriesData)) {
      const id = parseInt(countryId)
      const info = countryInfo as any
      const countryCode = SMS_ACTIVATE_TO_COUNTRY[id] || `country_${id}`
      
      // Get popularity score (number of services available)
      const popularityScore = countryPopularity[id] || 0
      
      // Get display order (1 = most popular, 2 = second, etc.)
      const displayOrder = sortedCountries.indexOf(id) + 1 || 999

      countriesToUpsert.push({
        code: countryCode,
        name: info.eng || info.rus,
        active: true,
        provider: 'sms-activate',
        available_numbers: 0, // Will be updated from pricing_rules
        display_order: displayOrder // NEW: Order countries by popularity
      })
    }

    if (countriesToUpsert.length > 0) {
      const { error: countriesError } = await supabaseClient
        .from('countries')
        .upsert(countriesToUpsert, { onConflict: 'code' })

      if (countriesError) {
        console.error('❌ [SYNC-SMS-ACTIVATE] Countries sync error:', countriesError)
      } else {
        console.log(`✅ [SYNC-SMS-ACTIVATE] Synced ${countriesToUpsert.length} countries`)
      }
    }

    // 4. Update services and pricing
    const servicesToUpsert = []
    const pricingRulesToUpsert = []
    const servicesSeen = new Set<string>()

    for (const [key, value] of Object.entries(pricesData)) {
      // Key format: serviceName_countryId or serviceName
      const parts = key.split('_')
      const smsActivateService = parts[0]
      const countryId = parts.length > 1 ? parseInt(parts[1]) : 0

      const priceInfo = value as any
      const serviceCode = SMS_ACTIVATE_TO_SERVICE[smsActivateService] || smsActivateService
      const countryCode = SMS_ACTIVATE_TO_COUNTRY[countryId] || 'russia'

      // Add new service if not seen yet
      if (!servicesSeen.has(serviceCode)) {
        servicesSeen.add(serviceCode)
        
        // Use popularity_score from master service list API (getServicesList)
        // If not found in master list, fallback to low score (5)
        const popularityScore = masterServiceOrder.get(smsActivateService) || 5
        
        // Use display name from API, or fallback to capitalized code
        const displayName = serviceDisplayNames.get(smsActivateService) || 
                           serviceCode.charAt(0).toUpperCase() + serviceCode.slice(1)
        
        // Smart icon detection based on service name/code
        const icon = detectServiceIcon(smsActivateService, displayName)
        
        // Smart category detection based on service name
        const category = detectServiceCategory(smsActivateService, displayName)
        
        servicesToUpsert.push({
          code: serviceCode,
          name: displayName,
          display_name: displayName,
          category: category,
          icon: icon,
          active: true,
          popularity_score: popularityScore,
          total_available: 0
        })
      }

      // Add pricing rule - SMS-Activate peut retourner plusieurs formats
      let cost = 0
      let count = 0
      
      // Essayer différents formats de prix
      if (typeof priceInfo === 'object') {
        cost = parseFloat(priceInfo.retail_cost || priceInfo.cost || priceInfo.price || '0')
        count = parseInt(priceInfo.count || priceInfo.quantity || '0', 10)
      } else if (typeof priceInfo === 'number') {
        cost = priceInfo
        count = 100 // Default si pas de count
      }

      console.log(`💵 [PRICING] ${serviceCode}@${countryCode}: cost=${cost}, count=${count}`)

      if (cost > 0 && count > 0) {
        pricingRulesToUpsert.push({
          service_code: serviceCode,
          country_code: countryCode,
          operator: 'any',
          activation_cost: cost * 0.8, // 20% margin
          activation_price: cost,
          rent_cost: 0,
          rent_price: 0,
          available_count: count,
          active: count > 0,
          provider: 'sms-activate',
          last_synced_at: new Date().toISOString()
        })
      }
    }

    // 5. Batch insert services
    if (servicesToUpsert.length > 0) {
      const { error: servicesError } = await supabaseClient
        .from('services')
        .upsert(servicesToUpsert, { onConflict: 'code' })

      if (servicesError) {
        console.error('❌ [SYNC-SMS-ACTIVATE] Services sync error:', servicesError)
      } else {
        console.log(`✅ [SYNC-SMS-ACTIVATE] Synced ${servicesToUpsert.length} services`)
      }
    }

    // 6. Batch insert pricing rules
    if (pricingRulesToUpsert.length > 0) {
      // Delete old SMS-Activate pricing rules
      await supabaseClient
        .from('pricing_rules')
        .delete()
        .eq('provider', 'sms-activate')

      // Insert new pricing rules in batches
      const batchSize = 100
      for (let i = 0; i < pricingRulesToUpsert.length; i += batchSize) {
        const batch = pricingRulesToUpsert.slice(i, i + batchSize)
        const { error: pricingError } = await supabaseClient
          .from('pricing_rules')
          .insert(batch)

        if (pricingError) {
          console.error(`❌ [SYNC-SMS-ACTIVATE] Pricing batch ${i / batchSize + 1} error:`, pricingError)
        }
      }

      console.log(`✅ [SYNC-SMS-ACTIVATE] Synced ${pricingRulesToUpsert.length} pricing rules`)
    }

    // 7. Update service totals from pricing_rules
    console.log('🔄 [SYNC-SMS-ACTIVATE] Calculating service totals...')
    const { error: totalsError } = await supabaseClient
      .rpc('calculate_service_totals')

    if (totalsError) {
      console.error('❌ [SYNC-SMS-ACTIVATE] Totals calculation error:', totalsError)
    } else {
      console.log('✅ [SYNC-SMS-ACTIVATE] Service totals updated')
    }

    console.log('✅ [SYNC-SMS-ACTIVATE] Sync completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          countries: countriesToUpsert.length,
          services: servicesToUpsert.length,
          pricing_rules: pricingRulesToUpsert.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [SYNC-SMS-ACTIVATE] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
