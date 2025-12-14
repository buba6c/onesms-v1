// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Service code mapping: common names → SMS-Activate codes
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
  'steam': 'st',
  'full': 'full' // Universal rent - receive all SMS
}

// Complete country code mapping to SMS-Activate IDs
// From: https://api.sms-activate.ae/stubs/handler_api.php?action=getCountries
const COUNTRY_CODE_MAP: Record<string, number> = {
  // By name (lowercase)
  'russia': 0, 'ukraine': 1, 'kazakhstan': 2, 'china': 3, 'philippines': 4,
  'myanmar': 5, 'indonesia': 6, 'malaysia': 7, 'kenya': 8, 'tanzania': 9,
  'vietnam': 10, 'kyrgyzstan': 11, 'england': 12, 'uk': 12, 'israel': 13,
  'hongkong': 14, 'hong kong': 14, 'poland': 15, 'egypt': 16, 'nigeria': 17,
  'morocco': 19, 'ghana': 20, 'argentina': 21, 'india': 22, 'uzbekistan': 23,
  'cambodia': 24, 'cameroon': 25, 'chad': 26, 'germany': 27, 'lithuania': 28,
  'croatia': 29, 'sweden': 30, 'iraq': 31, 'romania': 32, 'colombia': 33,
  'austria': 34, 'belarus': 35, 'canada': 36, 'saudi': 37, 'mexico': 38,
  'south africa': 39, 'spain': 40, 'iran': 41, 'algeria': 42, 'netherlands': 43,
  'bangladesh': 44, 'brazil': 45, 'turkey': 46, 'japan': 47, 'korea': 48,
  'taiwan': 49, 'singapore': 50, 'uae': 51, 'thailand': 52, 'pakistan': 53,
  'nepal': 54, 'sri lanka': 55, 'portugal': 56, 'new zealand': 57, 'italy': 58,
  'belgium': 59, 'switzerland': 60, 'greece': 61, 'czech': 62, 'hungary': 63,
  'denmark': 64, 'norway': 65, 'finland': 66, 'ireland': 67, 'slovakia': 68,
  'bulgaria': 69, 'serbia': 70, 'slovenia': 71, 'macedonia': 72, 'peru': 73,
  'chile': 74, 'ecuador': 75, 'venezuela': 76, 'bolivia': 77, 'france': 78,
  'paraguay': 79, 'uruguay': 80, 'costa rica': 81, 'mexico': 82, 'dominican': 83,
  'el salvador': 84, 'guatemala': 85, 'honduras': 86, 'nicaragua': 87,
  'cuba': 88, 'haiti': 89, 'jamaica': 90, 'trinidad': 91, 'puerto rico': 92,
  'barbados': 93, 'bahamas': 94, 'afghanistan': 108, 'laos': 117, 'sudan': 129,
  'jordan': 141, 'palestine': 163, 'bahrain': 165, 'ethiopia': 172,
  'australia': 175, 'usa': 187, 'united states': 187,
  // By ISO2 codes
  'ru': 0, 'ua': 1, 'kz': 2, 'cn': 3, 'ph': 4, 'mm': 5, 'id': 6, 'my': 7,
  'ke': 8, 'tz': 9, 'vn': 10, 'kg': 11, 'gb': 12, 'il': 13, 'hk': 14,
  'pl': 15, 'eg': 16, 'ng': 17, 'ma': 19, 'gh': 20, 'ar': 21, 'in': 22,
  'uz': 23, 'kh': 24, 'de': 27, 'ro': 32, 'co': 33, 'ca': 36, 'mx': 38,
  'za': 39, 'es': 40, 'nl': 43, 'bd': 44, 'br': 45, 'tr': 46, 'jp': 47,
  'kr': 48, 'tw': 49, 'sg': 50, 'ae': 51, 'th': 52, 'pk': 53, 'pt': 56,
  'nz': 57, 'it': 58, 'be': 59, 'ch': 60, 'gr': 61, 'cz': 62, 'hu': 63,
  'dk': 64, 'no': 65, 'fi': 66, 'ie': 67, 'fr': 78, 'au': 175, 'us': 187
}

// Countries with RENT available (based on API response rent=1)
const RENT_AVAILABLE_COUNTRIES = [1, 2, 6, 7, 14, 15, 16, 19, 24, 32, 33, 34, 39, 43, 44, 45, 46, 48, 49, 50, 52, 56, 59, 62, 63, 77, 78, 82, 83, 84, 85, 86, 108, 117, 129, 141, 163, 165, 172, 187, 196]

const mapServiceCode = (code: string): string => {
  return SERVICE_CODE_MAP[code.toLowerCase()] || code
}

const mapCountryCode = (country: string): number => {
  // Try to parse country_XX pattern
  if (country.startsWith('country_')) {
    const num = parseInt(country.replace('country_', ''), 10)
    if (!isNaN(num)) return num
  }
  return COUNTRY_CODE_MAP[country.toLowerCase()] ?? 187 // Default USA if unknown
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ❌ Deprecated: use buy-sms-activate-rent (atomic freeze/commit)
  return new Response(
    JSON.stringify({
      error: 'Deprecated endpoint. Please use buy-sms-activate-rent.',
      hint: 'This function is disabled to prevent unsafe balance handling.'
    }),
    {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )

  try {
    // Use SERVICE_ROLE_KEY to bypass RLS for database operations
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

    // Get user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { service, country, rentHours, userId } = await req.json()

    console.log('🏠 [RENT-SMS-ACTIVATE] Request:', { service, country, rentHours, userId })

    // 1. Map service and country codes
    const smsActivateService = mapServiceCode(service)
    const smsActivateCountry = mapCountryCode(country)

    console.log('🔄 [RENT-SMS-ACTIVATE] Mapped codes:', { 
      originalService: service, 
      mappedService: smsActivateService,
      originalCountry: country,
      mappedCountry: smsActivateCountry 
    })

    // 2. Check rent availability and get real price from API
    const priceCheckUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&country=${smsActivateCountry}&rent_time=${rentHours}`
    console.log('💰 [RENT-SMS-ACTIVATE] Checking price...', priceCheckUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY'))
    
    const priceResponse = await fetch(priceCheckUrl)
    const priceData = await priceResponse.json()
    
    let realPrice = 0
    let actualService = smsActivateService
    
    // Check if the specific service is available
    if (priceData.services && priceData.services[smsActivateService]) {
      const serviceInfo = priceData.services[smsActivateService]
      if (serviceInfo.quant?.current > 0) {
        realPrice = serviceInfo.cost || 0
        console.log(`✅ [RENT-SMS-ACTIVATE] Service ${smsActivateService} available: ${serviceInfo.quant.current} numbers, $${realPrice}`)
      } else {
        console.log(`⚠️ [RENT-SMS-ACTIVATE] Service ${smsActivateService} has no numbers available`)
      }
    }
    
    // If no price found, try "full" service (universal rent)
    if (realPrice <= 0 && priceData.services?.full && priceData.services.full.quant?.current > 0) {
      realPrice = priceData.services.full.cost || 0
      actualService = 'full'
      console.log(`🔄 [RENT-SMS-ACTIVATE] Fallback to 'full' service: $${realPrice}`)
    }
    
    // If still no price, use estimate but warn
    if (realPrice <= 0) {
      // Fallback estimate based on duration
      const estimateByDuration: Record<number, number> = {
        4: 0.50,
        24: 1.00,
        168: 5.00,
        720: 15.00
      }
      realPrice = estimateByDuration[rentHours] || (rentHours / 24) * 0.50
      console.log(`⚠️ [RENT-SMS-ACTIVATE] Using estimated price: $${realPrice} (no API price found)`)
    }

    // 3. Check user balance
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    if (userProfile.balance < realPrice) {
      throw new Error(`Insufficient balance. Required: $${realPrice.toFixed(2)}, Available: $${userProfile.balance.toFixed(2)}`)
    }

    // 4. Rent number from SMS-Activate
    const params = new URLSearchParams({
      api_key: SMS_ACTIVATE_API_KEY!,
      action: 'getRentNumber',
      service: actualService,
      country: smsActivateCountry.toString(),
      rent_time: rentHours.toString()
    })

    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?${params.toString()}`
    console.log('🌐 [RENT-SMS-ACTIVATE] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const responseData = await response.json()

    console.log('📥 [RENT-SMS-ACTIVATE] API Response:', JSON.stringify(responseData))

    // Parse JSON response: { status: "success", phone: { id, endDate, number, lock_cancel_time } }
    // Or error: { status: "error", message: "NO_NUMBERS", errorMsg: "..." }
    if (responseData.status !== 'success' || !responseData.phone) {
      const errorMsg = responseData.message || responseData.errorMsg || 'Unknown error'
      if (errorMsg === 'NO_NUMBERS') {
        throw new Error(`No numbers available for ${service} in ${country}. Try a different service or country.`)
      }
      if (errorMsg === 'NO_BALANCE') {
        throw new Error('Insufficient balance on SMS-Activate. Please contact support.')
      }
      throw new Error(`SMS-Activate rental error: ${errorMsg}`)
    }

    const { id: rentalId, number: phone, endDate } = responseData.phone

    // 4. Create rental record - use endDate from API instead of calculating
    const apiEndDate = new Date(endDate)

    const { data: rental, error: rentalError } = await supabaseClient
      .from('rentals')
      .insert({
        user_id: userId,
        rental_id: rentalId.toString(),
        phone: phone,
        service_code: service,
        country_code: country,
        price: realPrice,
        rent_hours: rentHours,
        status: 'active',
        end_date: apiEndDate.toISOString()
      })
      .select()
      .single()

    if (rentalError) {
      console.error('❌ [RENT-SMS-ACTIVATE] Failed to create rental:', rentalError)
      
      // Try to cancel on SMS-Activate
      try {
        await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${rentalId}&status=finish`)
      } catch (e) {
        console.error('Failed to cancel rental on SMS-Activate:', e)
      }
      
      throw new Error('Failed to create rental record')
    }

    // 5. Charge user immediately (rentals are charged upfront)
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'rental',
        amount: -realPrice,
        description: `Rent number for ${service} in ${country} (${rentHours}h)`,
        status: 'completed',
        related_rental_id: rental.id
      })

    if (transactionError) {
      console.error('❌ [RENT-SMS-ACTIVATE] Failed to create transaction:', transactionError)
    }

    // 6. Ledger + update user balance
    const newBalance = userProfile.balance - realPrice

    await supabaseClient.from('balance_operations').insert({
      user_id: userId,
      rental_id: rental.id,
      operation_type: 'debit',
      amount: realPrice,
      balance_before: userProfile.balance,
      balance_after: newBalance,
      frozen_before: userProfile.frozen_balance ?? 0,
      frozen_after: userProfile.frozen_balance ?? 0,
      reason: `Rent ${service} ${country} (${rentHours}h)`
    })

    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ [RENT-SMS-ACTIVATE] Failed to update balance:', updateError)
    }

    console.log('✅ [RENT-SMS-ACTIVATE] Success:', {
      id: rental.id,
      phone,
      price: realPrice,
      endDate: apiEndDate.toISOString()
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: rental.id,
          rental_id: rentalId,
          phone: phone,
          service: service,
          country: country,
          price: realPrice,
          rent_hours: rentHours,
          status: 'active',
          end_date: apiEndDate.toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [RENT-SMS-ACTIVATE] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
