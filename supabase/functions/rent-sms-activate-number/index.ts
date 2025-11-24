import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Service code mapping: 5sim → SMS-Activate
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

// Country code mapping: 5sim → SMS-Activate
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
  return COUNTRY_CODE_MAP[country.toLowerCase()] || 0
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

    // Get user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { service, country, rentHours, userId } = await req.json()

    console.log('🏠 [RENT-SMS-ACTIVATE] Request:', { service, country, rentHours, userId })

    // 1. Get rental pricing (estimate: $0.50/day base, varies by service/country)
    // For now, use a simple calculation
    const basePrice = 0.50
    const dailyMultiplier = rentHours / 24
    const estimatedPrice = basePrice * dailyMultiplier

    // 2. Check user balance
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    if (userProfile.balance < estimatedPrice) {
      throw new Error(`Insufficient balance. Required: $${estimatedPrice.toFixed(2)}, Available: $${userProfile.balance}`)
    }

    // 3. Rent number from SMS-Activate
    const smsActivateService = mapServiceCode(service)
    const smsActivateCountry = mapCountryCode(country)

    const params = new URLSearchParams({
      api_key: SMS_ACTIVATE_API_KEY!,
      action: 'getRentNumber',
      service: smsActivateService,
      country: smsActivateCountry.toString(),
      rent_time: rentHours.toString()
    })

    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?${params.toString()}`
    console.log('🌐 [RENT-SMS-ACTIVATE] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const responseText = await response.text()

    console.log('📥 [RENT-SMS-ACTIVATE] API Response:', responseText)

    // Parse response: ACCESS_NUMBER:id:phone or ACCESS_RENT:id:phone
    if (!responseText.startsWith('ACCESS_NUMBER:') && !responseText.startsWith('ACCESS_RENT:')) {
      throw new Error(`SMS-Activate rental error: ${responseText}`)
    }

    const [, rentalId, phone] = responseText.split(':')

    // 4. Create rental record
    const endDate = new Date(Date.now() + rentHours * 3600 * 1000)

    const { data: rental, error: rentalError } = await supabaseClient
      .from('rentals')
      .insert({
        user_id: userId,
        rental_id: rentalId,
        phone: phone,
        service_code: service,
        country_code: country,
        price: estimatedPrice,
        rent_hours: rentHours,
        status: 'active',
        end_date: endDate.toISOString()
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
        amount: -estimatedPrice,
        description: `Rent number for ${service} in ${country} (${rentHours}h)`,
        status: 'completed',
        related_rental_id: rental.id
      })

    if (transactionError) {
      console.error('❌ [RENT-SMS-ACTIVATE] Failed to create transaction:', transactionError)
    }

    // 6. Update user balance
    const newBalance = userProfile.balance - estimatedPrice
    
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
      price: estimatedPrice,
      endDate: endDate.toISOString()
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
          price: estimatedPrice,
          rent_hours: rentHours,
          status: 'active',
          end_date: endDate.toISOString()
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
