/**
 * Edge Function: MoneyFusion Webhook Handler
 * 
 * Receives webhook notifications from MoneyFusion
 * Documentation: https://docs.moneyfusion.net/fr/webapi
 * 
 * Events:
 * - payin.session.pending : Paiement en attente
 * - payin.session.completed : Paiement réussi
 * - payin.session.cancelled : Paiement échoué/annulé
 */

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const MONEYFUSION_STATUS_URL = 'https://www.pay.moneyfusion.net/paiementNotif'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-moneyfusion-signature',
}

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
    console.error('⚠️ [REFERRAL] payout failed', payoutError)
    await supabase
      .from('referrals')
      .update({ status: 'rejected', reason: 'payout_failed' })
      .eq('id', referral.id)
  } else {
    console.log('✅ [REFERRAL] payout ok', referral.id)
  }
}

/**
 * Verify webhook signature using HMAC-SHA256
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return expectedSignature === signature
}

async function fetchPaymentStatus(tokenPay: string) {
  const url = `${MONEYFUSION_STATUS_URL}/${tokenPay}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Status API error ${res.status}`)
  }
  const data = await res.json()
  return data
}

async function alreadyCredited(supabase: ReturnType<typeof createClient>, txId: string) {
  const { data, error } = await supabase
    .from('balance_operations')
    .select('id')
    .eq('related_transaction_id', txId)
    .eq('operation_type', 'credit_admin')
    .limit(1)

  if (error) {
    console.error('⚠️ [MONEYFUSION-WEBHOOK] balance_operations check failed:', error.message)
    return false
  }

  return !!(data && data.length > 0)
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
    // Get webhook secret from environment (optional, non-bloquant)
    const MONEYFUSION_WEBHOOK_SECRET = Deno.env.get('MONEYFUSION_WEBHOOK_SECRET')

    // Get raw body for signature verification
    const rawBody = await req.text()
    
    // Signature check (best-effort; doc officielle ne mentionne pas de signature)
    const signature = req.headers.get('X-MoneyFusion-Signature')
    if (MONEYFUSION_WEBHOOK_SECRET && signature) {
      const isValid = verifySignature(rawBody, signature, MONEYFUSION_WEBHOOK_SECRET)
      if (!isValid) {
        console.warn('⚠️ [MONEYFUSION-WEBHOOK] Invalid signature (ignored per doc)')
      } else {
        console.log('✅ [MONEYFUSION-WEBHOOK] Signature verified')
      }
    } else {
      console.warn('⚠️ [MONEYFUSION-WEBHOOK] No signature verification (not provided by provider)')
    }
    
    // Parse webhook payload
    const webhookData = JSON.parse(rawBody)
    
    const { 
      event, 
      tokenPay, 
      personal_Info,
      Montant,
      frais,
      numeroSend,
      nomclient,
      moyen
    } = webhookData

    console.log('📥 [MONEYFUSION-WEBHOOK] Received:', {
      event,
      tokenPay,
      Montant,
      moyen
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

    // Extract user info from personal_Info
    const personalInfo = personal_Info?.[0] || {}
    const userId = personalInfo.userId
    const paymentRef = personalInfo.paymentRef
    const activations = personalInfo.activations || 0

    // Find transaction by moneyfusion_token in metadata or payment_data
    // First try to find by reference (most reliable)
    let tx = null
    
    if (paymentRef) {
      const { data: txByRef } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', paymentRef)
        .single()
      
      if (txByRef) {
        tx = txByRef
        console.log('✅ [MONEYFUSION-WEBHOOK] Found transaction by reference:', paymentRef)
      }
    }

    // Fallback: search by token in metadata
    if (!tx) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'deposit')
        .in('status', ['pending', 'completed']) // Also check completed to avoid duplicates
        .order('created_at', { ascending: false })
        .limit(50)

      // Find matching transaction by moneyfusion token in metadata
      if (transactions) {
        tx = transactions.find(t => 
          t.metadata?.moneyfusion_token === tokenPay
        )
        if (tx) {
          console.log('✅ [MONEYFUSION-WEBHOOK] Found transaction by token:', tokenPay)
        }
      }
    }

    // Handle different events
    switch (event) {
      case 'payin.session.completed': {
        console.log('💰 [MONEYFUSION-WEBHOOK] Payment SUCCESS:', tokenPay)

        if (!tx) {
          console.error('❌ [MONEYFUSION-WEBHOOK] Transaction not found:', tokenPay)
          return new Response(
            JSON.stringify({ received: true, warning: 'Transaction not found' }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Vérifier l'état réel via l'API MoneyFusion (source de vérité)
        let paid = false
        let remoteStatus = 'unknown'
        let statusPayload: any = null
        try {
          const statusData = await fetchPaymentStatus(tokenPay)
          statusPayload = statusData
          remoteStatus = statusData?.data?.statut || statusData?.statut || 'unknown'
          paid = remoteStatus === 'paid'
          console.log('📡 [MONEYFUSION-WEBHOOK] Remote status:', remoteStatus)
        } catch (e) {
          console.error('⚠️ [MONEYFUSION-WEBHOOK] Failed to verify payment status:', e)
          // Ne pas créditer sans vérification ; laisser en pending
          return new Response(
            JSON.stringify({ received: true, warning: 'Status check failed, left pending' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        if (!paid) {
          console.warn('⚠️ [MONEYFUSION-WEBHOOK] Payment not confirmed as paid, status=', remoteStatus)
          // Mettre à jour la transaction si statut connu comme failed/no paid
          if (['failure', 'no paid', 'cancelled'].includes(remoteStatus)) {
            await supabase
              .from('transactions')
              .update({
                status: 'failed',
                updated_at: new Date().toISOString(),
                metadata: { ...tx.metadata, moneyfusion_status: remoteStatus }
              })
              .eq('id', tx.id)
          }
          return new Response(
            JSON.stringify({ received: true, info: 'Not credited (status not paid)' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Idempotence: si déjà complétée ou déjà créditée, on ne recrédite pas
        const credited = await alreadyCredited(supabase, tx.id)
        if (tx.status === 'completed' || credited) {
          console.log('ℹ️ [MONEYFUSION-WEBHOOK] Transaction already processed or credited', { credited })
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
          .select('balance')
          .eq('id', tx.user_id)
          .single()

        if (userError) {
          console.error('❌ [MONEYFUSION-WEBHOOK] Failed to get user:', userError)
        }

        const currentBalance = userProfile?.balance || 0
        
        // Get activations from transaction metadata (set during init-moneyfusion-payment)
        // The activations count comes from the selected package
        const creditsToAdd = tx.metadata?.activations || 0
        
        if (creditsToAdd === 0) {
          console.error('⚠️ [MONEYFUSION-WEBHOOK] No activations in metadata! Transaction:', tx.id)
          console.log('📋 [MONEYFUSION-WEBHOOK] Transaction metadata:', JSON.stringify(tx.metadata))
        }
        
        const newBalance = currentBalance + creditsToAdd
        
        console.log('💳 [MONEYFUSION-WEBHOOK] Credit calculation:', {
          userId: tx.user_id,
          currentBalance,
          creditsToAdd,
          newBalance,
          transactionId: tx.id,
          montant: Montant
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
              moneyfusion_status: remoteStatus || 'paid',
              moneyfusion_method: moyen,
              moneyfusion_fees: frais,
              completed_at: new Date().toISOString(),
              moneyfusion_status_payload: statusPayload
            }
          })
          .eq('id', tx.id)

        if (updateError) {
          console.error('❌ [MONEYFUSION-WEBHOOK] Failed to update transaction:', updateError)
        }

        // Credit via SECURITY DEFINER RPC (idempotent)
        if (userProfile && creditsToAdd > 0) {
          const { data: creditResult, error: balanceError } = await supabase
            .rpc('secure_moneyfusion_credit_v2', {
              p_transaction_id: tx.id,
              p_token: tokenPay,
              p_reference: paymentRef || tx.reference || tokenPay
            })

          if (balanceError) {
            console.error('❌ [MONEYFUSION-WEBHOOK] Failed to credit via secure_moneyfusion_credit:', balanceError)
            await supabase
              .from('transactions')
              .update({ status: 'pending_credit_error', metadata: { ...tx.metadata, error: 'Failed to credit balance', error_detail: balanceError.message } })
              .eq('id', tx.id)
          } else {
            console.log(`✅ [MONEYFUSION-WEBHOOK] Credited via secure_moneyfusion_credit`, creditResult)

            // Traiter éventuel bonus de parrainage sur première recharge
            const amountXof = tx.metadata?.amount_xof || Number(Montant) || 0
            await processReferralReward(supabase, tx, amountXof)

            // Enregistrer l'utilisation du code promo si présent
            if (tx.metadata?.promo_code_id) {
              try {
                const baseActivations = tx.metadata?.base_activations || creditsToAdd
                const bonusActivations = tx.metadata?.bonus_activations || 0
                
                // Insert promo code use
                await supabase.from('promo_code_uses').insert({
                  promo_code_id: tx.metadata.promo_code_id,
                  user_id: tx.user_id,
                  transaction_id: tx.id,
                  discount_applied: bonusActivations,
                  original_amount: baseActivations,
                  final_amount: creditsToAdd,
                })

                // Increment current_uses
                await supabase.rpc('increment_promo_uses', { 
                  code_id: tx.metadata.promo_code_id 
                }).catch(() => {
                  // Fallback if RPC doesn't exist
                  supabase.from('promo_codes')
                    .update({ current_uses: supabase.sql`current_uses + 1` })
                    .eq('id', tx.metadata.promo_code_id)
                })

                console.log('🎁 [MONEYFUSION-WEBHOOK] Promo code use recorded:', tx.metadata.promo_code)
              } catch (promoError) {
                console.error('⚠️ [MONEYFUSION-WEBHOOK] Failed to record promo use:', promoError)
                // Don't block payment for promo tracking errors
              }
            }

            // Envoyer email de confirmation de recharge
            try {
              const newBalance = (userProfile.balance || 0) + creditsToAdd
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
                    balance: newBalance,
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
              console.log('📧 [MONEYFUSION-WEBHOOK] Recharge email sent to:', userProfile.email)
            } catch (emailError) {
              console.error('⚠️ [MONEYFUSION-WEBHOOK] Failed to send recharge email:', emailError)
              // Ne pas bloquer si l'email échoue
            }
          }
        } else if (creditsToAdd === 0) {
          console.error('⚠️ [MONEYFUSION-WEBHOOK] Cannot credit 0 activations - check transaction metadata')
        }
        break
      }

      case 'payin.session.cancelled': {
        console.log('❌ [MONEYFUSION-WEBHOOK] Payment FAILED/CANCELLED:', tokenPay)

        if (tx) {
          await supabase
            .from('transactions')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
              metadata: {
                ...tx.metadata,
                moneyfusion_status: 'cancelled',
                failure_reason: 'Payment cancelled or failed'
              }
            })
            .eq('id', tx.id)
        }
        break
      }

      case 'payin.session.pending': {
        console.log('⏳ [MONEYFUSION-WEBHOOK] Payment PENDING:', tokenPay)
        // No action needed - wait for final status
        break
      }

      default:
        console.log('ℹ️ [MONEYFUSION-WEBHOOK] Unknown event:', event)
    }

    // Always return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ 
        received: true,
        event: event,
        token: tokenPay
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('❌ [MONEYFUSION-WEBHOOK] Error:', error)
    
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
