import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { token, transactionId } = await req.json()

    if (!token && !transactionId) {
      throw new Error('token ou transactionId requis')
    }

    // Récupérer la transaction
    let query = supabase.from('transactions').select('*')
    
    if (transactionId) {
      query = query.eq('id', transactionId)
    } else {
      query = query.eq('external_id', token)
    }

    const { data: transaction, error: txError } = await query.single()

    if (txError || !transaction) {
      throw new Error('Transaction introuvable')
    }

    // Si déjà completed, retourner direct
    if (transaction.status === 'completed') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          transaction
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer config PayDunya
    const { data: paydunyaConfig } = await supabase
      .from('payment_providers')
      .select('config')
      .eq('provider_code', 'paydunya')
      .eq('is_active', true)
      .single()

    if (!paydunyaConfig) {
      throw new Error('PayDunya non configuré')
    }

    const { master_key, private_key, token: paydunya_token, mode } = paydunyaConfig.config

    // Vérifier le statut sur PayDunya
    const apiUrl = mode === 'live'
      ? `https://app.paydunya.com/api/v1/checkout-invoice/confirm/${transaction.external_id}`
      : `https://app.paydunya.com/sandbox-api/v1/checkout-invoice/confirm/${transaction.external_id}`

    const paydunyaResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'PAYDUNYA-MASTER-KEY': master_key,
        'PAYDUNYA-PRIVATE-KEY': private_key,
        'PAYDUNYA-TOKEN': paydunya_token
      }
    })

    const paydunyaResult = await paydunyaResponse.json()

    console.log('PayDunya verify response:', paydunyaResult)

    // Mapper le statut PayDunya
    let newStatus = transaction.status
    let shouldCreditWallet = false

    if (paydunyaResult.response_code === '00') {
      // Vérifier le statut exact
      if (paydunyaResult.status === 'completed') {
        newStatus = 'completed'
        shouldCreditWallet = true
      } else if (paydunyaResult.status === 'pending') {
        newStatus = 'pending'
      } else if (paydunyaResult.status === 'cancelled' || paydunyaResult.status === 'failed') {
        newStatus = 'failed'
      }
    } else {
      newStatus = 'failed'
    }

    // Mettre à jour la transaction
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: newStatus,
        metadata: {
          ...transaction.metadata,
          paydunya_verification: paydunyaResult,
          verified_at: new Date().toISOString()
        }
      })
      .eq('id', transaction.id)

    if (updateError) {
      console.error('Error updating transaction:', updateError)
    }

    // Si payment completed, créditer le wallet
    if (shouldCreditWallet && transaction.status !== 'completed') {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', transaction.user_id)
        .single()

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            balance: wallet.balance + transaction.amount
          })
          .eq('user_id', transaction.user_id)

        // Créer transaction wallet
        await supabase.from('wallet_transactions').insert({
          wallet_id: wallet.id,
          user_id: transaction.user_id,
          type: 'credit',
          amount: transaction.amount,
          description: `Recharge PayDunya - ${transaction.amount} FCFA`,
          reference: transaction.id
        })

        console.log(`✅ Wallet crédité: ${transaction.amount} FCFA pour user ${transaction.user_id}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
        transaction: {
          ...transaction,
          status: newStatus
        },
        paydunya_details: paydunyaResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
