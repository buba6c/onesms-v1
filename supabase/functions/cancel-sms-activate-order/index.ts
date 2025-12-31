// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Version: 2024-12-01-fixed
const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { orderId, activationId, userId } = body

    console.log('❌ [CANCEL] Starting cancellation:', { orderId, activationId, userId })

    // 1. Find activation
    let activation = null
    
    if (orderId) {
      const { data } = await supabaseClient
        .from('activations')
        .select('*')
        .eq('order_id', orderId.toString())
        .single()
      if (data) activation = data
    }
    
    if (!activation && activationId) {
      const { data } = await supabaseClient
        .from('activations')
        .select('*')
        .eq('id', activationId)
        .single()
      if (data) activation = data
    }
    
    if (!activation) {
      throw new Error(`Activation not found: orderId=${orderId}, activationId=${activationId}`)
    }

    console.log('📋 [CANCEL] Activation found:', {
      id: activation.id,
      status: activation.status,
      price: activation.price,
      frozen_amount: activation.frozen_amount
    })

    // 2. Check if cancellable
    if (!['pending', 'waiting', 'active'].includes(activation.status)) {
      // Already cancelled or completed
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed', alreadyProcessed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Atomic lock - mark as cancelled immediately to prevent race condition
    const { data: lockedActivation, error: lockError } = await supabaseClient
      .from('activations')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', activation.id)
      .in('status', ['pending', 'waiting', 'active'])
      .select()
      .single()

    if (lockError || !lockedActivation) {
      console.log('⚠️ [CANCEL] Could not lock - already processed')
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed', alreadyProcessed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔒 [CANCEL] Activation locked')

    // 4. Cancel on SMS-Activate
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&id=${activation.order_id}&status=8`
    console.log('🌐 [CANCEL] Calling SMS-Activate API...')

    const response = await fetch(apiUrl)
    const responseText = await response.text()
    console.log('📥 [CANCEL] API Response:', responseText)

    // 5. Find related transaction
    const { data: txn } = await supabaseClient
      .from('transactions')
      .select('id, status')
      .eq('related_activation_id', activation.id)
      .single()

    // 6. ATOMIC REFUND via RPC
    const { data: refundResult, error: refundError } = await supabaseClient.rpc('atomic_refund', {
      p_user_id: activation.user_id,
      p_activation_id: activation.id,
      p_transaction_id: txn?.id || null,
      p_reason: 'Cancelled by user'
    })

    let finalBalance = 0
    let finalFrozen = 0
    // ✅ SÉCURITÉ: Utiliser UNIQUEMENT frozen_amount, PAS price
    let refundedAmount = activation.frozen_amount || 0

    if (refundError) {
      console.error('⚠️ [CANCEL] atomic_refund failed:', refundError)
      // Ne pas tenter d'update direct users (bloqué par users_balance_guard).
      // On s'arrête ici pour éviter des crédits fantômes.
      return new Response(
        JSON.stringify({ success: false, error: 'Refund failed', detail: refundError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.log('💰 [CANCEL] atomic_refund SUCCESS:', refundResult)
      finalBalance = refundResult?.balance_after || 0
      finalFrozen = refundResult?.frozen_after || 0
      refundedAmount = refundResult?.refunded || refundedAmount
    }

    console.log('✅ [CANCEL] Completed:', {
      activation_id: activation.id,
      refunded: refundedAmount,
      newBalance: finalBalance,
      newFrozen: finalFrozen
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Activation cancelled and refunded',
        refunded: refundedAmount,
        newBalance: finalBalance,
        newFrozenBalance: finalFrozen
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ [CANCEL] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
