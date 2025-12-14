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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔄 [RECOVER-SMS] Starting SMS recovery from history...')

    // Calculate timestamps for last 24 hours
    const now = Math.floor(Date.now() / 1000)
    const oneDayAgo = now - (24 * 60 * 60)

    // 1. Get history from SMS-Activate (includes cancelled/completed activations with SMS!)
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getHistory&start=${oneDayAgo}&end=${now}&limit=100`
    console.log('🌐 [RECOVER-SMS] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const responseText = await response.text()
    
    console.log('📥 [RECOVER-SMS] Raw Response:', responseText)
    
    let historyData
    try {
      historyData = JSON.parse(responseText)
    } catch (e) {
      console.error('❌ [RECOVER-SMS] Failed to parse JSON:', e)
      return new Response(
        JSON.stringify({
          success: false,
          error: `API returned invalid JSON: ${responseText}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('📥 [RECOVER-SMS] Parsed Response:', JSON.stringify(historyData))
    console.log('📥 [RECOVER-SMS] Is Array?', Array.isArray(historyData))
    console.log('📥 [RECOVER-SMS] Type:', typeof historyData)

    if (!Array.isArray(historyData)) {
      console.log('⚠️ [RECOVER-SMS] Response is not an array, might be an error:', historyData)
      return new Response(
        JSON.stringify({
          success: false,
          error: `API response is not an array: ${JSON.stringify(historyData)}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }
    
    if (historyData.length === 0) {
      console.log('⚠️ [RECOVER-SMS] History array is empty')
      return new Response(
        JSON.stringify({
          success: true,
          recovered: 0,
          message: 'No history found in last 24h'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`📊 [RECOVER-SMS] Found ${historyData.length} activations in history`)

    let recoveredCount = 0
    const recoveredNumbers = []

    // 2. Process each activation from history
    for (const historyItem of historyData) {
      const orderId = historyItem.id.toString()
      const phoneNumber = historyItem.phone
      const smsArray = historyItem.sms
      const status = historyItem.status

      // Extract SMS code and text
      let smsCode = null
      let smsText = null

      if (smsArray && Array.isArray(smsArray) && smsArray.length > 0) {
        const fullSms = smsArray[0]
        smsText = fullSms

        // Try to extract code from SMS text (usually numbers)
        const codeMatch = fullSms.match(/\b\d{4,8}\b/)
        if (codeMatch) {
          smsCode = codeMatch[0]
        }
      }

      console.log(`📱 [RECOVER-SMS] History item ${phoneNumber} (${orderId}):`, {
        hasCode: !!smsCode,
        hasText: !!smsText,
        status: status,
        date: historyItem.date
      })

      // 3. Find activation in our database
      const { data: activation } = await supabaseClient
        .from('activations')
        .select('*')
        .eq('order_id', orderId)
        .single()

      if (!activation) {
        console.log(`⚠️ [RECOVER-SMS] Order ${orderId} not found in our DB`)
        continue
      }

      // 4. If SMS exists and not yet in our DB, recover it
      if (smsText && !activation.sms_code) {
        console.log(`✅ [RECOVER-SMS] Recovering SMS for ${phoneNumber}:`, smsCode || 'NO_CODE')

        // Update activation with SMS
        const updateData: any = {
          sms_text: smsText,
          updated_at: new Date().toISOString()
        }

        if (smsCode) {
          updateData.sms_code = smsCode
          updateData.status = 'received'
        } else {
          // SMS received but no code extracted
          updateData.status = 'received'
          updateData.sms_code = 'NO_CODE'
        }

        // 🛡️ PROTECTION: Mise à jour atomique avec vérification que status n'est pas déjà 'received'
        const { data: updatedActivation } = await supabaseClient
          .from('activations')
          .update(updateData)
          .eq('id', activation.id)
          .neq('status', 'received')
          .select()
          .single()

        // Si aucune ligne mise à jour, l'activation était déjà traitée
        if (!updatedActivation) {
          console.log('⚠️ [RECOVER-SMS] Activation already processed by another process')
          continue
        }

        // Complete transaction atomically (status 4 = completed with SMS)
        if (status === '4' || smsCode) {
          const { data: transaction } = await supabaseClient
            .from('transactions')
            .select('id, status')
            .eq('related_activation_id', activation.id)
            .eq('status', 'pending')
            .single()

          const { data: commitResult, error: commitErr } = await supabaseClient.rpc('atomic_commit', {
            p_user_id: activation.user_id,
            p_activation_id: activation.id,
            p_rental_id: null,
            p_transaction_id: transaction?.id ?? null,
            p_reason: 'SMS received (recovery)'
          })

          if (commitErr || !commitResult?.success) {
            console.error('❌ [RECOVER-SMS] atomic_commit failed:', commitErr || commitResult)
          } else {
            console.log('💰 [RECOVER-SMS] atomic_commit success:', commitResult)
          }
        }

        recoveredCount++
        recoveredNumbers.push({
          phone: phoneNumber,
          code: smsCode,
          text: smsText.substring(0, 50) + '...'
        })
      }
    }

    console.log(`✅ [RECOVER-SMS] Recovery complete: ${recoveredCount} SMS recovered`)

    return new Response(
      JSON.stringify({
        success: true,
        recovered: recoveredCount,
        numbers: recoveredNumbers,
        message: `Recovered ${recoveredCount} SMS from history`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [RECOVER-SMS] Error:', error)
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
