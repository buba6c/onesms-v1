// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()
    const { rentalId, userId, hours } = body

    console.log('💰 [GET-EXTENSION-PRICE] Request:', { rentalId, userId, hours })

    if (!rentalId || !userId || !hours) {
      throw new Error('Missing required parameters: rentalId, userId, hours')
    }

    // 1. Get rental from database
    const { data: rental, error: rentalError } = await supabaseClient
      .from('rentals')
      .select('*')
      .eq('id', rentalId)
      .eq('user_id', userId)
      .single()

    if (rentalError || !rental) {
      throw new Error('Rental not found or unauthorized')
    }

    // 2. Check if rental can be extended
    const extendableStatuses = ['active', 'completed']
    if (!extendableStatuses.includes(rental.status)) {
      throw new Error(`Cannot extend rental with status: ${rental.status}`)
    }

    const smsActivateRentId = rental.order_id || rental.rent_id || rental.rental_id
    
    if (!smsActivateRentId) {
      throw new Error('No SMS-Activate rent ID found for this rental')
    }

    // 3. Get extension price from SMS-Activate API
    const infoUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=continueRentInfo&id=${smsActivateRentId}&hours=${hours}`
    console.log('💰 [GET-EXTENSION-PRICE] Fetching price for', hours, 'hours...')
    
    const infoResponse = await fetch(infoUrl)
    const infoText = await infoResponse.text()
    
    console.log('💰 [GET-EXTENSION-PRICE] Raw response:', infoText)
    
    let infoData: any
    try {
      infoData = JSON.parse(infoText)
    } catch {
      // Handle non-JSON responses like "RENT_DIE" or "BAD_ID"
      console.log('💰 [GET-EXTENSION-PRICE] Non-JSON response:', infoText)
      if (infoText.includes('RENT_DIE')) {
        throw new Error('Cette location a expiré sur SMS-Activate et ne peut plus être prolongée')
      }
      if (infoText.includes('BAD_ID') || infoText.includes('NO_ID_RENT')) {
        throw new Error('ID de location invalide ou expiré')
      }
      if (infoText.includes('INVALID_TIME')) {
        throw new Error('Cette location ne peut plus être prolongée (délai expiré)')
      }
      if (infoText.includes('INVALID_PHONE')) {
        throw new Error('Numéro invalide ou location expirée')
      }
      throw new Error(`Réponse API: ${infoText}`)
    }
    
    // Handle JSON error responses
    if (infoData.status === 'error') {
      const errorMessage = infoData.message || ''
      const maxHours = infoData.info?.max
      
      console.log('💰 [GET-EXTENSION-PRICE] API Error:', errorMessage, 'max:', maxHours)
      
      // IMPORTANT: Check CHANNELS_LIMIT FIRST before other errors
      if (errorMessage === 'CHANNELS_LIMIT') {
        console.log('💰 [GET-EXTENSION-PRICE] CHANNELS_LIMIT detected - returning blocked response')
        // Return a user-friendly response instead of error
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Prolongation temporairement indisponible. SMS-Activate a bloqué les extensions. Réessayez dans 15-30 minutes.',
            blocked: true,
            rental: {
              id: rental.id,
              phone: rental.phone,
              service_code: rental.service_code,
              end_date: rental.end_date
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
      
      if (errorMessage === 'INVALID_TIME') {
        // INVALID_TIME often means the rental can no longer be extended
        throw new Error('Cette location ne peut plus être prolongée (délai expiré ou statut incompatible)')
      }
      if (errorMessage === 'MAX_HOURS_EXCEED') {
        // Return a special response with max hours info instead of throwing
        const { data: userProfile } = await supabaseClient
          .from('users')
          .select('balance, frozen_balance')
          .eq('id', userId)
          .single()
        
        const availableBalance = (userProfile?.balance || 0) - (userProfile?.frozen_balance || 0)
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `Durée maximale dépassée`,
            maxHoursAvailable: maxHours || 0,
            userBalance: availableBalance,
            rental: {
              id: rental.id,
              phone: rental.phone,
              service_code: rental.service_code,
              end_date: rental.end_date,
              rent_hours: rental.rent_hours
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
      if (errorMessage === 'RENT_DIE') {
        throw new Error('Cette location a expiré sur SMS-Activate et ne peut plus être prolongée')
      }
      if (errorMessage === 'NO_ID_RENT' || errorMessage === 'INVALID_PHONE') {
        throw new Error('ID de location invalide')
      }
      if (errorMessage === 'NO_BALANCE') {
        throw new Error('Solde SMS-Activate insuffisant (côté serveur)')
      }
      
      throw new Error(`SMS-Activate: ${errorMessage || 'Impossible d\'obtenir le prix'}`)
    }
    
    const apiPrice = parseFloat(infoData.price) || 0
    if (apiPrice <= 0) {
      throw new Error('Prix non disponible pour cette extension')
    }
    
    // 4. Get margin from settings
    const { data: marginSetting } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'pricing_margin_percentage')
      .single()
    
    const marginPercentage = marginSetting?.value ? parseFloat(marginSetting.value) : 30
    const USD_TO_FCFA = 600
    const FCFA_TO_COINS = 100
    const MIN_PRICE_COINS = 5
    
    const priceFCFA = apiPrice * USD_TO_FCFA
    const priceCoins = priceFCFA / FCFA_TO_COINS
    const extensionPrice = Math.max(MIN_PRICE_COINS, Math.ceil(priceCoins * (1 + marginPercentage / 100)))
    
    console.log(`💰 [GET-EXTENSION-PRICE] Price: API=${apiPrice}$ → ${extensionPrice}Ⓐ for ${hours}h (margin: ${marginPercentage}%)`)

    // 5. Get user balance (available = balance - frozen)
    const { data: userProfile } = await supabaseClient
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    const userBalance = userProfile?.balance || 0
    const frozenBalance = userProfile?.frozen_balance || 0
    const availableBalance = userBalance - frozenBalance
    const canAfford = availableBalance >= extensionPrice

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          hours: hours,
          apiPrice: apiPrice,
          price: extensionPrice,
          userBalance: availableBalance, // Return available balance, not total
          canAfford: canAfford,
          rental: {
            id: rental.id,
            phone: rental.phone,
            service_code: rental.service_code,
            end_date: rental.end_date,
            rent_hours: rental.rent_hours
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('❌ [GET-EXTENSION-PRICE] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
// Force deploy v2 - CHANNELS_LIMIT fix
