import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { rentalId, userId } = await req.json()

    console.log('⏰ [CONTINUE-RENT] Request:', { rentalId, userId })

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
    if (rental.status !== 'active') {
      throw new Error(`Cannot extend rental with status: ${rental.status}`)
    }

    // 3. Calculate extension price (same as original rent_hours)
    const basePrice = 0.50
    const dailyMultiplier = rental.rent_hours / 24
    const extensionPrice = basePrice * dailyMultiplier

    // 4. Check user balance
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    if (userProfile.balance < extensionPrice) {
      throw new Error(`Insufficient balance. Required: $${extensionPrice.toFixed(2)}, Available: $${userProfile.balance}`)
    }

    // 5. Extend rental on SMS-Activate
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=continueRent&id=${rental.rental_id}`
    console.log('🌐 [CONTINUE-RENT] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const responseText = await response.text()

    console.log('📥 [CONTINUE-RENT] API Response:', responseText)

    if (responseText.startsWith('BAD_')) {
      throw new Error(`SMS-Activate error: ${responseText}`)
    }

    // 6. Update rental end_date
    const newEndDate = new Date(new Date(rental.end_date).getTime() + rental.rent_hours * 3600 * 1000)

    await supabaseClient
      .from('rentals')
      .update({ end_date: newEndDate.toISOString() })
      .eq('id', rentalId)

    // 7. Charge user for extension
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'rental_extension',
        amount: -extensionPrice,
        description: `Extended rental for ${rental.service_code} in ${rental.country_code} (+${rental.rent_hours}h)`,
        status: 'completed',
        related_rental_id: rental.id
      })

    if (transactionError) {
      console.error('❌ [CONTINUE-RENT] Failed to create transaction:', transactionError)
    }

    // 8. Update user balance
    const newBalance = userProfile.balance - extensionPrice
    
    await supabaseClient
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId)

    console.log('✅ [CONTINUE-RENT] Successfully extended:', {
      rentalId,
      price: extensionPrice,
      newEndDate: newEndDate.toISOString()
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rental_id: rentalId,
          end_date: newEndDate.toISOString(),
          price: extensionPrice,
          new_balance: newBalance
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [CONTINUE-RENT] Error:', error)
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
