import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { createHash } from 'https://deno.land/std@0.168.0/node/crypto.ts'

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

    const webhookData = await req.json()
    
    console.log('🔔 PayDunya Webhook received:', JSON.stringify(webhookData, null, 2))

    // Récupérer config PayDunya pour vérifier la signature
    const { data: paydunyaConfig } = await supabase
      .from('payment_providers')
      .select('config')
      .eq('provider_code', 'paydunya')
      .single()

    if (!paydunyaConfig) {
      throw new Error('PayDunya non configuré')
    }

    const { master_key } = paydunyaConfig.config

    // Vérifier la signature (hash SHA-512)
    const receivedHash = webhookData.hash || webhookData.signature
    
    if (receivedHash) {
      // Construire la string à hasher selon la doc PayDunya
      const dataToHash = `${webhookData.invoice.token}${master_key}`
      const calculatedHash = createHash('sha512').update(dataToHash).digest('hex')
      
      if (calculatedHash !== receivedHash) {
        console.error('❌ Invalid webhook signature')
        throw new Error('Signature invalide')
      }
      console.log('✅ Webhook signature verified')
    }

    // Extraire les données
    const { invoice, data: customData } = webhookData
    const token = invoice?.token
    const status = invoice?.status || webhookData.status
    const transactionId = customData?.transaction_id

    if (!token && !transactionId) {
      throw new Error('Token ou transaction_id manquant dans webhook')
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
      console.error('Transaction not found:', { transactionId, token })
      throw new Error('Transaction introuvable')
    }

    console.log(`📝 Transaction trouvée: ${transaction.id}, Status actuel: ${transaction.status}`)

    // Si déjà completed, ignorer
    if (transaction.status === 'completed') {
      console.log('⏭️ Transaction déjà completed, skip')
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mapper le statut
    let newStatus = transaction.status
    let shouldCreditWallet = false

    switch (status) {
      case 'completed':
      case 'success':
        newStatus = 'completed'
        shouldCreditWallet = true
        break
      case 'pending':
        newStatus = 'pending'
        break
      case 'cancelled':
      case 'failed':
        newStatus = 'failed'
        break
      default:
        console.log(`⚠️ Unknown status: ${status}`)
    }

    console.log(`🔄 Updating transaction status: ${transaction.status} → ${newStatus}`)

    // Mettre à jour la transaction
    await supabase
      .from('transactions')
      .update({
        status: newStatus,
        metadata: {
          ...transaction.metadata,
          webhook_received: true,
          webhook_data: webhookData,
          webhook_timestamp: new Date().toISOString()
        }
      })
      .eq('id', transaction.id)

    // Si payment completed, créditer le wallet (atomic avec double-check)
    if (shouldCreditWallet) {
      console.log(`💰 Crediting wallet for user ${transaction.user_id}`)

      // Double check que la transaction n'a pas déjà été traitée
      const { data: recheck } = await supabase
        .from('transactions')
        .select('status')
        .eq('id', transaction.id)
        .single()

      if (recheck && recheck.status === 'completed') {
        console.log('⚠️ Transaction already completed during processing, skip crediting')
        return new Response(
          JSON.stringify({ success: true, message: 'Already credited' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance, user_id')
        .eq('user_id', transaction.user_id)
        .single()

      if (walletError || !wallet) {
        console.error('❌ Wallet not found:', walletError)
        throw new Error('Wallet introuvable')
      }

      // Update wallet balance
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance + transaction.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id)

      if (updateError) {
        console.error('❌ Error updating wallet:', updateError)
        throw new Error('Erreur mise à jour wallet')
      }

      // Créer transaction wallet
      const { error: wtError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          user_id: transaction.user_id,
          type: 'credit',
          amount: transaction.amount,
          description: `Recharge PayDunya - ${transaction.amount} FCFA`,
          reference: transaction.id,
          metadata: {
            payment_method: 'paydunya',
            token: token
          }
        })

      if (wtError) {
        console.error('❌ Error creating wallet transaction:', wtError)
      }

      console.log(`✅ Wallet crédité: +${transaction.amount} FCFA (user: ${transaction.user_id})`)

      // Envoyer notification email (optionnel)
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: transaction.metadata?.email,
            subject: 'Recharge réussie - ONE SMS',
            html: `
              <h2>Recharge réussie !</h2>
              <p>Votre wallet a été crédité de <strong>${transaction.amount} FCFA</strong>.</p>
              <p>Merci d'utiliser ONE SMS.</p>
            `
          }
        })
      } catch (emailError) {
        console.error('Email error (non-blocking):', emailError)
      }
    }

    console.log('✅ Webhook processed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook traité avec succès',
        transaction_id: transaction.id,
        status: newStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Webhook Error:', error)
    
    // Retourner 200 même en cas d'erreur pour éviter les retry PayDunya
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 200, // Important: 200 pour que PayDunya arrête de retry
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
