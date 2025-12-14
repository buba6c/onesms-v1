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
  console.log('🧹 [CLEANUP-RENTALS] Function called')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use SERVICE_ROLE_KEY to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 [CLEANUP-RENTALS] Finding expired rentals...')

    // Find all expired rentals with status 'active'
    const { data: expiredRentals, error: fetchError } = await supabaseClient
      .from('rentals')
      .select('*')
      .eq('status', 'active')
      .lt('end_date', new Date().toISOString())

    if (fetchError) {
      throw new Error(`Failed to fetch expired rentals: ${fetchError.message}`)
    }

    console.log(`📊 [CLEANUP-RENTALS] Found ${expiredRentals.length} expired rentals`)

    const cleanupResults = []

    for (const rental of expiredRentals) {
      console.log(`🔧 [CLEANUP-RENTALS] Processing ${rental.phone} (${rental.rent_id})`)
      
      try {
        // Try to finish rental on SMS-Activate (status=1 means finish)
        const finishUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${rental.rent_id}&status=1`
        
        console.log(`📞 [CLEANUP-RENTALS] Finishing on SMS-Activate: ${rental.rent_id}`)
        let apiResult = 'N/A'
        try {
          const finishResponse = await fetch(finishUrl)
          const finishData = await finishResponse.json()
          apiResult = JSON.stringify(finishData)
          console.log(`📞 [CLEANUP-RENTALS] SMS-Activate response:`, finishData)
        } catch (apiError) {
          console.error(`⚠️ [CLEANUP-RENTALS] SMS-Activate API error (continuing):`, apiError.message)
        }

        // ✅ Consommer le gel (commit) à expiration: pas de remboursement
        const frozenAmount = rental.frozen_amount || 0
        let committedAmount = 0

        if (frozenAmount > 0) {
          console.log(`🔓 [CLEANUP-RENTALS] Calling secure_unfreeze_balance commit for rental ${rental.id}`)
          const { data: commitResult, error: commitError } = await supabaseClient.rpc('secure_unfreeze_balance', {
            p_user_id: rental.user_id,
            p_rental_id: rental.id,
            p_refund_to_balance: false,
            p_refund_reason: 'Rental expired - consumed'
          })

          if (commitError) {
            console.error(`⚠️ [CLEANUP-RENTALS] secure_unfreeze_balance commit failed:`, commitError)
          } else {
            console.log(`✅ [CLEANUP-RENTALS] secure_unfreeze_balance commit SUCCESS:`, commitResult)
            committedAmount = commitResult?.unfrozen ?? frozenAmount
          }
        } else {
          console.log(`⚠️ [CLEANUP-RENTALS] frozen_amount=0, already processed`)
        }

        // Update rental status to expired and reset frozen_amount
        const { error: updateError } = await supabaseClient
          .from('rentals')
          .update({ 
            status: 'expired',
            frozen_amount: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', rental.id)
          .eq('status', 'active')  // Safety: only if still active

        if (updateError) {
          throw new Error(`Failed to update rental ${rental.id}: ${updateError.message}`)
        }

        // Update related transaction to completed (rental was consumed)
        const { data: transaction } = await supabaseClient
          .from('transactions')
          .select('*')
          .eq('related_rental_id', rental.id)
          .eq('status', 'pending')
          .maybeSingle()

        if (transaction) {
          await supabaseClient
            .from('transactions')
            .update({ 
              status: 'completed',
              balance_before: transaction.balance_before ?? rental.balance_before, // best-effort
              balance_after: transaction.balance_after ?? rental.balance_before, // unchanged since commit already debits via RPC
              metadata: {
                ...transaction.metadata,
                completed_at: new Date().toISOString(),
                completion_reason: 'expired'
              }
            })
            .eq('id', transaction.id)
        }

        cleanupResults.push({
          id: rental.id,
          phone: rental.phone,
          rent_id: rental.rent_id,
          status: 'cleaned',
          sms_activate_response: apiResult,
          credits_unfrozen: committedAmount
        })

        console.log(`✅ [CLEANUP-RENTALS] Successfully cleaned ${rental.phone}`)

      } catch (error) {
        console.error(`❌ [CLEANUP-RENTALS] Failed to clean ${rental.phone}:`, error.message)
        cleanupResults.push({
          id: rental.id,
          phone: rental.phone,
          rent_id: rental.rent_id,
          status: 'error',
          error: error.message
        })
      }
    }

    console.log(`✅ [CLEANUP-RENTALS] Cleanup completed. Processed ${expiredRentals.length} rentals`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${expiredRentals.length} expired rentals`,
        results: cleanupResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('❌ [CLEANUP-RENTALS] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
