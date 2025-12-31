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

    // Support pour X-WWW-FORM-URLENCODED et JSON
    const contentType = req.headers.get('content-type') || ''
    let webhookData: any

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parser le format form-urlencoded
      const body = await req.text()
      const params = new URLSearchParams(body)
      webhookData = Object.fromEntries(params.entries())
      console.log('🔔 PayDunya Webhook received (form-urlencoded):', webhookData)
    } else {
      // Fallback: parser comme JSON
      webhookData = await req.json()
      console.log('🔔 PayDunya Webhook received (JSON):', JSON.stringify(webhookData, null, 2))
    }

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

    // Vérifier la signature (hash SHA-512) - optionnel si PayDunya l'envoie
    const receivedHash = webhookData.hash || webhookData.signature
    
    if (receivedHash) {
      const dataToHash = `${webhookData.invoice?.token}${master_key}`
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
    let shouldCreditUser = false

    switch (status) {
      case 'completed':
      case 'success':
        newStatus = 'completed'
        shouldCreditUser = true
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

    // Si payment completed, créditer users.balance
    if (shouldCreditUser) {
      // Get activations from transaction metadata (set during paydunya-create-payment)
      const creditsToAdd = transaction.metadata?.activations || 0
      const token = transaction.metadata?.paydunya_token || webhookData.invoice?.token
      
      console.log(`💰 Crediting ${creditsToAdd} activations for user ${transaction.user_id}`)

      if (creditsToAdd === 0) {
        console.error('⚠️ No activations in metadata! Transaction:', transaction.id)
        console.log('📋 Transaction metadata:', JSON.stringify(transaction.metadata))
      }

      // Credit via SECURITY DEFINER RPC (idempotent) - same as MoneyFusion
      const { data: creditResult, error: balanceError } = await supabase
        .rpc('secure_moneyfusion_credit_v2', {
          p_transaction_id: transaction.id,
          p_token: token,
          p_reference: transaction.reference || token
        })

      if (balanceError) {
        console.error('❌ Failed to credit via secure_moneyfusion_credit:', balanceError)
        
        // Update transaction with error
        await supabase
          .from('transactions')
          .update({ 
            status: 'pending_credit_error', 
            metadata: { 
              ...transaction.metadata, 
              error: 'Failed to credit balance', 
              error_detail: balanceError.message 
            } 
          })
          .eq('id', transaction.id)
        
        throw new Error(`Erreur credit: ${balanceError.message}`)
      }

      console.log(`✅ Credited via secure_moneyfusion_credit`, creditResult)

      // Get updated balance for logging
      const { data: updatedUser } = await supabase
        .from('users')
        .select('balance')
        .eq('id', transaction.user_id)
        .single()

      console.log(`✅ User balance credited: +${creditsToAdd} activations (user: ${transaction.user_id}, new balance: ${updatedUser?.balance})`)
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

  } catch (error: any) {
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
