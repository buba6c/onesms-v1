import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Country code mapping: SMS-Activate → 5sim
const SMS_ACTIVATE_TO_COUNTRY: Record<number, string> = {
  0: 'russia',
  1: 'ukraine',
  2: 'kazakhstan',
  3: 'china',
  4: 'philippines',
  6: 'indonesia',
  7: 'malaysia',
  10: 'vietnam',
  11: 'kyrgyzstan',
  12: 'england',
  187: 'usa',
  36: 'canada',
  22: 'india',
  52: 'thailand',
  15: 'poland',
  73: 'brazil',
  32: 'romania',
  33: 'colombia',
  39: 'argentina',
  58: 'italy',
  56: 'spain',
  78: 'france',
  43: 'germany',
  82: 'mexico',
  175: 'australia'
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

    // 1. Fetch countries from SMS-Activate
    const countriesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`
    const countriesResponse = await fetch(countriesUrl)
    const countriesData = await countriesResponse.json()

    console.log('🌍 [SYNC-SMS-ACTIVATE] Fetched countries:', Object.keys(countriesData).length)

    // 2. Fetch services and prices from TOP countries (not just Russia)
    // Scan multiple popular countries to get comprehensive data
    const topCountries = [187, 4, 6, 22, 0, 12, 36, 78, 43] // USA, Philippines, Indonesia, India, Russia, England, Canada, France, Germany
    
    const allPricesData: Record<string, any> = {}
    const countryPopularity: Record<number, number> = {} // Track service count per country
    
    for (const countryId of topCountries) {
      try {
        const pricesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumbersStatus&country=${countryId}`
        const pricesResponse = await fetch(pricesUrl)
        const pricesData = await pricesResponse.json()
        
        const serviceCount = Object.keys(pricesData).length
        countryPopularity[countryId] = serviceCount
        
        console.log(`📊 [SYNC-SMS-ACTIVATE] Country ${countryId}: ${serviceCount} services`)
        
        // Merge prices (country-specific keys)
        for (const [service, priceInfo] of Object.entries(pricesData)) {
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

    // 3. Update countries table WITH popularity ranking
    const countriesToUpsert = []
    for (const [countryId, countryInfo] of Object.entries(countriesData)) {
      const id = parseInt(countryId)
      const info = countryInfo as any
      const countryCode = SMS_ACTIVATE_TO_COUNTRY[id] || `country_${id}`
      
      // Get popularity score (number of services available)
      const popularityScore = countryPopularity[id] || 0

      countriesToUpsert.push({
        code: countryCode,
        name: info.eng || info.rus,
        active: true,
        provider: 'sms-activate',
        available_numbers: 0 // Will be updated from pricing_rules
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

      // Add service if not seen
      if (!servicesSeen.has(serviceCode)) {
        servicesSeen.add(serviceCode)
        servicesToUpsert.push({
          code: serviceCode,
          name: serviceCode.charAt(0).toUpperCase() + serviceCode.slice(1),
          display_name: serviceCode.charAt(0).toUpperCase() + serviceCode.slice(1),
          category: 'social',
          icon: '📱',
          active: true,
          popularity_score: 0,
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
