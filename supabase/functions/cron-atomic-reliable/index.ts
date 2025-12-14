import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 [CRON-ATOMIC] 100% Reliable Timeout & SMS Processing...')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // =========================================================================
    // PARTIE 1: TRAITEMENT ATOMIQUE DES TIMEOUTS 
    // =========================================================================
    
    console.log('\n🔄 [CRON-ATOMIC] Phase 1: Atomic timeout processing...')
    
    const { data: atomicResult, error: atomicError } = await supabaseClient.functions.invoke('atomic-timeout-processor')
    
    let timeoutResults = { processed: 0, refunded_total: 0, errors: 0 }
    
    if (atomicError) {
      console.error('⚠️ [CRON-ATOMIC] Atomic processor error:', atomicError)
    } else if (atomicResult?.success) {
      timeoutResults = {
        processed: atomicResult.processed || 0,
        refunded_total: atomicResult.refunded_total || 0,
        errors: atomicResult.errors || 0
      }
      console.log(`✅ [CRON-ATOMIC] Atomic timeout: ${timeoutResults.processed} processed, ${timeoutResults.refunded_total}Ⓐ refunded`)
    }

    // =========================================================================
    // PARTIE 2: VÉRIFICATION SMS (SANS REFUND - SMS SEULEMENT)
    // =========================================================================
    
    console.log('\n📱 [CRON-ATOMIC] Phase 2: SMS checking (timeout handled separately)...')
    
    // Récupérer SEULEMENT les activations pending/waiting NON expirées
    const { data: activations, error: fetchError } = await supabaseClient
      .from('activations')
      .select('*')
      .in('status', ['pending', 'waiting'])
      .gt('expires_at', new Date().toISOString())  // NON expirées
      .order('created_at', { ascending: true })
      .limit(30)

    if (fetchError) {
      throw new Error(`Failed to fetch activations: ${fetchError.message}`)
    }

    console.log(`📊 [CRON-ATOMIC] Found ${activations?.length || 0} active (non-expired) activations`)

    const smsResults = {
      checked: 0,
      found: 0,
      errors: [] as string[]
    }

    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
    const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

    // Vérifier les SMS SEULEMENT (pas de gestion timeout ici)
    for (const activation of activations || []) {
      try {
        console.log(`\n🔍 [CRON-ATOMIC] Checking SMS: ${activation.phone} (${activation.order_id})...`)
        smsResults.checked++

        // Check V1 API pour SMS
        const v1Url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getStatus&id=${activation.order_id}`
        const v1Response = await fetch(v1Url)
        const v1Text = await v1Response.text()

        console.log(`📥 [CRON-ATOMIC] API Response: ${v1Text}`)

        if (v1Text.startsWith('STATUS_OK:')) {
          // SMS reçu!
          const code = v1Text.split(':')[1]
          const smsText = `Votre code de validation est ${code}`

          console.log(`✅ [CRON-ATOMIC] SMS Found: ${code}`)

          // Mettre à jour avec le SMS (PAS de refund ici)
          await supabaseClient
            .from('activations')
            .update({ 
              status: 'received',
              sms_code: code,
              sms_text: smsText,
              sms_received_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', activation.id)

          smsResults.found++

        } else if (v1Text === 'STATUS_CANCEL') {
          console.log(`❌ [CRON-ATOMIC] API Cancelled: ${activation.order_id}`)
          
          // Marquer comme cancelled, le timeout atomique s'en occupera
          await supabaseClient
            .from('activations')
            .update({ 
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', activation.id)
        }

        // Délai anti rate-limit
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error: any) {
        console.error(`❌ [CRON-ATOMIC] SMS Check error for ${activation.order_id}:`, error.message)
        smsResults.errors.push(`${activation.order_id}: ${error.message}`)
      }
    }

    // =========================================================================
    // RÉSUMÉ FINAL
    // =========================================================================

    const totalResults = {
      success: true,
      timestamp: new Date().toISOString(),
      
      // Phase 1: Timeouts atomiques
      timeout_processing: {
        processed: timeoutResults.processed,
        refunded_total: timeoutResults.refunded_total,
        errors: timeoutResults.errors
      },
      
      // Phase 2: SMS checking
      sms_checking: {
        checked: smsResults.checked,
        found: smsResults.found,
        errors: smsResults.errors.length
      }
    }

    console.log('\n🎯 [CRON-ATOMIC] SUMMARY:')
    console.log(`   Timeouts processed: ${timeoutResults.processed} (${timeoutResults.refunded_total}Ⓐ refunded)`)
    console.log(`   SMS checked: ${smsResults.checked} (${smsResults.found} found)`)
    console.log(`   Total errors: ${timeoutResults.errors + smsResults.errors.length}`)

    return new Response(
      JSON.stringify(totalResults),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('❌ [CRON-ATOMIC] Fatal error:', error.message)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})