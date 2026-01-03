import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 [ATOMIC-TIMEOUT] Starting 100% reliable timeout processing...')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ÉTAPE 1: Récupérer toutes les activations expirées avec frozen > 0
    // 🔧 FIX: Exclude textverified - it has different expiration handling
    const { data: expiredActivations, error: fetchError } = await supabaseClient
      .from('activations')
      .select('id, user_id, price, frozen_amount, service_code, order_id, expires_at, provider')
      .in('status', ['pending', 'waiting'])
      .in('provider', ['sms-activate', '5sim', 'grizzly', 'onlinesim']) // Exclude textverified
      .lt('expires_at', new Date().toISOString())
      .gt('frozen_amount', 0)
      .order('expires_at', { ascending: true })
      .limit(50)

    if (fetchError) {
      throw new Error(`Failed to fetch expired activations: ${fetchError.message}`)
    }

    console.log(`📊 [ATOMIC-TIMEOUT] Found ${expiredActivations?.length || 0} expired activations`)

    const results = {
      processed: 0,
      refunded_total: 0,
      errors: 0,
      details: [] as any[]
    }

    // ÉTAPE 2: Traiter chaque activation de manière ATOMIQUE
    for (const activation of expiredActivations || []) {
      try {
        console.log(`\n🔄 [ATOMIC-TIMEOUT] Processing ${activation.id} (${activation.service_code})...`)

        // ÉTAPE 1: ATOMIC LOCK - Marquer status=timeout D'ABORD
        const { data: lockedActivation, error: lockError } = await supabaseClient
          .from('activations')
          .update({
            status: 'timeout',
            charged: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', activation.id)
          .in('status', ['pending', 'waiting'])  // Lock atomique
          .gt('frozen_amount', 0)  // Seulement si encore gelé
          .select()
          .single()

        if (lockError || !lockedActivation) {
          console.log(`⚠️ [ATOMIC-TIMEOUT] Already processed: ${activation.id}`)
          continue
        }

        console.log(`🔒 [ATOMIC-TIMEOUT] Locked as timeout: ${activation.id}`)

        // ÉTAPE 2: ATOMIC REFUND - Utiliser atomic_refund qui récupère frozen_amount depuis DB
        const { data: refundResult, error: refundError } = await supabaseClient.rpc('atomic_refund', {
          p_user_id: activation.user_id,
          p_activation_id: activation.id,
          p_reason: 'Atomic timeout refund'
        })

        if (refundError) {
          console.error(`⚠️ [ATOMIC-TIMEOUT] atomic_refund failed: ${refundError.message}`)

          // Si atomic_refund échoue mais activation déjà timeout, compter quand même
          if (refundError.message?.includes('idempotent') || refundError.message?.includes('already')) {
            console.log(`⚠️ [ATOMIC-TIMEOUT] Already refunded (idempotent): ${activation.id}`)
          } else {
            throw new Error(`atomic_refund failed: ${refundError.message}`)
          }
        } else {
          console.log(`✅ [ATOMIC-TIMEOUT] atomic_refund SUCCESS: ${refundResult?.amount_refunded || activation.frozen_amount}Ⓐ refunded`)

          results.processed++
          results.refunded_total += refundResult?.amount_refunded || activation.frozen_amount
          results.details.push({
            activation_id: activation.id,
            service_code: activation.service_code,
            refunded: refundResult?.amount_refunded || activation.frozen_amount,
            method: 'atomic_refund_rpc'
          })
        }

        // Petit délai pour éviter surcharge
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error: any) {
        console.error(`❌ [ATOMIC-TIMEOUT] Error processing ${activation.id}:`, error.message)
        results.errors++
        results.details.push({
          activation_id: activation.id,
          service_code: activation.service_code,
          error: error.message
        })
      }
    }

    console.log('\n✅ [ATOMIC-TIMEOUT] Processing complete')
    console.log(`   Processed: ${results.processed}`)
    console.log(`   Refunded: ${results.refunded_total}Ⓐ`)
    console.log(`   Errors: ${results.errors}`)

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('❌ [ATOMIC-TIMEOUT] Fatal error:', error.message)
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