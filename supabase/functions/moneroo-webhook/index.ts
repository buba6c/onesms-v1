/**
 * Edge Function: Moneroo Webhook Handler
 * 
 * Cette fonction reçoit les webhooks de Moneroo pour les événements de paiement.
 * Elle doit être configurée dans le dashboard Moneroo.
 * 
 * Documentation: https://docs.moneroo.io/introduction/webhooks
 * 
 * Events:
 * - payment.success : Paiement réussi
 * - payment.failed : Paiement échoué
 * - payment.pending : Paiement en attente
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-moneroo-signature',
}

const MONEROO_API_URL = 'https://api.moneroo.io/v1'

/**
 * Verify webhook signature using HMAC-SHA256
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return expectedSignature === signature
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Get webhook secret from environment
    const MONEROO_WEBHOOK_SECRET = Deno.env.get('MONEROO_WEBHOOK_SECRET')
    const MONEROO_SECRET_KEY = Deno.env.get('MONEROO_SECRET_KEY')
    
    // Get raw body for signature verification
    const rawBody = await req.text()
    
    // Verify signature if secret is configured
    const signature = req.headers.get('X-Moneroo-Signature')
    if (MONEROO_WEBHOOK_SECRET && signature) {
      const isValid = verifySignature(rawBody, signature, MONEROO_WEBHOOK_SECRET)
      if (!isValid) {
        console.error('❌ [MONEROO-WEBHOOK] Invalid signature')
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { 
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      console.log('✅ [MONEROO-WEBHOOK] Signature verified')
    } else {
      console.warn('⚠️ [MONEROO-WEBHOOK] No signature verification (MONEROO_WEBHOOK_SECRET not set)')
    }

    // Parse webhook payload
    const webhookData = JSON.parse(rawBody)
    const { event, data } = webhookData

    console.log('📥 [MONEROO-WEBHOOK] Received event:', event, 'Payment ID:', data?.id)

    // Initialize Supabase admin client (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Handle different events
    switch (event) {
      case 'payment.success': {
        console.log('💰 [MONEROO-WEBHOOK] Payment SUCCESS:', data.id)
        
        // Verify payment with Moneroo API (best practice)
        let verifiedData = data
        if (MONEROO_SECRET_KEY) {
          try {
            const verifyResponse = await fetch(
              `${MONEROO_API_URL}/payments/${data.id}/verify`,
              {
                headers: {
                  'Authorization': `Bearer ${MONEROO_SECRET_KEY}`,
                  'Accept': 'application/json'
                }
              }
            )
            const verifyResult = await verifyResponse.json()
            if (verifyResult.data) {
              verifiedData = verifyResult.data
              console.log('✅ [MONEROO-WEBHOOK] Payment verified:', verifiedData.status)
            }
          } catch (e) {
            console.warn('⚠️ [MONEROO-WEBHOOK] Could not verify payment:', e)
          }
        }

        // Find transaction by moneroo_id in metadata or payment_data
        const { data: transactions, error: findError } = await supabase
          .from('transactions')
          .select('*')
          .eq('payment_method', 'moneroo')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10)

        // Find the matching transaction
        let tx = null
        if (transactions) {
          tx = transactions.find(t => 
            t.metadata?.moneroo_id === data.id || 
            t.payment_data?.moneroo_id === data.id
          )
        }

        if (!tx) {
          console.error('❌ [MONEROO-WEBHOOK] Transaction not found:', data.id)
          // Still return 200 to prevent retries
          return new Response(
            JSON.stringify({ received: true, warning: 'Transaction not found' }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        if (tx.status !== 'completed') {
          // Get activations from transaction metadata
          const creditsToAdd = tx.metadata?.activations || Math.floor(tx.amount / 100)
          
          if (creditsToAdd === 0) {
            console.error('⚠️ [MONEROO-WEBHOOK] No activations in metadata! Transaction:', tx.id)
            console.log('📋 [MONEROO-WEBHOOK] Transaction metadata:', JSON.stringify(tx.metadata))
          }

          console.log('💳 [MONEROO-WEBHOOK] Credit calculation:', {
            userId: tx.user_id,
            creditsToAdd,
            transactionId: tx.id,
            amount: data.amount
          })

          // Credit user balance via admin_add_credit (respects balance_operations ledger)
          const { data: creditResult, error: balanceError } = await supabase
            .rpc('admin_add_credit', {
              p_user_id: tx.user_id,
              p_amount: creditsToAdd,
              p_admin_note: `Recharge Moneroo ${data.amount || tx.amount} FCFA via ${verifiedData.capture?.method?.name || 'unknown'} - Ref: ${data.id}`
            })

          if (balanceError) {
            console.error('❌ [MONEROO-WEBHOOK] Failed to credit balance via admin_add_credit:', balanceError)
            // Try to rollback transaction status
            await supabase
              .from('transactions')
              .update({ status: 'failed', metadata: { ...tx.metadata, error: 'Failed to credit balance' } })
              .eq('id', tx.id)
          } else {
            console.log(`✅ [MONEROO-WEBHOOK] Credited ${creditsToAdd} activations to user ${tx.user_id} via admin_add_credit. New balance: ${creditResult.balance_after}`)

            // Update transaction status with balance info
            const { error: updateError } = await supabase
              .from('transactions')
              .update({
                status: 'completed',
                balance_before: creditResult.balance_before,
                balance_after: creditResult.balance_after,
                updated_at: new Date().toISOString(),
                metadata: {
                  ...tx.metadata,
                  moneroo_status: verifiedData.status,
                  moneroo_method: verifiedData.capture?.method?.name,
                  moneroo_gateway: verifiedData.capture?.gateway?.name,
                  completed_at: new Date().toISOString(),
                  related_credit_tx_id: creditResult.transaction_id
                }
              })
              .eq('id', tx.id)

            if (updateError) {
              console.error('❌ [MONEROO-WEBHOOK] Failed to update transaction:', updateError)
            }
          }
        }
        break
      }

      case 'payment.failed': {
        console.log('❌ [MONEROO-WEBHOOK] Payment FAILED:', data.id)
        
        // Find and update transaction
        const { data: transactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('payment_method', 'moneroo')
          .eq('status', 'pending')

        const tx = transactions?.find(t => 
          t.metadata?.moneroo_id === data.id || 
          t.payment_data?.moneroo_id === data.id
        )

        if (tx) {
          await supabase
            .from('transactions')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
              metadata: {
                ...tx.metadata,
                moneroo_status: 'failed',
                failure_reason: data.capture?.failure_message || 'Payment failed'
              }
            })
            .eq('id', tx.id)
        }
        
        break
      }

      case 'payment.pending': {
        console.log('⏳ [MONEROO-WEBHOOK] Payment PENDING:', data.id)
        // No action needed - wait for final status
        break
      }

      default:
        console.log('ℹ️ [MONEROO-WEBHOOK] Unknown event:', event)
    }

    // Always return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ 
        received: true,
        event: event,
        payment_id: data?.id
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('❌ [MONEROO-WEBHOOK] Error:', error)
    
    // Return 200 anyway to prevent retries on parse errors
    return new Response(
      JSON.stringify({ 
        received: true,
        error: error.message 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
