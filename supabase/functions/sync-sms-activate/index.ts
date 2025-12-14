import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * ORDRE OFFICIEL SMS-ACTIVATE - HOMEPAGE 2025
 * Source: https://sms-activate.io/ - Section "We provide phone numbers for all popular services"
 * 
 * L'ordre suit exactement la grille de services affichée sur leur homepage:
 * Row 1: Snapchat, WeChat, Google, TikTok, Facebook, OpenAI, VK, Instagram, Viber, WhatsApp
 * Row 2: Amazon, Netflix, PayPal, Grindr, Telegram, Discord, Twitter, Tinder, Uber, Apple
 * etc.
 */
const SMS_ACTIVATE_HOMEPAGE_ORDER: Record<string, number> = {
  // TOP 1-10 - Homepage Row 1 (Services les plus mis en avant)
  'fu': 1000,   // Snapchat
  'wb': 990,    // WeChat
  'go': 980,    // Google
  'lf': 970,    // TikTok
  'fb': 960,    // Facebook
  'dr': 950,    // OpenAI (ChatGPT)
  'vk': 940,    // VKontakte
  'ig': 930,    // Instagram
  'vi': 920,    // Viber
  'wa': 910,    // WhatsApp
  
  // TOP 11-20 - Homepage Row 2
  'am': 900,    // Amazon
  'nf': 890,    // Netflix
  'ts': 880,    // PayPal
  'gr': 870,    // Grindr
  'tg': 860,    // Telegram
  'ds': 850,    // Discord
  'tw': 840,    // Twitter
  'oi': 830,    // Tinder
  'ub': 820,    // Uber
  'wx': 810,    // Apple
  
  // TOP 21-30
  'mm': 800,    // Microsoft
  'mt': 790,    // Steam
  'aon': 780,   // Binance
  're': 770,    // Coinbase
  'tn': 760,    // LinkedIn
  'aiw': 750,   // Roblox
  'alj': 740,   // Spotify
  'hb': 730,    // Twitch
  'ep': 720,    // Temu
  'hx': 710,    // AliExpress
  
  // TOP 31-40
  'ka': 700,    // Shopee
  'aez': 690,   // Shein
  'ij': 680,    // Revolut
  'bo': 670,    // Wise
  'ti': 660,    // Crypto.com
  'nc': 650,    // Payoneer
  'mo': 640,    // Bumble
  'qv': 630,    // Badoo
  'vz': 620,    // Hinge
  'df': 610,    // Happn
  
  // TOP 41-50
  'jg': 600,    // Grab
  'ac': 590,    // DoorDash
  'aq': 580,    // Glovo
  'nz': 570,    // Foodpanda
  'rr': 560,    // Wolt
  'dl': 550,    // Lazada
  'xt': 540,    // Flipkart
  'blm': 530,   // Epic Games
  'bz': 520,    // Blizzard
  'ah': 510,    // Escape From Tarkov
  
  // 51-60
  'bnl': 500,   // Reddit
  'mb': 490,    // Yahoo
  'pm': 480,    // AOL
  'ok': 470,    // Odnoklassniki
  'ln': 460,    // Line
  'kk': 450,    // KakaoTalk
  'sg': 440,    // Signal
  'zm': 430,    // Zoom
  'sk': 420,    // Skype
  'sl': 410,    // Slack
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

// Helper function: Detect service category (with popularity detection)
function detectServiceCategory(code: string, name: string, popularityScore: number = 0): string {
  const lowerCode = code.toLowerCase()
  const lowerName = name.toLowerCase()
  
  // POPULAR category for top services (score > 800)
  if (popularityScore > 800) return 'popular'
  
  // Social networks
  if (['ig', 'fb', 'tw', 'lf', 'sn', 'li', 'vk', 'ok'].includes(lowerCode)) return 'social'
  if (lowerName.includes('instagram') || lowerName.includes('facebook') || lowerName.includes('twitter')) return 'social'
  if (lowerName.includes('tiktok') || lowerName.includes('snapchat') || lowerName.includes('linkedin')) return 'social'
  if (lowerName.includes('social')) return 'social'
  
  // Messaging (messengers & chat apps)
  if (['wa', 'tg', 'vi', 'ds', 'wb', 'me'].includes(lowerCode)) return 'messaging'
  if (lowerName.includes('whatsapp') || lowerName.includes('telegram') || lowerName.includes('discord')) return 'messaging'
  if (lowerName.includes('viber') || lowerName.includes('wechat') || lowerName.includes('line')) return 'messaging'
  if (lowerName.includes('messenger') || lowerName.includes('chat')) return 'messaging'
  
  // Tech/Email
  if (['go', 'mm', 'mb', 'wx'].includes(lowerCode)) return 'tech'
  if (lowerName.includes('google') || lowerName.includes('microsoft') || lowerName.includes('apple')) return 'tech'
  if (lowerName.includes('yahoo') || lowerName.includes('yandex')) return 'tech'
  if (lowerName.includes('mail') || lowerName.includes('email')) return 'tech'
  
  // Shopping/E-commerce
  if (['am', 'dh', 'ka', 'dl', 'wr'].includes(lowerCode)) return 'shopping'
  if (lowerName.includes('amazon') || lowerName.includes('ebay') || lowerName.includes('alibaba')) return 'shopping'
  if (lowerName.includes('shop') || lowerName.includes('store') || lowerName.includes('market')) return 'shopping'
  
  // Entertainment (Streaming, Music, Gaming)
  if (['nf'].includes(lowerCode)) return 'entertainment'
  if (lowerName.includes('netflix') || lowerName.includes('spotify') || lowerName.includes('youtube')) return 'entertainment'
  if (lowerName.includes('twitch') || lowerName.includes('steam') || lowerName.includes('game')) return 'entertainment'
  
  // Dating
  if (['oi', 'mo', 'bd', 'vz'].includes(lowerCode)) return 'dating'
  if (lowerName.includes('tinder') || lowerName.includes('bumble') || lowerName.includes('badoo')) return 'dating'
  if (lowerName.includes('dating') || lowerName.includes('match')) return 'dating'
  
  // Delivery (Transport + Food delivery)
  if (['ub', 'jg', 'ni'].includes(lowerCode)) return 'delivery'
  if (lowerName.includes('uber') || lowerName.includes('grab') || lowerName.includes('bolt')) return 'delivery'
  if (lowerName.includes('taxi') || lowerName.includes('ride') || lowerName.includes('delivery')) return 'delivery'
  
  // Finance
  if (['ts', 'hw'].includes(lowerCode)) return 'finance'
  if (lowerName.includes('paypal') || lowerName.includes('alipay')) return 'finance'
  if (lowerName.includes('pay') || lowerName.includes('bank') || lowerName.includes('wallet')) return 'finance'
  
  // Default
  return 'other'
}

// Service code normalization: Normalize long codes to short codes (SMS-Activate API format)
const NORMALIZE_SERVICE_CODE: Record<string, string> = {
  // Long → Short mapping (getPrices returns long codes, getServicesList uses short codes)
  'whatsapp': 'wa',
  'telegram': 'tg',
  'instagram': 'ig',
  'facebook': 'fb',
  'google': 'go',
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
  'steam': 'st',
  'youtube': 'go',
  'gmail': 'go',
  'vkontakte': 'vk',
  'wechat': 'wb',
  'line': 'me'
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
    // Use SERVICE_ROLE_KEY for admin access (bypass RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('🔄 [SYNC-SMS-ACTIVATE] Starting sync...')
    
    // 💰 Récupérer la marge système depuis system_settings
    const { data: marginSetting } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'pricing_margin_percentage')
      .single()
    
    const marginPercentage = marginSetting?.value ? parseFloat(marginSetting.value) : 30
    console.log(`💰 [SYNC-SMS-ACTIVATE] System margin: ${marginPercentage}%`)

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
      // Normalize service code: long codes → short codes (whatsapp → wa, telegram → tg)
      const serviceCode = NORMALIZE_SERVICE_CODE[smsActivateService.toLowerCase()] || smsActivateService
      const countryCode = SMS_ACTIVATE_TO_COUNTRY[countryId] || 'russia'

      // Add new service if not seen yet
      if (!servicesSeen.has(serviceCode)) {
        servicesSeen.add(serviceCode)
        
        // PRIORITY ORDER for popularity_score:
        // 1. SMS_ACTIVATE_HOMEPAGE_ORDER (official homepage order) - scores 400-1000
        // 2. Default score of 5 for services NOT in our homepage mapping
        // This ensures homepage services ALWAYS appear first
        const homepageScore = SMS_ACTIVATE_HOMEPAGE_ORDER[serviceCode] || 
                             SMS_ACTIVATE_HOMEPAGE_ORDER[smsActivateService]
        
        // If service is in homepage mapping, use that score
        // Otherwise, give a LOW score (5) so it appears AFTER homepage services
        const popularityScore = homepageScore || 5
        
        // Use display name from API, or fallback to capitalized code
        const displayName = serviceDisplayNames.get(serviceCode) || 
                           serviceDisplayNames.get(smsActivateService) || 
                           serviceCode.charAt(0).toUpperCase() + serviceCode.slice(1)
        
        // Smart icon detection based on service name/code
        const icon = detectServiceIcon(serviceCode, displayName)
        
        // Smart category detection based on service name AND popularity score
        const category = detectServiceCategory(serviceCode, displayName, popularityScore)
        
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
      let costUSD = 0
      let count = 0
      
      // Essayer différents formats de prix
      if (typeof priceInfo === 'object') {
        costUSD = parseFloat(priceInfo.retail_cost || priceInfo.cost || priceInfo.price || '0')
        count = parseInt(priceInfo.count || priceInfo.quantity || '0', 10)
      } else if (typeof priceInfo === 'number') {
        costUSD = priceInfo
        count = 100 // Default si pas de count
      }

      if (costUSD > 0 && count > 0) {
        // 💵 CONVERSION UNIFIÉE: USD → FCFA → Coins (Ⓐ) + marge système
        const USD_TO_FCFA = 600  // 1 USD = 600 FCFA
        const FCFA_TO_COINS = 100  // 1 Coin (Ⓐ) = 100 FCFA
        
        const priceFCFA = costUSD * USD_TO_FCFA
        const priceCoins = priceFCFA / FCFA_TO_COINS
        const priceWithMargin = priceCoins * (1 + marginPercentage / 100)
        const activationPrice = Math.ceil(priceWithMargin) // Arrondir au supérieur
        
        console.log(`💵 [PRICING] ${serviceCode}@${countryCode}: $${costUSD} → ${priceFCFA}F → ${priceCoins}Ⓐ → ${activationPrice}Ⓐ (${count} available)`)
        
        pricingRulesToUpsert.push({
          service_code: serviceCode,
          country_code: countryCode,
          operator: 'any',
          activation_cost: costUSD * 0.7, // Notre coût (30% marge brute)
          activation_price: activationPrice, // Prix de vente en coins
          rent_cost: 0,
          rent_price: 0,
          available_count: count,
          active: count > 0,
          provider: 'sms-activate',
          margin_percentage: marginPercentage,
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

    // 5.1 Force update popularity_score based on SMS_ACTIVATE_HOMEPAGE_ORDER
    // This ensures the homepage order is always applied, overriding any API values
    console.log('🔄 [SYNC-SMS-ACTIVATE] Applying official SMS-Activate homepage order...')
    let updatedScores = 0
    for (const [code, score] of Object.entries(SMS_ACTIVATE_HOMEPAGE_ORDER)) {
      const { error } = await supabaseClient
        .from('services')
        .update({ popularity_score: score })
        .eq('code', code)
      
      if (!error) updatedScores++
    }
    console.log(`✅ [SYNC-SMS-ACTIVATE] Updated ${updatedScores}/${Object.keys(SMS_ACTIVATE_HOMEPAGE_ORDER).length} services with homepage order`)

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

    // 7. Update service totals - calculate directly from pricing_rules
    // (Fallback since calculate_service_totals() SQL function may not exist)
    console.log('🔄 [SYNC-SMS-ACTIVATE] Calculating service totals...')
    
    // First, try the RPC function
    const { error: rpcError } = await supabaseClient.rpc('calculate_service_totals')
    
    if (rpcError) {
      console.warn('⚠️ [SYNC-SMS-ACTIVATE] RPC calculate_service_totals not available, using manual calculation')
      
      // Calculate totals manually from pricing_rules
      const serviceTotals: Record<string, number> = {}
      for (const rule of pricingRulesToUpsert) {
        if (!serviceTotals[rule.service_code]) {
          serviceTotals[rule.service_code] = 0
        }
        serviceTotals[rule.service_code] += rule.available_count
      }
      
      // Update each service's total_available
      let updatedCount = 0
      for (const [serviceCode, total] of Object.entries(serviceTotals)) {
        const { error } = await supabaseClient
          .from('services')
          .update({ total_available: total })
          .eq('code', serviceCode)
        
        if (!error) updatedCount++
      }
      
      console.log(`✅ [SYNC-SMS-ACTIVATE] Updated ${updatedCount} services with total_available`)
    } else {
      console.log('✅ [SYNC-SMS-ACTIVATE] Service totals updated via RPC')
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
