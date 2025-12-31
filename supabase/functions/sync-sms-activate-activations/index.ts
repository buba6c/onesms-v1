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

      // 🛡️ Skip if already received
      if (activation.status === 'received' || activation.status === 'completed') {
        console.log(`⚠️ [SYNC-ACTIVATIONS] Order ${orderId} already processed, skipping`)
        continue
      }

      syncedCount++

      // 4. If SMS code exists and not yet in our DB, update it
      if (smsCode && !activation.sms_code) {
        console.log(`✅ [SYNC-ACTIVATIONS] Found SMS for ${phoneNumber}:`, smsCode)

        // Traitement unique et atomique : process_sms_received (update + commit + tx)
        const { data: processResult, error: processError } = await supabaseClient.rpc('process_sms_received', {
          p_order_id: activation.order_id,
          p_code: smsCode,
          p_text: smsText || `Your verification code is: ${smsCode}`,
          p_source: 'sync'
        })

        if (processError) {
          console.error('❌ [SYNC-ACTIVATIONS] process_sms_received error:', processError)
          continue
        }

        if (processResult?.success) {
          console.log('✅ [SYNC-ACTIVATIONS] process_sms_received SUCCESS:', processResult)
        } else {
          console.error('❌ [SYNC-ACTIVATIONS] process_sms_received returned error payload:', processResult)
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
