import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  amount: number
  userId: string
  email?: string
  phone?: string
  metadata?: any
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

    const requestBody = await req.json() as PaymentRequest
    const { amount, userId, email, phone, metadata } = requestBody
    
    console.log('📥 Request received:', { amount, userId, email, phone, hasMetadata: !!metadata })

    // Validation
    if (!amount || amount < 100) {
      throw new Error('Montant minimum : 100 FCFA')
    }

    if (!userId) {
      throw new Error('userId requis')
    }

    // Récupérer la config PayDunya depuis payment_providers
    const { data: paydunyaConfig, error: configError } = await supabase
      .from('payment_providers')
      .select('config, is_active')
      .eq('provider_code', 'paydunya')
      .eq('is_active', true)
      .single()

    if (configError || !paydunyaConfig) {
      throw new Error('PayDunya non configuré ou inactif')
    }

    const { master_key, private_key, token, mode } = paydunyaConfig.config

    if (!master_key || !private_key || !token) {
      throw new Error('Clés API PayDunya manquantes')
    }

    // Récupérer infos utilisateur
    const { data: user } = await supabase
      .from('users')
      .select('email, phone, first_name, last_name')
      .eq('id', userId)
      .single()

    // Générer un identifiant unique pour la transaction
    const transactionId = `PAY-${Date.now()}-${userId.substring(0, 8)}`

    // Récupérer le solde actuel de l'utilisateur
    const { data: userData } = await supabase
      .from('users')
      .select('balance, activations')
      .eq('id', userId)
      .single()
    
    const currentBalance = userData?.balance || 0
    const currentActivations = userData?.activations || 0

    // Créer la transaction dans notre DB
    // Note: payment_method has CHECK constraint, so we store provider in metadata instead
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        amount: amount, // Montant en FCFA
        balance_before: currentBalance,
        balance_after: currentBalance, // Sera mis à jour après confirmation du paiement
        status: 'pending',
        reference: transactionId,
        description: `Rechargement via PayDunya - ${amount} FCFA`,
        metadata: {
          paydunya_token: null, // Sera mis à jour après l'appel API PayDunya
          payment_url: null,
          email: email || user?.email,
          phone: phone || user?.phone,
          payment_provider: 'paydunya',
          mode: mode,
          ...(metadata || {})
        }
      })
      .select()
      .single()

    if (txError) {
      console.error('❌ Transaction creation error:', txError)
      throw new Error(`Erreur création transaction: ${txError.message}`)
    }
    
    console.log('✅ Transaction created:', transaction.id)

    // Préparer les données pour PayDunya API PAR
    const paydunyaData = {
      invoice: {
        total_amount: amount,
        description: `Recharge wallet ONE SMS - ${amount} FCFA`
      },
      store: {
        name: 'ONE SMS',
        tagline: 'Réception SMS en ligne',
        phone: '+1 683 777 0410',
        logo_url: 'https://onesms-sn.com/logo.png',
        website_url: 'https://onesms-sn.com'
      },
      custom_data: {
        transaction_id: transaction.id,
        user_id: userId
      },
      actions: {
        cancel_url: `${Deno.env.get('APP_URL')}/payment/cancel?txid=${transaction.id}`,
        return_url: `${Deno.env.get('APP_URL')}/payment/success?txid=${transaction.id}`,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paydunya-webhook`
      }
    }

    // Appel API PayDunya
    const apiUrl = mode === 'live' 
      ? 'https://app.paydunya.com/api/v1/checkout-invoice/create'
      : 'https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create'

    console.log('🔗 Calling PayDunya API:', apiUrl)
    console.log('📝 PayDunya data:', JSON.stringify(paydunyaData, null, 2))

    const paydunyaResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': master_key,
        'PAYDUNYA-PRIVATE-KEY': private_key,
        'PAYDUNYA-TOKEN': token
      },
      body: JSON.stringify(paydunyaData)
    })

    const paydunyaResult = await paydunyaResponse.json()
    
    console.log('📨 PayDunya response:', paydunyaResult)

    if (!paydunyaResponse.ok || paydunyaResult.response_code !== '00') {
      console.error('❌ PayDunya API Error:', paydunyaResult)
      
      // Mettre à jour la transaction comme failed
      await supabase
        .from('transactions')
        .update({ 
          status: 'failed',
          metadata: { error: paydunyaResult.response_text || 'Erreur PayDunya' }
        })
        .eq('id', transaction.id)

      throw new Error(paydunyaResult.response_text || 'Erreur création paiement PayDunya')
    }

    // Mettre à jour la transaction avec le token PayDunya
    await supabase
      .from('transactions')
      .update({
        external_id: paydunyaResult.token,
        metadata: {
          ...transaction.metadata,
          paydunya_token: paydunyaResult.token,
          paydunya_url: paydunyaResult.response_text
        }
      })
      .eq('id', transaction.id)

    // Logger le paiement
    await supabase.from('payment_provider_logs').insert({
      provider_id: paydunyaConfig.id,
      admin_id: userId,
      action: 'payment_created',
      new_value: {
        transaction_id: transaction.id,
        amount,
        token: paydunyaResult.token
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        payment_url: paydunyaResult.response_text,
        token: paydunyaResult.token
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
