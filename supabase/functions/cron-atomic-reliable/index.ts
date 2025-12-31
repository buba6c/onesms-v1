
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 [CRON-ATOMIC] Multi-Provider Reliable Check...')

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

    // Calls the atomic-timeout-processor function which handles expirations based on expires_at
    // This is provider-agnostic as it relies on DB timestamps
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
    // PARTIE 2: VÉRIFICATION SMS MULTI-PROVIDER
    // =========================================================================

    console.log('\n📱 [CRON-ATOMIC] Phase 2: Multi-Provider SMS Checking...')

    // Récupérer les activations pending/waiting NON expirées
    // IMPORTANT: fetch 'provider' column to route correctly
    const { data: activations, error: fetchError } = await supabaseClient
      .from('activations')
      .select('id, user_id, order_id, phone, provider, status, expires_at')
      .in('status', ['pending', 'waiting'])
      .gt('expires_at', new Date().toISOString())  // Pas encore expiré
      .order('created_at', { ascending: true })
      .limit(50) // Limit batch size to avoid timeout

    if (fetchError) {
      throw new Error(`Failed to fetch activations: ${fetchError.message}`)
    }

    console.log(`📊 [CRON-ATOMIC] Found ${activations?.length || 0} active (non-expired) activations to check`)

    const smsResults = {
      checked: 0,
      invocations: [] as string[],
      errors: [] as string[]
    }

    // Dispatch loops
    for (const activation of activations || []) {
      try {
        const provider = activation.provider || 'sms-activate'; // Default to sms-activate if older record
        let checkerFunction = 'check-sms-activate-status';

        // Route to correct checker
        if (provider === '5sim') checkerFunction = 'check-5sim-status';
        else if (provider === 'smspva') checkerFunction = 'check-smspva-status';
        else if (provider === 'onlinesim') checkerFunction = 'check-onlinesim-status';
        else if (provider === 'herosms') checkerFunction = 'check-sms-activate-status'; // Alias

        console.log(`\n🔍 [CRON-ATOMIC] Checking ${activation.phone} (${provider}) -> ${checkerFunction}`)
        smsResults.checked++

        // Invoke the specific checker function
        // We do NOT wait for full execution to optimize speed? No, we should wait to avoid overloading Supabase functions concurrently?
        // Sequential is safer for reliability.
        const { data: checkData, error: checkError } = await supabaseClient.functions.invoke(checkerFunction, {
          body: {
            activationId: activation.id,
            userId: activation.user_id
          }
        })

        if (checkError) {
          console.error(`❌ [CRON-ATOMIC] Checker failed for ${activation.id}:`, checkError)
          smsResults.errors.push(`${activation.id} (${provider}): Invocation failed`)
        } else {
          // Check success logic ? The checker updates the DB itself.
          // checking return data for logs
          if (checkData?.success) {
            const status = checkData.data?.status;
            smsResults.invocations.push(`${activation.id}: ${status}`);
            console.log(`✅ [CRON-ATOMIC] Result: ${status}`);
          } else {
            smsResults.errors.push(`${activation.id} (${provider}): ${checkData?.error || 'Unknown error'}`);
            console.error(`⚠️ [CRON-ATOMIC] Logic error: ${checkData?.error}`);
          }
        }

      } catch (error: any) {
        console.error(`❌ [CRON-ATOMIC] Loop error for ${activation.id}:`, error.message)
        smsResults.errors.push(`${activation.id}: ${error.message}`)
      }

      // Small delay to be nice to the platform
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // =========================================================================
    // RÉSUMÉ FINAL
    // =========================================================================

    const totalResults = {
      success: true,
      timestamp: new Date().toISOString(),

      // Phase 1: Timeouts atomiques
      timeout_processing: timeoutResults,

      // Phase 2: SMS checking
      sms_checking: {
        checked: smsResults.checked,
        errors: smsResults.errors.length,
        details: smsResults.invocations
      }
    }

    console.log('\n🎯 [CRON-ATOMIC] SUMMARY:')
    console.log(`   Timeouts: ${timeoutResults.processed}`)
    console.log(`   SMS Checked: ${smsResults.checked}`)
    console.log(`   Errors: ${timeoutResults.errors + smsResults.errors.length}`)

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