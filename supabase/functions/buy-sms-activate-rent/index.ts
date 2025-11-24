import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Service code mapping
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
  'steam': 'st'
}

// Country code mapping
const COUNTRY_CODE_MAP: Record<string, number> = {
  'russia': 0,
  'ukraine': 1,
  'kazakhstan': 2,
  'china': 3,
  'philippines': 4,
  'indonesia': 6,
  'malaysia': 7,
  'vietnam': 10,
  'kyrgyzstan': 11,
  'england': 12,
  'usa': 187,
  'canada': 36,
  'india': 22,
  'thailand': 52,
  'poland': 15,
  'brazil': 73,
  'romania': 32,
  'colombia': 33,
  'argentina': 39,
  'italy': 58,
  'spain': 56,
  'france': 78,
  'germany': 43,
  'mexico': 82,
  'australia': 175
}

const mapServiceCode = (code: string): string => {
  return SERVICE_CODE_MAP[code.toLowerCase()] || code
}

const mapCountryCode = (country: string): number => {
  return COUNTRY_CODE_MAP[country.toLowerCase()] || 2 // Default: Kazakhstan
}

// Rent duration in hours
const RENT_DURATIONS: Record<string, number> = {
  '4hours': 4,
  '1day': 24,
  '1week': 168,
  '1month': 720
}

serve(async (req) => {
  console.log('🚀 [BUY-RENT] Function called')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { country, product, userId, duration = '4hours' } = await req.json()

    console.log('📞 [BUY-RENT] Request:', { country, product, userId, duration })

    // 1. Get service from database
    const { data: service, error: serviceError } = await supabaseClient
      .from('services')
      .select('*')
      .eq('code', product)
      .single()

    if (serviceError || !service) {
      throw new Error(`Service not found: ${product}`)
    }

    const smsActivateService = mapServiceCode(product)
    const smsActivateCountry = mapCountryCode(country)
    const rentTime = RENT_DURATIONS[duration] || 4

    // 2. Get available rent services and find best price
    console.log('💰 [BUY-RENT] Checking available rent options...')
    const servicesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&country=${smsActivateCountry}&rent_time=${rentTime}`
    
    const servicesResponse = await fetch(servicesUrl)
    const servicesData = await servicesResponse.json()
    
    console.log('💰 [BUY-RENT] Available services:', servicesData)
    
    // Find price for the requested service
    let price = 0
    if (servicesData.services && servicesData.services[smsActivateService]) {
      price = servicesData.services[smsActivateService].cost || 0
    }
    
    if (!price || price <= 0) {
      throw new Error(`Rent not available for ${service.name} in ${country} for ${duration}`)
    }

    console.log(`💰 [BUY-RENT] Rent price: $${price} for ${rentTime} hours`)

    // 3. Check user balance
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    if (userProfile.balance < price) {
      throw new Error(`Insufficient balance. Required: ${price}Ⓐ, Available: ${userProfile.balance}Ⓐ`)
    }

    // 4. Rent number from SMS-Activate (operator selected automatically by API)
    const rentParams = new URLSearchParams({
      api_key: SMS_ACTIVATE_API_KEY!,
      action: 'getRentNumber',
      service: smsActivateService,
      country: smsActivateCountry.toString(),
      rent_time: rentTime.toString()
    })

    const rentUrl = `${SMS_ACTIVATE_BASE_URL}?${rentParams.toString()}`
    console.log('🌐 [BUY-RENT] API Call:', rentUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const rentResponse = await fetch(rentUrl)
    const rentData = await rentResponse.json()

    console.log('📥 [BUY-RENT] API Response:', rentData)

    if (rentData.status !== 'success' || !rentData.phone) {
      throw new Error(rentData.message || 'Failed to rent number')
    }

    const {
      phone: { id: rentId, number: phone, endDate }
    } = rentData

    console.log('📞 [BUY-RENT] Number rented:', {
      rentId,
      phone,
      endDate,
      price,
      duration: rentTime
    })

    // 5. Create rental record
    const { data: rental, error: rentalError } = await supabaseClient
      .from('rentals')
      .insert({
        user_id: userId,
        rental_id: rentId.toString(),
        phone: phone,
        service_code: product,
        country_code: country,
        operator: 'auto', // SMS-Activate selects automatically
        price: price,
        status: 'active',
        expires_at: endDate,
        duration_hours: rentTime,
        provider: 'sms-activate'
      })
      .select()
      .single()

    if (rentalError) {
      console.error('❌ [BUY-RENT] Failed to create rental:', rentalError)
      
      // Try to cancel on SMS-Activate
      try {
        await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${rentId}&status=2`)
      } catch (e) {
        console.error('Failed to cancel rent on SMS-Activate:', e)
      }
      
      throw new Error(`Failed to create rental record: ${rentalError.message}`)
    }

    // 6. Deduct balance and create transaction
    const { error: balanceError } = await supabaseClient
      .from('users')
      .update({ balance: userProfile.balance - price })
      .eq('id', userId)

    if (balanceError) {
      console.error('❌ [BUY-RENT] Failed to deduct balance:', balanceError)
    }

    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'rental',
        amount: -price,
        description: `Rent ${service.name} in ${country} for ${duration}`,
        status: 'completed',
        metadata: {
          rental_id: rental.id,
          duration: duration,
          rent_time_hours: rentTime
        }
      })

    if (transactionError) {
      console.error('❌ [BUY-RENT] Failed to create transaction:', transactionError)
    }

    console.log('✅ [BUY-RENT] Success:', {
      id: rental.id,
      phone,
      price,
      duration: rentTime
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: rental.id,
          rental_id: rentId,
          phone: phone,
          service: product,
          country: country,
          price: price,
          status: 'active',
          expires: endDate,
          duration_hours: rentTime
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [BUY-RENT] Error:', error)
    console.error('❌ [BUY-RENT] Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || String(error),
        details: error.stack || error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
