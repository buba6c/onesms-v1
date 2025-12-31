// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapping service codes → display names
const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  'full': 'Full Rent',
  'wa': 'WhatsApp',
  'tg': 'Telegram',
  'ig': 'Instagram',
  'fb': 'Facebook',
  'go': 'Google',
  'tw': 'Twitter/X',
  'ds': 'Discord',
  'mm': 'Microsoft',
  'mb': 'Yahoo',
  'am': 'Amazon',
  'nf': 'Netflix',
  'ub': 'Uber',
  'tk': 'TikTok',
  'sn': 'Snapchat',
  'ld': 'LinkedIn',
  'vi': 'Viber',
  'ts': 'PayPal',
  'st': 'Steam',
  'oi': 'Tinder',
  'mo': 'Bumble',
  'bd': 'Badoo',
  'vk': 'VKontakte',
  'ok': 'Odnoklassniki',
  'yw': 'YouWins',
  'hw': 'Alipay',
  'wb': 'WeChat',
  'me': 'Line',
  'any': 'Any Service'
}

// Service icon mapping
const SERVICE_ICONS: Record<string, string> = {
  'full': '🏠',
  'wa': '💬',
  'tg': '✈️',
  'ig': '📷',
  'fb': '👤',
  'go': '🔍',
  'tw': '🐦',
  'ds': '💬',
  'mm': '🪟',
  'mb': '📧',
  'am': '📦',
  'nf': '🎬',
  'ub': '🚗',
  'tk': '🎥',
  'sn': '👻',
  'ld': '💼',
  'vi': '💜',
  'ts': '💳',
  'st': '🎮',
  'oi': '🔥',
  'mo': '💛',
  'bd': '💕',
  'vk': '🔵',
  'ok': '🟠',
  'any': '📱'
}

// Service category mapping
const SERVICE_CATEGORIES: Record<string, string> = {
  'full': 'rent',
  'any': 'rent',
  'wa': 'messaging',
  'tg': 'messaging',
  'vi': 'messaging',
  'ds': 'messaging',
  'wb': 'messaging',
  'me': 'messaging',
  'ig': 'social',
  'fb': 'social',
  'tw': 'social',
  'tk': 'social',
  'sn': 'social',
  'ld': 'social',
  'vk': 'social',
  'ok': 'social',
  'go': 'tech',
  'mm': 'tech',
  'mb': 'tech',
  'am': 'shopping',
  'nf': 'entertainment',
  'st': 'entertainment',
  'ub': 'delivery',
  'ts': 'finance',
  'hw': 'finance',
  'oi': 'dating',
  'mo': 'dating',
  'bd': 'dating'
}

// Countries with RENT available (from SMS-Activate API)
const RENT_COUNTRIES = [
  { id: 187, code: 'usa', name: 'USA' },
  { id: 1, code: 'ukraine', name: 'Ukraine' },
  { id: 2, code: 'kazakhstan', name: 'Kazakhstan' },
  { id: 6, code: 'indonesia', name: 'Indonesia' },
  { id: 7, code: 'malaysia', name: 'Malaysia' },
  { id: 15, code: 'poland', name: 'Poland' },
  { id: 16, code: 'egypt', name: 'Egypt' },
  { id: 32, code: 'romania', name: 'Romania' },
  { id: 33, code: 'colombia', name: 'Colombia' },
  { id: 45, code: 'brazil', name: 'Brazil' },
  { id: 46, code: 'turkey', name: 'Turkey' },
  { id: 52, code: 'thailand', name: 'Thailand' },
  { id: 56, code: 'portugal', name: 'Portugal' },
  { id: 78, code: 'france', name: 'France' },
  { id: 82, code: 'mexico', name: 'Mexico' }
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 [SYNC-RENT] Starting rent services synchronization...')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // 💰 Récupérer la marge système depuis system_settings
    const { data: marginSetting } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'pricing_margin_percentage')
      .single()
    
    const marginPercentage = marginSetting?.value ? parseFloat(marginSetting.value) : 30
    console.log(`💰 [SYNC-RENT] System margin: ${marginPercentage}%`)

    // Fetch rent services for multiple durations to get comprehensive data
    const rentDurations = [4, 24, 168, 720] // 4h, 1d, 1w, 1m
    const allServices = new Map<string, any>()
    const serviceCountries = new Map<string, Set<number>>() // Track which countries have each service
    const servicePrices = new Map<string, { min: number, max: number, avg: number }>()
    
    // Fetch global rent services (no country filter)
    for (const duration of rentDurations) {
      const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&rent_time=${duration}`
      console.log(`📡 [SYNC-RENT] Fetching rent services for ${duration}h...`)
      
      const response = await fetch(apiUrl)
      const data = await response.json()
      
      if (data.services) {
        const serviceCount = Object.keys(data.services).length
        console.log(`✅ [SYNC-RENT] Found ${serviceCount} services for ${duration}h rent`)
        
        for (const [code, info] of Object.entries(data.services as Record<string, any>)) {
          if (!allServices.has(code)) {
            allServices.set(code, {
              code,
              info,
              durations: new Set<number>(),
              totalQuantity: 0,
              prices: []
            })
          }
          
          const service = allServices.get(code)!
          service.durations.add(duration)
          service.totalQuantity += info.quant?.current || 0
          if (info.cost > 0) {
            service.prices.push(info.cost)
          }
        }
      }
    }
    
    // Fetch per-country data for popular countries
    for (const country of RENT_COUNTRIES.slice(0, 5)) { // Top 5 countries only
      try {
        const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&rent_time=4&country=${country.id}`
        const response = await fetch(apiUrl)
        const data = await response.json()
        
        if (data.services) {
          console.log(`🌍 [SYNC-RENT] Country ${country.name}: ${Object.keys(data.services).length} services`)
          
          for (const code of Object.keys(data.services)) {
            if (!serviceCountries.has(code)) {
              serviceCountries.set(code, new Set())
            }
            serviceCountries.get(code)!.add(country.id)
          }
        }
      } catch (e) {
        console.warn(`⚠️ [SYNC-RENT] Failed to fetch country ${country.name}:`, e)
      }
    }

    // Prepare services for upsert
    const servicesToUpsert: any[] = []
    let index = 0
    
    // Sort services by total quantity (most available first)
    const sortedServices = Array.from(allServices.entries())
      .sort((a, b) => b[1].totalQuantity - a[1].totalQuantity)
    
    for (const [code, serviceData] of sortedServices) {
      const info = serviceData.info
      const prices = serviceData.prices
      
      // Calculate average price
      const avgPrice = prices.length > 0 
        ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length 
        : 0
      
      // Determine display name
      const displayName = SERVICE_DISPLAY_NAMES[code] || info.search_name?.split(/[,а-яА-Я]/)[0]?.trim() || code.toUpperCase()
      
      // Determine icon
      const icon = SERVICE_ICONS[code] || '📱'
      
      // Determine category
      const category = SERVICE_CATEGORIES[code] || 'other'
      
      // Calculate popularity score (based on quantity and price attractiveness)
      const popularityScore = Math.min(1000, 
        (serviceData.totalQuantity * 2) + 
        (serviceCountries.get(code)?.size || 0) * 50 +
        (1000 - index)
      )
      
      // 💵 CONVERSION UNIFIÉE: USD → FCFA → Coins (Ⓐ) + marge système
      const USD_TO_FCFA = 600
      const FCFA_TO_COINS = 100
      const avgPriceUSD = avgPrice
      const priceFCFA = avgPriceUSD * USD_TO_FCFA
      const priceCoins = priceFCFA / FCFA_TO_COINS
      const priceWithMargin = priceCoins * (1 + marginPercentage / 100)
      const rentPrice = Math.ceil(priceWithMargin)
      
      servicesToUpsert.push({
        code,
        name: displayName,
        display_name: displayName,
        icon,
        category,
        provider: 'sms-activate',
        active: serviceData.totalQuantity > 0,
        total_available: serviceData.totalQuantity,
        popularity_score: popularityScore,
        updated_at: new Date().toISOString(),
        // Stocker le prix RENT moyen pour référence
        metadata: { avg_rent_price_coins: rentPrice }
      })
      
      index++
    }

    console.log(`📊 [SYNC-RENT] Prepared ${servicesToUpsert.length} rent services for sync`)

    // Upsert services (merge with existing, don't override activation services)
    let syncedCount = 0
    let newCount = 0
    let updatedCount = 0
    
    for (const service of servicesToUpsert) {
      // Check if service already exists
      const { data: existing } = await supabaseClient
        .from('services')
        .select('id, provider, total_available')
        .eq('code', service.code)
        .eq('provider', 'sms-activate')
        .single()
      
      if (existing) {
        // Update existing service (only update rent-related fields)
        const { error } = await supabaseClient
          .from('services')
          .update({
            total_available: service.total_available,
            popularity_score: service.popularity_score,
            active: service.active,
            updated_at: service.updated_at
          })
          .eq('id', existing.id)
        
        if (!error) {
          updatedCount++
        }
      } else {
        // Insert new service
        const { error } = await supabaseClient
          .from('services')
          .insert(service)
        
        if (!error) {
          newCount++
        } else if (error.code !== '23505') { // Ignore duplicate key errors
          console.warn(`⚠️ [SYNC-RENT] Failed to insert ${service.code}:`, error.message)
        }
      }
      
      syncedCount++
    }

    // Update rent-specific countries
    console.log('🌍 [SYNC-RENT] Updating rent countries...')
    
    for (const country of RENT_COUNTRIES) {
      const { error } = await supabaseClient
        .from('countries')
        .upsert({
          code: country.code,
          name: country.name,
          provider: 'sms-activate',
          active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'code,provider'
        })
      
      if (error && error.code !== '23505') {
        console.warn(`⚠️ [SYNC-RENT] Failed to update country ${country.name}:`, error.message)
      }
    }

    // Log sync result
    const { error: logError } = await supabaseClient
      .from('sync_logs')
      .insert({
        sync_type: 'rent_services',
        status: 'success',
        services_synced: syncedCount,
        details: {
          total_services: servicesToUpsert.length,
          new_services: newCount,
          updated_services: updatedCount,
          countries_synced: RENT_COUNTRIES.length,
          durations_checked: rentDurations
        }
      })

    if (logError) {
      console.warn('⚠️ [SYNC-RENT] Failed to log sync:', logError.message)
    }

    console.log('✅ [SYNC-RENT] Sync completed successfully!')
    console.log(`📊 [SYNC-RENT] Stats: ${newCount} new, ${updatedCount} updated, ${syncedCount} total`)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          services_synced: syncedCount,
          new_services: newCount,
          updated_services: updatedCount,
          countries_synced: RENT_COUNTRIES.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('❌ [SYNC-RENT] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
