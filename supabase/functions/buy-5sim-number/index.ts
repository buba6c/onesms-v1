import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIVESIM_BASE_URL = 'https://5sim.net/v1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 [BUY-5SIM] Function called')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get 5sim API key - try DB first, then fallback to env var
    let FIVESIM_API_KEY = Deno.env.get('FIVESIM_API_KEY')

    const { data: fivesimSetting } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', '5sim_api_key')
      .single()

    if (fivesimSetting?.value) {
      FIVESIM_API_KEY = fivesimSetting.value
    }

    if (!FIVESIM_API_KEY) {
      throw new Error('5sim API key not configured. Please configure it in Admin > Providers.')
    }

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized - No token provided')
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { country, operator, product, userId, expectedPrice } = await req.json()
    console.log('📞 [BUY-5SIM] Request:', { country, operator, product, userId, expectedPrice })

    // 1. Check user balance AND frozen_balance atomically
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) throw new Error('User profile not found')

    const frozenBalance = userProfile.frozen_balance || 0
    const availableBalance = userProfile.balance - frozenBalance
    const price = expectedPrice || 1.0 // Fallback price if not provided

    if (availableBalance < price) {
      throw new Error(`Insufficient balance. Required: $${price}, Available: $${availableBalance} (${frozenBalance} frozen)`)
    }

    const currentBalance = userProfile.balance
    console.log('💰 [BUY-5SIM] Balance check:', {
      total: currentBalance,
      frozen: frozenBalance,
      available: availableBalance,
      required: price
    })

    // 2. Prepare Transaction & Freeze
    // 2.1 Create pending transaction (Model A: balance unchanged, only frozen changes)
    const { data: txn, error: txnError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'purchase',
        amount: -price,
        status: 'pending',
        description: `Purchase 5sim activation for ${product} (${country})`,
        provider: '5sim',
        balance_before: currentBalance,
        balance_after: currentBalance // Balance unchanged - credits are FROZEN, not debited
      })
      .select()
      .single()

    if (txnError) {
      console.error('❌ [BUY-5SIM] Failed to create transaction:', txnError)
      throw new Error(`Transaction creation failed: ${txnError.message}`)
    }

    console.log('📝 [BUY-5SIM] Transaction created:', txn.id)

    // 2.2 Create ledger entry (WITH balance_before/after for complete audit trail)
    const { error: ledgerError } = await supabaseClient.from('balance_operations').insert({
      user_id: userId,
      operation_type: 'freeze',
      amount: price,
      balance_before: currentBalance,
      balance_after: currentBalance, // Balance unchanged (Model A)
      frozen_before: frozenBalance,
      frozen_after: frozenBalance + price,
      reason: 'Freeze credits for 5sim purchase',
      created_at: new Date().toISOString()
    })

    if (ledgerError) {
      console.error('❌ [BUY-5SIM] Failed to create ledger entry:', ledgerError)
      await supabaseClient.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
      throw new Error('Failed to create ledger entry')
    }

    console.log('📊 [BUY-5SIM] Ledger entry created')

    // 2.3 Freeze credits BEFORE API call
    const { error: freezeError } = await supabaseClient.from('users').update({
      frozen_balance: frozenBalance + price
    }).eq('id', userId)

    if (freezeError) {
      console.error('❌ [BUY-5SIM] Failed to freeze balance:', freezeError)
      await supabaseClient.from('transactions').update({ status: 'failed' }).eq('id', txn.id)
      throw new Error('Failed to freeze balance')
    }

    console.log('🔒 [BUY-5SIM] Credits frozen:', price, 'New frozen:', frozenBalance + price)

    // 3. Buy from 5sim API
    // Endpoint: GET /user/buy/activation/{country}/{operator}/{product}
    const targetOperator = operator && operator !== 'any' ? operator : 'any'
    const buyUrl = `${FIVESIM_BASE_URL}/user/buy/activation/${country}/${targetOperator}/${product}`

    console.log('🌐 [BUY-5SIM] API Call:', buyUrl)

    const response = await fetch(buyUrl, {
      headers: {
        'Authorization': `Bearer ${FIVESIM_API_KEY}`,
        'Accept': 'application/json'
      }
    })

    // 5sim may return plain text errors like "no free phones"
    const responseText = await response.text()
    console.log('📥 [BUY-5SIM] Raw Response:', responseText)

    // Try to parse as JSON
    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      // Not JSON - it's a plain text error
      console.error('❌ [BUY-5SIM] Text error from 5sim:', responseText)

      // Refund frozen
      const { data: refundUser } = await supabaseClient.from('users').select('frozen_balance').eq('id', userId).single()
      const currentFrozen = refundUser?.frozen_balance || 0
      const newFrozen = Math.max(0, currentFrozen - price)

      await supabaseClient.from('users').update({ frozen_balance: newFrozen }).eq('id', userId)
      await supabaseClient.from('transactions').update({ status: 'failed', description: `5sim error: ${responseText}` }).eq('id', txn.id)

      throw new Error(`5sim: ${responseText}`)
    }

    console.log('📥 [BUY-5SIM] Parsed Response:', data)

    // Handle 5sim Error from JSON response
    if (!response.ok || (data && (data.status === 'ERROR' || !data.id))) {
      // Rollback logic
      const errorMsg = typeof data === 'string' ? data : (data.message || 'Unknown 5sim error')
      console.error('❌ [BUY-5SIM] API Error:', errorMsg)

      // Refund frozen
      const { data: refundUser } = await supabaseClient.from('users').select('frozen_balance').eq('id', userId).single()
      const currentFrozen = refundUser?.frozen_balance || 0
      const newFrozen = Math.max(0, currentFrozen - price)

      await supabaseClient.from('users').update({ frozen_balance: newFrozen }).eq('id', userId)
      await supabaseClient.from('transactions').update({ status: 'failed', description: `5sim error: ${errorMsg}` }).eq('id', txn.id)

      throw new Error(`5sim API Error: ${errorMsg}`)
    }

    // 4. Success - Create Activation
    // 5sim response: { id: 12345, phone: "+123456789", operator: "...", product: "...", price: 1.5, ... }
    const activationId = data.id.toString()
    const phone = data.phone

    const expiresAt = new Date(Date.now() + 20 * 60 * 1000) // 20 minutes (aligned with SMS-Activate)

    const { data: activation, error: actError } = await supabaseClient
      .from('activations')
      .insert({
        user_id: userId,
        order_id: activationId,
        phone: phone,
        service_code: product,
        country_code: country,
        operator: data.operator || targetOperator,
        price: price, // Use the price we charged the user
        frozen_amount: price,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        provider: '5sim'
      })
      .select()
      .single()

    if (actError) {
      // Critical error: Bought on 5sim but failed to save in DB
      console.error('❌ [BUY-5SIM] DB Save Error:', actError)
      console.error('❌ [BUY-5SIM] Activation error details:', JSON.stringify(actError, null, 2))

      // Re-read current frozen to get actual value (not stale)
      const { data: currentUser } = await supabaseClient
        .from('users')
        .select('frozen_balance')
        .eq('id', userId)
        .single()

      const actualFrozen = currentUser?.frozen_balance || 0
      const newFrozen = Math.max(0, actualFrozen - price)

      // ROLLBACK: Create ledger entry FIRST, then unfreeze credits
      await supabaseClient
        .from('balance_operations')
        .insert({
          user_id: userId,
          operation_type: 'refund',
          amount: price,
          balance_before: currentBalance,
          balance_after: currentBalance,
          frozen_before: actualFrozen,
          frozen_after: newFrozen,
          reason: `Activation creation failed: ${actError.message}`,
          created_at: new Date().toISOString()
        })

      await supabaseClient
        .from('users')
        .update({ frozen_balance: newFrozen })
        .eq('id', userId)

      await supabaseClient
        .from('transactions')
        .update({ status: 'failed', description: `Failed to create activation: ${actError.message}` })
        .eq('id', txn.id)

      // Try to cancel on 5sim
      try {
        console.log('🔄 [BUY-5SIM] Rolling back: Cancelling order on 5sim...', activationId)
        await fetch(`${FIVESIM_BASE_URL}/user/cancel/${activationId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${FIVESIM_API_KEY}`,
            'Accept': 'application/json'
          }
        })
      } catch (e) {
        console.error('⚠️ [BUY-5SIM] Failed to cancel on 5sim during rollback:', e)
      }

      throw new Error('Critical: Activation bought but not saved')
    }

    // Link transaction
    await supabaseClient.from('transactions').update({ related_activation_id: activation.id }).eq('id', txn.id)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: activation.id,
          activation_id: activationId,
          phone: phone,
          service: product,
          country: country,
          price: price,
          status: 'pending',
          expires: expiresAt.toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ [BUY-5SIM] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || String(error)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
