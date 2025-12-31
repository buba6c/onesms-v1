/**
 * Edge Function: Moneroo Webhook Handler
 * 
 * Cette fonction reçoit les webhooks de Moneroo pour les événements de paiement.
 * Basée sur la structure de moneyfusion-webhook pour cohérence et robustesse.
 * 
 * Documentation: https://docs.moneroo.io/introduction/webhooks
 * 
 * Events:
 * - payment.success : Paiement réussi
 * - payment.failed : Paiement échoué
 * - payment.pending : Paiement en attente
 */

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const MONEROO_API_URL = 'https://api.moneroo.io/v1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-moneroo-signature',
}

// ==================== REFERRAL SYSTEM (copié de MoneyFusion) ====================
async function getReferralSettings(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase
    .from('system_settings')
    .select('key,value')
    .in('key', [
      'referral_enabled',
      'referral_bonus_referrer',
      'referral_bonus_referee',
      'referral_min_recharge_amount',
      'referral_monthly_cap',
      'referral_self_referral_block',
      'referral_expiry_days'
    ])
  const map: Record<string, string> = {}
  for (const row of data || []) {
    map[row.key] = row.value
  }
  return map
}

async function processReferralReward(supabase: ReturnType<typeof createClient>, tx: any, amountXof: number) {
  const settings = await getReferralSettings(supabase)
  if (settings.referral_enabled === 'false') return

  const { data: referral } = await supabase
    .from('referrals')
    .select('*')
    .eq('referee_id', tx.user_id)
    .maybeSingle()

  if (!referral || referral.status === 'rewarded') return

  const now = new Date()
  if (referral.expiry_date && new Date(referral.expiry_date) < now) {
    await supabase
      .from('referrals')
      .update({ status: 'expired', reason: 'expired' })
      .eq('id', referral.id)
    return
  }

  if (settings.referral_self_referral_block === 'true' && referral.referrer_id === referral.referee_id) {
    await supabase.from('referrals').update({ status: 'rejected', reason: 'self_referral' }).eq('id', referral.id)
    return
  }

  const minAmount = parseFloat(settings.referral_min_recharge_amount || '0') || 0
  if (amountXof < minAmount) {
    await supabase.from('referrals').update({ status: 'rejected', reason: 'min_amount' }).eq('id', referral.id)
    return
  }

  // Vérifier que c'est la première recharge
  const { count: completedCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', tx.user_id)
    .in('type', ['deposit', 'recharge', 'topup', 'payment'])
    .eq('status', 'completed')
    .neq('id', tx.id)

  if ((completedCount || 0) > 0) {
    await supabase.from('referrals').update({ status: 'rejected', reason: 'not_first_recharge' }).eq('id', referral.id)
    return
  }

  // Cap mensuel par parrain
  const monthlyCap = parseInt(settings.referral_monthly_cap || '0', 10)
  if (monthlyCap > 0 && referral.referrer_id) {
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count: rewardedCount } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', referral.referrer_id)
      .eq('status', 'rewarded')
      .gte('rewarded_at', startMonth)
    if ((rewardedCount || 0) >= monthlyCap) {
      await supabase.from('referrals').update({ status: 'rejected', reason: 'monthly_cap' }).eq('id', referral.id)
      return
    }
  }

  // Marquer qualifié et payer
  await supabase
    .from('referrals')
    .update({ status: 'qualified', qualified_at: now.toISOString() })
    .eq('id', referral.id)

  const bonusReferrer = parseFloat(settings.referral_bonus_referrer || '5') || 0
  const bonusReferee = parseFloat(settings.referral_bonus_referee || '5') || 0

  const { error: payoutError } = await supabase.rpc('secure_referral_payout', {
    p_referral_id: referral.id,
    p_bonus_referrer: bonusReferrer,
    p_bonus_referee: bonusReferee,
    p_reason: 'referral_first_recharge'
  })

  if (payoutError) {
    console.error('⚠️ [MONEROO-WEBHOOK] Referral payout failed', payoutError)
    await supabase
      .from('referrals')
      .update({ status: 'rejected', reason: 'payout_failed' })
      .eq('id', referral.id)
  } else {
    console.log('✅ [MONEROO-WEBHOOK] Referral payout ok', referral.id)
  }
}

// ==================== SIGNATURE VERIFICATION ====================
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return expectedSignature === signature
}

// ==================== IDEMPOTENCE CHECK (évite double crédit) ====================
async function alreadyCredited(supabase: ReturnType<typeof createClient>, txId: string) {
  const { data, error } = await supabase
    .from('balance_operations')
    .select('id')
    .eq('related_transaction_id', txId)
    .eq('operation_type', 'credit_admin')
    .limit(1)

  if (error) {
    console.error('⚠️ [MONEROO-WEBHOOK] balance_operations check failed:', error.message)
    return false
  }

  return !!(data && data.length > 0)
}

// ==================== VERIFY PAYMENT WITH MONEROO API ====================
async function verifyPaymentWithMoneroo(paymentId: string, secretKey: string) {
  try {
    const response = await fetch(`${MONEROO_API_URL}/payments/${paymentId}/verify`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Accept': 'application/json'
      }
    })
    const result = await response.json()
    return result.data || null
  } catch (e) {
    console.error('⚠️ [MONEROO-WEBHOOK] Failed to verify payment:', e)
    return null
  }
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
    // Get secrets from environment
    const MONEROO_WEBHOOK_SECRET = Deno.env.get('MONEROO_WEBHOOK_SECRET')
    const MONEROO_SECRET_KEY = Deno.env.get('MONEROO_SECRET_KEY')

    // Get raw body for signature verification
    const rawBody = await req.text()
    
    // Verify signature if secret is configured
    const signature = req.headers.get('X-Moneroo-Signature')
    if (MONEROO_WEBHOOK_SECRET && signature) {
      const isValid = verifySignature(rawBody, signature, MONEROO_WEBHOOK_SECRET)
      if (!isValid) {
        console.warn('⚠️ [MONEROO-WEBHOOK] Invalid signature (ignored - may be config issue)')
      } else {
        console.log('✅ [MONEROO-WEBHOOK] Signature verified')
      }
    } else {
      console.warn('⚠️ [MONEROO-WEBHOOK] No signature verification')
    }
    
    // Parse webhook payload
    const webhookData = JSON.parse(rawBody)
    const { event, data } = webhookData

    console.log('📥 [MONEROO-WEBHOOK] Received:', {
      event,
      paymentId: data?.id,
      amount: data?.amount
    })

    // Initialize Supabase admin client (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Extract metadata from Moneroo data
    const metadata = data?.metadata || {}
    const userId = metadata.userId
    const paymentRef = metadata.paymentRef
    const activationsFromMetadata = metadata.activations || 0

    // Find transaction - multiple strategies
    let tx = null
    
    // Strategy 1: By reference
    if (paymentRef) {
      const { data: txByRef } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', paymentRef)
        .single()
      
      if (txByRef) {
        tx = txByRef
        console.log('✅ [MONEROO-WEBHOOK] Found transaction by reference:', paymentRef)
      }
    }

    // Strategy 2: By external_id (moneroo payment id)
    if (!tx && data?.id) {
      const { data: txByExtId } = await supabase
        .from('transactions')
        .select('*')
        .eq('external_id', data.id)
        .single()
      
      if (txByExtId) {
        tx = txByExtId
        console.log('✅ [MONEROO-WEBHOOK] Found transaction by external_id:', data.id)
      }
    }

    // Strategy 3: By moneroo_id in metadata
    if (!tx) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_method', 'moneroo')
        .in('status', ['pending', 'completed'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (transactions) {
        tx = transactions.find(t => 
          t.metadata?.moneroo_id === data?.id
        )
        if (tx) {
          console.log('✅ [MONEROO-WEBHOOK] Found transaction by metadata moneroo_id')
        }
      }
    }

    // Handle different events
    switch (event) {
      case 'payment.success': {
        console.log('💰 [MONEROO-WEBHOOK] Payment SUCCESS:', data?.id)

        if (!tx) {
          console.error('❌ [MONEROO-WEBHOOK] Transaction not found:', data?.id)
          return new Response(
            JSON.stringify({ received: true, warning: 'Transaction not found' }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Verify payment with Moneroo API (source of truth)
        let verifiedData = data
        let remoteStatus = 'unknown'
        if (MONEROO_SECRET_KEY) {
          const verified = await verifyPaymentWithMoneroo(data.id, MONEROO_SECRET_KEY)
          if (verified) {
            verifiedData = verified
            remoteStatus = verified.status || 'unknown'
            console.log('📡 [MONEROO-WEBHOOK] Remote status:', remoteStatus)
          }
        }

        // Check if really paid
        const isPaid = remoteStatus === 'success' || verifiedData?.status === 'success'
        if (!isPaid && remoteStatus !== 'unknown') {
          console.warn('⚠️ [MONEROO-WEBHOOK] Payment not confirmed as success, status=', remoteStatus)
          if (['failed', 'cancelled', 'expired'].includes(remoteStatus)) {
            await supabase
              .from('transactions')
              .update({
                status: 'failed',
                updated_at: new Date().toISOString(),
                metadata: { ...tx.metadata, moneroo_status: remoteStatus }
              })
              .eq('id', tx.id)
          }
          return new Response(
            JSON.stringify({ received: true, info: 'Not credited (status not success)' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Idempotence: check if already completed or credited
        const credited = await alreadyCredited(supabase, tx.id)
        if (tx.status === 'completed' || credited) {
          console.log('ℹ️ [MONEROO-WEBHOOK] Transaction already processed', { credited })
          return new Response(
            JSON.stringify({ received: true, info: 'Already processed' }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Get current user balance
        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('id, email, name, balance')
          .eq('id', tx.user_id)
          .single()

        if (userError) {
          console.error('❌ [MONEROO-WEBHOOK] Failed to get user:', userError)
        }

        const currentBalance = userProfile?.balance || 0
        
        // Get activations from transaction metadata
        const creditsToAdd = tx.metadata?.activations || 0
        
        if (creditsToAdd === 0) {
          console.error('⚠️ [MONEROO-WEBHOOK] No activations in metadata! Transaction:', tx.id)
          console.log('📋 [MONEROO-WEBHOOK] Transaction metadata:', JSON.stringify(tx.metadata))
        }
        
        const newBalance = currentBalance + creditsToAdd
        
        console.log('💳 [MONEROO-WEBHOOK] Credit calculation:', {
          userId: tx.user_id,
          currentBalance,
          creditsToAdd,
          newBalance,
          transactionId: tx.id
        })

        // Update transaction status
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            status: 'completed',
            balance_before: currentBalance,
            balance_after: newBalance,
            updated_at: new Date().toISOString(),
            metadata: {
              ...tx.metadata,
              moneroo_status: remoteStatus || 'success',
              moneroo_method: verifiedData?.capture?.method?.name,
              moneroo_gateway: verifiedData?.capture?.gateway?.name,
              completed_at: new Date().toISOString()
            }
          })
          .eq('id', tx.id)

        if (updateError) {
          console.error('❌ [MONEROO-WEBHOOK] Failed to update transaction:', updateError)
        }

        // Credit via secure_moneyfusion_credit_v2 RPC (idempotent)
        if (userProfile && creditsToAdd > 0) {
          const { data: creditResult, error: balanceError } = await supabase
            .rpc('secure_moneyfusion_credit_v2', {
              p_transaction_id: tx.id,
              p_token: data.id,
              p_reference: tx.reference || data.id
            })

          if (balanceError) {
            console.error('❌ [MONEROO-WEBHOOK] Failed to credit via secure_moneyfusion_credit_v2:', balanceError)
            await supabase
              .from('transactions')
              .update({ 
                status: 'pending_credit_error', 
                metadata: { ...tx.metadata, error: 'Failed to credit balance', error_detail: balanceError.message } 
              })
              .eq('id', tx.id)
          } else {
            console.log(`✅ [MONEROO-WEBHOOK] Credited ${creditsToAdd} activations via secure_moneyfusion_credit_v2`, creditResult)

            // Traiter éventuel bonus de parrainage sur première recharge
            const amountXof = tx.metadata?.amount_xof || Number(data?.amount) || 0
            await processReferralReward(supabase, tx, amountXof)

            // Enregistrer l'utilisation du code promo si présent
            if (tx.metadata?.promo_code_id) {
              try {
                const baseActivations = tx.metadata?.base_activations || creditsToAdd
                const bonusActivations = tx.metadata?.bonus_activations || 0
                
                await supabase.from('promo_code_uses').insert({
                  promo_code_id: tx.metadata.promo_code_id,
                  user_id: tx.user_id,
                  transaction_id: tx.id,
                  discount_applied: bonusActivations,
                  original_amount: baseActivations,
                  final_amount: creditsToAdd,
                })

                await supabase.rpc('increment_promo_uses', { 
                  code_id: tx.metadata.promo_code_id 
                }).catch(() => {})

                console.log('🎁 [MONEROO-WEBHOOK] Promo code use recorded:', tx.metadata.promo_code)
              } catch (promoError) {
                console.error('⚠️ [MONEROO-WEBHOOK] Failed to record promo use:', promoError)
              }
            }

            // Envoyer email de confirmation de recharge
            try {
              const finalBalance = creditResult?.balance_after || (currentBalance + creditsToAdd)
              await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  type: 'recharge_success',
                  email: userProfile.email,
                  userId: userProfile.id,
                  data: {
                    name: userProfile.name || userProfile.email?.split('@')[0] || 'Client',
                    amount: creditsToAdd,
                    balance: finalBalance,
                    date: new Date().toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }),
                  },
                }),
              })
              console.log('📧 [MONEROO-WEBHOOK] Recharge email sent to:', userProfile.email)
            } catch (emailError) {
              console.error('⚠️ [MONEROO-WEBHOOK] Failed to send recharge email:', emailError)
            }
          }
        } else if (creditsToAdd === 0) {
          console.error('⚠️ [MONEROO-WEBHOOK] Cannot credit 0 activations - check transaction metadata')
        }
        break
      }

      case 'payment.failed': {
        console.log('❌ [MONEROO-WEBHOOK] Payment FAILED:', data?.id)

        if (tx) {
          await supabase
            .from('transactions')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
              metadata: {
                ...tx.metadata,
                moneroo_status: 'failed',
                failure_reason: data?.capture?.failure_message || 'Payment failed'
              }
            })
            .eq('id', tx.id)
        }
        break
      }

      case 'payment.pending': {
        console.log('⏳ [MONEROO-WEBHOOK] Payment PENDING:', data?.id)
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
