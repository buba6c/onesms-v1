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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔄 [SYNC-ACTIVATIONS] Starting sync with SMS-Activate...')

    // 1. Get all active activations from SMS-Activate (includes SMS texts!)
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getActiveActivations`
    console.log('🌐 [SYNC-ACTIVATIONS] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const apiData = await response.json()

    console.log('📥 [SYNC-ACTIVATIONS] Response:', JSON.stringify(apiData))

    if (apiData.status !== 'success' || !apiData.activeActivations) {
      console.log('⚠️ [SYNC-ACTIVATIONS] No active activations found')
      return new Response(
        JSON.stringify({
          success: true,
          synced: 0,
          message: 'No active activations on SMS-Activate'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    let syncedCount = 0
    let updatedCount = 0

    // 2. Process each activation from SMS-Activate
    for (const smsActivateActivation of apiData.activeActivations) {
      const orderId = smsActivateActivation.activationId
      const phoneNumber = smsActivateActivation.phoneNumber
      const smsCode = Array.isArray(smsActivateActivation.smsCode) 
        ? smsActivateActivation.smsCode[0] 
        : smsActivateActivation.smsCode
      const smsText = Array.isArray(smsActivateActivation.smsText)
        ? smsActivateActivation.smsText[0]
        : smsActivateActivation.smsText

      console.log(`📱 [SYNC-ACTIVATIONS] Processing ${phoneNumber} (${orderId}):`, {
        hasCode: !!smsCode,
        hasText: !!smsText,
        status: smsActivateActivation.activationStatus
      })

      // 3. Find activation in our database
      const { data: activation } = await supabaseClient
        .from('activations')
        .select('*')
        .eq('order_id', orderId)
        .single()

      if (!activation) {
        console.log(`⚠️ [SYNC-ACTIVATIONS] Order ${orderId} not found in our DB`)
        continue
      }

      syncedCount++

      // 4. If SMS code exists and not yet in our DB, update it
      if (smsCode && !activation.sms_code) {
        console.log(`✅ [SYNC-ACTIVATIONS] Found SMS for ${phoneNumber}:`, smsCode)

        // Update activation with SMS
        await supabaseClient
          .from('activations')
          .update({
            status: 'received',
            sms_code: smsCode,
            sms_text: smsText || `Your verification code is: ${smsCode}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', activation.id)

        // Complete transaction (charge user)
        const { data: transaction } = await supabaseClient
          .from('transactions')
          .select('*')
          .eq('related_activation_id', activation.id)
          .eq('status', 'pending')
          .single()

        if (transaction) {
          // Mark transaction as completed
          await supabaseClient
            .from('transactions')
            .update({ status: 'completed' })
            .eq('id', transaction.id)

          // Update user balance (deduct from balance, reduce frozen)
          const { data: user } = await supabaseClient
            .from('users')
            .select('balance, frozen_balance')
            .eq('id', activation.user_id)
            .single()

          if (user) {
            const newBalance = user.balance - activation.price
            const newFrozenBalance = Math.max(0, user.frozen_balance - activation.price)

            await supabaseClient
              .from('users')
              .update({
                balance: newBalance,
                frozen_balance: newFrozenBalance
              })
              .eq('id', activation.user_id)

            console.log('💰 [SYNC-ACTIVATIONS] User charged:', {
              price: activation.price,
              newBalance,
              newFrozenBalance
            })
          }
        }

        // Mark as complete on SMS-Activate
        await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${orderId}&status=6`)

        updatedCount++
      }
    }

    console.log(`✅ [SYNC-ACTIVATIONS] Sync complete: ${syncedCount} activations checked, ${updatedCount} updated`)

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        updated: updatedCount,
        message: `Synced ${syncedCount} activations, ${updatedCount} received SMS`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [SYNC-ACTIVATIONS] Error:', error)
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
