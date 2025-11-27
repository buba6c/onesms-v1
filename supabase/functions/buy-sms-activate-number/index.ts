import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.io/stubs/handler_api.php'

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
  console.log('🚀 [BUY-SMS-ACTIVATE] Function called')
  
  if (req.method === 'OPTIONS') {
    console.log('✅ [BUY-SMS-ACTIVATE] OPTIONS request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📋 [BUY-SMS-ACTIVATE] Environment check:', {
      hasUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasSmsKey: !!Deno.env.get('SMS_ACTIVATE_API_KEY'),
      hasAuth: !!req.headers.get('Authorization')
    })
    
    // Use SERVICE_ROLE_KEY to bypass RLS for inserting activation records
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    console.log('🔐 [BUY-SMS-ACTIVATE] Checking user authentication...')
    
    // Get user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    console.log('👤 [BUY-SMS-ACTIVATE] User:', user ? `${user.id}` : 'null')

    if (!user) {
      throw new Error('Unauthorized')
    }

    console.log('📦 [BUY-SMS-ACTIVATE] Parsing request body...')
    const { country, operator, product, userId, expectedPrice } = await req.json()

    console.log('📞 [BUY-SMS-ACTIVATE] Request:', { country, operator, product, userId, expectedPrice })

    // 1. Get service from database
    const { data: service, error: serviceError } = await supabaseClient
      .from('services')
      .select('*')
      .eq('code', product)
      .single()

    if (serviceError || !service) {
      throw new Error(`Service not found: ${product}`)
    }

    // 2. Get country pricing from SMS-Activate API directly
    // Fetch real-time price instead of relying on pricing_rules
    const smsActivateService = mapServiceCode(product)
    const smsActivateCountry = mapCountryCode(country)
    
    const priceUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${smsActivateService}&country=${smsActivateCountry}`
    
    let price = 0.5 // Fallback price
    
    try {
      const priceResponse = await fetch(priceUrl)
      const priceData = await priceResponse.json()
      
      console.log(`💰 [BUY-SMS-ACTIVATE] Price API response:`, priceData)
      
      // priceData format: { "187": { "cost": "0.50", "count": 100 } }
      // OR: { "6": { "wa": { "cost": "0.50", "count": 100 } } }
      if (priceData && priceData[smsActivateCountry.toString()]) {
        const countryData = priceData[smsActivateCountry.toString()]
        
        // Check if it's nested (service inside country)
        if (countryData[smsActivateService]) {
          const parsedPrice = parseFloat(countryData[smsActivateService].cost)
          if (!isNaN(parsedPrice) && parsedPrice > 0) {
            price = parsedPrice
            console.log(`💰 [BUY-SMS-ACTIVATE] Real-time price (nested): $${price}`)
          }
        } else if (countryData.cost) {
          const parsedPrice = parseFloat(countryData.cost)
          if (!isNaN(parsedPrice) && parsedPrice > 0) {
            price = parsedPrice
            console.log(`💰 [BUY-SMS-ACTIVATE] Real-time price (direct): $${price}`)
          }
        }
      }
    } catch (e) {
      console.error('⚠️ [BUY-SMS-ACTIVATE] Failed to fetch real-time price, using fallback:', e)
    }
    
    // ✅ Utiliser le prix attendu du frontend si fourni (garantit la cohérence d'affichage)
    // Sinon utiliser le prix API ou fallback
    if (expectedPrice && expectedPrice > 0) {
      console.log(`💰 [BUY-SMS-ACTIVATE] Using expectedPrice from frontend: ${expectedPrice} (API was: ${price})`)
      price = expectedPrice
    }
    
    // Ensure price is valid
    if (!price || isNaN(price) || price <= 0) {
      console.warn(`⚠️ [BUY-SMS-ACTIVATE] Invalid price ${price}, using fallback 0.5`)
      price = 0.5
    }

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
      throw new Error(`Insufficient balance. Required: $${price}, Available: $${userProfile.balance}`)
    }

    // 4. Buy number from SMS-Activate using getNumberV2 (JSON response)
    const orderId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const params = new URLSearchParams({
      api_key: SMS_ACTIVATE_API_KEY!,
      action: 'getNumberV2',
      service: smsActivateService,
      country: smsActivateCountry.toString(),
      orderId: orderId
    })

    if (operator && operator !== 'any') {
      params.append('operator', operator)
    }

    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?${params.toString()}`
    console.log('🌐 [BUY-SMS-ACTIVATE] API Call (V2):', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const responseText = await response.text()

    console.log('📥 [BUY-SMS-ACTIVATE] API Response:', responseText)

    // Parse JSON response from getNumberV2
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      // Fallback: if response is still text format (ACCESS_NUMBER:id:phone)
      if (responseText.startsWith('ACCESS_NUMBER:')) {
        const [, activationId, phone] = responseText.split(':')
        data = { activationId, phoneNumber: phone }
      } else {
        throw new Error(`SMS-Activate error: ${responseText}`)
      }
    }

    const {
      activationId,
      phoneNumber: phone,
      activationCost,
      activationOperator,
      canGetAnotherSms
    } = data

    if (!activationId || !phone) {
      throw new Error(`Invalid response from SMS-Activate: ${responseText}`)
    }

    console.log('📞 [BUY-SMS-ACTIVATE] Number purchased:', {
      activationId,
      phone,
      cost: activationCost || price,
      operator: activationOperator,
      canRetry: canGetAnotherSms
    })

    // 5. Create activation record
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000) // 20 minutes

    const { data: activation, error: activationError } = await supabaseClient
      .from('activations')
      .insert({
        user_id: userId,
        order_id: activationId,
        phone: phone,
        service_code: product,
        country_code: country,
        operator: operator || 'any',
        price: price,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        provider: 'sms-activate'
      })
      .select()
      .single()

    if (activationError) {
      console.error('❌ [BUY-SMS-ACTIVATE] Failed to create activation:', activationError)
      console.error('❌ [BUY-SMS-ACTIVATE] Activation error details:', JSON.stringify(activationError, null, 2))
      console.error('❌ [BUY-SMS-ACTIVATE] Attempted insert:', {
        user_id: userId,
        order_id: activationId,
        phone: phone,
        service_code: product,
        country_code: country,
        operator: operator || 'any',
        price: price,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        provider: 'sms-activate'
      })
      
      // Try to cancel on SMS-Activate
      try {
        await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activationId}&status=8`)
      } catch (e) {
        console.error('Failed to cancel on SMS-Activate:', e)
      }
      
      throw new Error(`Failed to create activation record: ${activationError.message || JSON.stringify(activationError)}`)
    }

    // 6. DEDUCT user balance immediately
    const { error: balanceError } = await supabaseClient
      .from('users')
      .update({ balance: userProfile.balance - price })
      .eq('id', userId)

    if (balanceError) {
      console.error('❌ [BUY-SMS-ACTIVATE] Failed to deduct balance:', balanceError)
      // Try to cancel on SMS-Activate since we couldn't charge
      try {
        await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activationId}&status=8`)
      } catch (e) {
        console.error('Failed to cancel on SMS-Activate:', e)
      }
      throw new Error('Failed to deduct balance')
    }

    console.log(`💰 [BUY-SMS-ACTIVATE] Balance deducted: ${price} from ${userProfile.balance} = ${userProfile.balance - price}`)

    // 7. Create transaction record (completed)
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'usage',
        amount: -price,
        description: `SMS activation for ${service.name} in ${country}`,
        status: 'completed',
        related_activation_id: activation.id
      })

    if (transactionError) {
      console.error('❌ [BUY-SMS-ACTIVATE] Failed to create transaction:', transactionError)
    }

    console.log('✅ [BUY-SMS-ACTIVATE] Success:', {
      id: activation.id,
      phone,
      price
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: activation.id,
          activation_id: activationId,
          phone: phone,
          service: product,
          country: country,
          operator: operator || 'any',
          price: price,
          status: 'pending',
          expires: expiresAt.toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [BUY-SMS-ACTIVATE] Error:', error)
    console.error('❌ [BUY-SMS-ACTIVATE] Error stack:', error.stack)
    console.error('❌ [BUY-SMS-ACTIVATE] Error details:', JSON.stringify(error, null, 2))
    
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
