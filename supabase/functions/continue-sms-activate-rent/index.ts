// @ts-nocheck
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

    // 3. Guard against concurrent extension/freeze already present
    if ((rental.frozen_amount || 0) > 0) {
      throw new Error('Extension already en cours (fonds gelés). Réessayez plus tard ou contactez le support.')
    }

    // 4. Calculate extension parameters and price (same duration as current rent_hours)
    const rentTimeHours = rental.rent_hours || 4 // Default 4 hours extension
    const basePrice = 0.50
    const dailyMultiplier = rentTimeHours / 24
    const extensionPrice = basePrice * dailyMultiplier

    // 5. Check user balance
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

    // 6. Freeze atomique avant l'appel provider
    let froze = false
    let committed = false

    const { data: freezeResult, error: freezeError } = await supabaseClient.rpc('secure_freeze_balance', {
      p_user_id: userId,
      p_amount: extensionPrice,
      p_rental_id: rental.id,
      p_reason: `Freeze extension rent ${rental.id} (+${rentTimeHours}h)`
    })

    if (freezeError || !freezeResult?.success) {
      throw new Error(`Failed to freeze for extension: ${freezeError?.message || 'unknown error'}`)
    }
    froze = true

    // 7. Extend rental on SMS-Activate
    // Support multiple column names for SMS-Activate rent ID
    const smsActivateRentId = rental.order_id || rental.rent_id || rental.rental_id
    
    // ✅ Correct API action: continueRentNumber (not continueRent)
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=continueRentNumber&id=${smsActivateRentId}&rent_time=${rentTimeHours}`
    console.log('🌐 [CONTINUE-RENT] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const responseText = await response.text()

    console.log('📥 [CONTINUE-RENT] API Response:', responseText)

    // Parse JSON response
    let apiData: any
    try {
      apiData = JSON.parse(responseText)
    } catch {
      // If not JSON, check for error string
      if (responseText.startsWith('BAD_') || responseText.includes('ERROR')) {
        throw new Error(`SMS-Activate error: ${responseText}`)
      }
      throw new Error(`Invalid API response: ${responseText}`)
    }

    // Check for error response
    if (apiData.status === 'error') {
      throw new Error(`SMS-Activate error: ${apiData.message || apiData.info || 'Unknown error'}`)
    }

    // Get new end date from response or calculate it
    let newEndDate: Date
    if (apiData.phone?.endDate) {
      newEndDate = new Date(apiData.phone.endDate)
    } else {
      newEndDate = new Date(new Date(rental.end_date).getTime() + rentTimeHours * 3600 * 1000)
    }

    // Note: If rental was completed, a new ID might be provided
    const newRentId = apiData.phone?.id || smsActivateRentId

    // 8. Commit le freeze (débit effectif) et mettre à jour la location
    const { data: commitResult, error: commitError } = await supabaseClient.rpc('secure_unfreeze_balance', {
      p_user_id: userId,
      p_rental_id: rental.id,
      p_refund_to_balance: false,
      p_refund_reason: `Commit extension rent ${smsActivateRentId} (+${rentTimeHours}h)`
    })

    if (commitError || !commitResult?.success) {
      // Tentative de rollback du gel en cas d'échec du commit
      await supabaseClient.rpc('secure_unfreeze_balance', {
        p_user_id: userId,
        p_rental_id: rental.id,
        p_refund_to_balance: true,
        p_refund_reason: `Rollback extension commit ${smsActivateRentId}`
      })
      throw new Error(`Failed to commit extension: ${commitError?.message || 'unknown error'}`)
    }
    committed = true

    const updatedRentId = newRentId.toString()
    const { error: rentalUpdateError } = await supabaseClient
      .from('rentals')
      .update({
        end_date: newEndDate.toISOString(),
        rent_id: updatedRentId,
        rental_id: updatedRentId,
        rent_hours: rental.rent_hours + rentTimeHours,
        total_cost: (rental.total_cost || 0) + extensionPrice,
        status: 'active',
        frozen_amount: 0,
        charged: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', rentalId)

    if (rentalUpdateError) {
      throw new Error(`Failed to update rental after extension: ${rentalUpdateError.message}`)
    }

    console.log('✅ [CONTINUE-RENT] Successfully extended with atomic freeze/commit:', {
      rentalId,
      price: extensionPrice,
      newEndDate: newEndDate.toISOString(),
      rent_id: updatedRentId
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rental_id: rentalId,
          rent_id: updatedRentId,
          end_date: newEndDate.toISOString(),
          price: extensionPrice
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    // Best-effort rollback of freeze if commit not done
    try {
      if (typeof froze !== 'undefined' && froze && typeof committed !== 'undefined' && !committed) {
        await supabaseClient.rpc('secure_unfreeze_balance', {
          p_user_id: userId,
          p_rental_id: rental?.id,
          p_refund_to_balance: true,
          p_refund_reason: 'Rollback extension failure'
        })
      }
    } catch (e) {
      console.error('⚠️ rollback unfreeze failed:', (e as Error).message)
    }

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
