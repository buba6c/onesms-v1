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

  let supabaseClient: any = null
  let rentalId: string | null = null
  let userId: string | null = null
  let extensionLocked = false

  try {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()
    rentalId = body.rentalId
    userId = body.userId
    // Allow user to choose extension duration (default: same as original, min 4h)
    const requestedHours = body.hours || null

    console.log('⏰ [CONTINUE-RENT] Request:', { rentalId, userId, requestedHours })

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
      throw new Error(`Cannot extend rental with status: ${rental.status}. Only active or completed rentals can be extended.`)
    }

    // 3. Check if extension is already in progress
    if (rental.metadata?.extension_in_progress) {
      throw new Error('Extension already en cours. Réessayez plus tard ou contactez le support.')
    }

    // 4. Determine extension duration
    // Use requested hours, or default to original rental duration, minimum 4h
    const rentTimeHours = requestedHours || rental.rent_hours || 4
    if (rentTimeHours < 4) {
      throw new Error('Minimum extension duration is 4 hours')
    }
    
    const smsActivateRentId = rental.order_id || rental.rent_id || rental.rental_id
    
    // 5. Get extension price from SMS-Activate API
    const infoUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=continueRentInfo&id=${smsActivateRentId}&hours=${rentTimeHours}`
    console.log('💰 [CONTINUE-RENT] Getting extension price for', rentTimeHours, 'hours...')
    
    const infoResponse = await fetch(infoUrl)
    const infoData = await infoResponse.json()
    
    console.log('💰 [CONTINUE-RENT] Price info:', infoData)
    
    if (infoData.status === 'error') {
      throw new Error(`SMS-Activate: ${infoData.message || 'Cannot get extension price'}`)
    }
    
    const apiPrice = parseFloat(infoData.price) || 0
    if (apiPrice <= 0) {
      throw new Error('Failed to get extension price from SMS-Activate')
    }
    
    // Get margin from settings
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
    
    console.log(`💰 [CONTINUE-RENT] Price: API=${apiPrice}$ → ${extensionPrice}Ⓐ for ${rentTimeHours}h (margin: ${marginPercentage}%)`)

    // 6. Check user balance (available = balance - frozen)
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    const availableBalance = userProfile.balance - (userProfile.frozen_balance || 0)
    if (availableBalance < extensionPrice) {
      throw new Error(`INSUFFICIENT_BALANCE:${extensionPrice}:${availableBalance}`)
    }

    // 7. Mark extension in progress (lock)
    const { error: lockError } = await supabaseClient
      .from('rentals')
      .update({ 
        metadata: { ...rental.metadata, extension_in_progress: true },
        updated_at: new Date().toISOString()
      })
      .eq('id', rentalId)
    
    if (lockError) {
      throw new Error(`Failed to lock rental: ${lockError.message}`)
    }
    extensionLocked = true

    // 8. Extend rental on SMS-Activate FIRST (before charging)
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=continueRentNumber&id=${smsActivateRentId}&rent_time=${rentTimeHours}`
    console.log('🌐 [CONTINUE-RENT] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const responseText = await response.text()

    console.log('📥 [CONTINUE-RENT] API Response:', responseText)

    let apiData: any
    try {
      apiData = JSON.parse(responseText)
    } catch {
      if (responseText.startsWith('BAD_') || responseText.includes('ERROR') || responseText.includes('RENT_DIE')) {
        throw new Error(`SMS-Activate: ${responseText}`)
      }
      throw new Error(`Invalid API response: ${responseText}`)
    }

    if (apiData.status === 'error') {
      throw new Error(`SMS-Activate: ${apiData.message || apiData.info || 'Unknown error'}`)
    }

    let newEndDate: Date
    if (apiData.phone?.endDate) {
      // endDate from SMS-Activate is a Unix timestamp in seconds
      const endDateValue = apiData.phone.endDate
      // Check if it's seconds (small number) or milliseconds (large number)
      const timestamp = endDateValue < 10000000000 ? endDateValue * 1000 : endDateValue
      newEndDate = new Date(timestamp)
      console.log('📅 [CONTINUE-RENT] Parsed endDate:', endDateValue, '→', newEndDate.toISOString())
    } else {
      newEndDate = new Date(new Date(rental.end_date).getTime() + rentTimeHours * 3600 * 1000)
      console.log('📅 [CONTINUE-RENT] Using fallback calculation:', newEndDate.toISOString())
    }

    const newRentId = apiData.phone?.id || smsActivateRentId

    // 9. IMPORTANT: Insert balance_operations BEFORE updating users (trigger requirement)
    // Valid types: 'freeze', 'refund', 'credit_admin', 'commit', 'debit_admin'
    const newBalance = userProfile.balance - extensionPrice
    const { error: logError } = await supabaseClient
      .from('balance_operations')
      .insert({
        user_id: userId,
        operation_type: 'commit',
        amount: extensionPrice,
        balance_before: userProfile.balance,
        balance_after: newBalance,
        frozen_before: userProfile.frozen_balance || 0,
        frozen_after: userProfile.frozen_balance || 0,
        reason: `Extension location ${smsActivateRentId} (+${rentTimeHours}h)`
      })
    
    if (logError) {
      console.error('❌ [CONTINUE-RENT] Failed to log operation:', logError)
      throw new Error(`Failed to log operation: ${logError.message}`)
    }

    // 10. Now deduct balance (after balance_operations insert)
    const { error: deductError } = await supabaseClient
      .from('users')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (deductError) {
      console.error('❌ [CONTINUE-RENT] Failed to deduct balance:', deductError)
      throw new Error(`Failed to deduct balance: ${deductError.message}`)
    }

    // 11. Update rental
    const updatedRentId = newRentId.toString()
    const { error: rentalUpdateError } = await supabaseClient
      .from('rentals')
      .update({
        end_date: newEndDate.toISOString(),
        expires_at: newEndDate.toISOString(), // Also update expires_at for consistency
        rent_id: updatedRentId,
        rental_id: updatedRentId,
        rent_hours: rental.rent_hours + rentTimeHours,
        total_cost: (rental.total_cost || 0) + extensionPrice,
        status: 'active',
        metadata: { ...rental.metadata, extension_in_progress: false },
        charged: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', rentalId)

    if (rentalUpdateError) {
      throw new Error(`Failed to update rental: ${rentalUpdateError.message}`)
    }

    console.log('✅ [CONTINUE-RENT] Extended:', { rentalId, hours: rentTimeHours, price: extensionPrice, newEndDate: newEndDate.toISOString() })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rental_id: rentalId,
          rent_id: updatedRentId,
          end_date: newEndDate.toISOString(),
          hours: rentTimeHours,
          price: extensionPrice
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    // Release extension lock if set
    if (extensionLocked && supabaseClient && rentalId) {
      try {
        await supabaseClient
          .from('rentals')
          .update({ metadata: { extension_in_progress: false }, updated_at: new Date().toISOString() })
          .eq('id', rentalId)
        console.log('🔓 [CONTINUE-RENT] Released lock')
      } catch (e) {
        console.error('⚠️ [CONTINUE-RENT] Failed to release lock:', (e as Error).message)
      }
    }

    console.error('❌ [CONTINUE-RENT] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
