/**
 * Edge Function: Check Pending Payments Status
 * 
 * Cette fonction vérifie automatiquement le statut des paiements en attente
 * auprès des APIs des providers (Moneroo, MoneyFusion, PayDunya, etc.)
 * et met à jour les transactions en conséquence.
 * 
 * Peut être appelée par un cron job toutes les 5-10 minutes.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MONEROO_API_URL = 'https://api.moneroo.io/v1'
const MONEYFUSION_STATUS_URL = 'https://www.pay.moneyfusion.net/paiementNotif'

interface PendingTransaction {
  id: string
  user_id: string
  amount: number
  status: string
  payment_method: string | null
  reference: string | null
  external_id: string | null
  metadata: any
  created_at: string
}

// ==================== MONEROO STATUS CHECK ====================
async function checkMonerooStatus(paymentId: string, secretKey: string): Promise<{status: string, data?: any}> {
  try {
    const response = await fetch(`${MONEROO_API_URL}/payments/${paymentId}/verify`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.log(`[MONEROO] API returned ${response.status} for ${paymentId}`)
      return { status: 'unknown' }
    }
    
    const result = await response.json()
    const monerooStatus = result.data?.status || 'unknown'
    
    // Map Moneroo status to our status
    if (monerooStatus === 'success') return { status: 'completed', data: result.data }
    if (monerooStatus === 'failed' || monerooStatus === 'cancelled') return { status: 'failed', data: result.data }
    if (monerooStatus === 'pending') return { status: 'pending', data: result.data }
    if (monerooStatus === 'expired') return { status: 'failed', data: result.data }
    
    return { status: 'unknown', data: result.data }
  } catch (e) {
    console.error(`[MONEROO] Error checking status for ${paymentId}:`, e)
    return { status: 'error' }
  }
}

// ==================== MONEYFUSION STATUS CHECK ====================
async function checkMoneyFusionStatus(token: string): Promise<{status: string, data?: any}> {
  try {
    const response = await fetch(`${MONEYFUSION_STATUS_URL}/${token}`)
    
    if (!response.ok) {
      console.log(`[MONEYFUSION] API returned ${response.status} for ${token}`)
      return { status: 'unknown' }
    }
    
    const result = await response.json()
    const mfStatus = result?.data?.statut || result?.statut || 'unknown'
    
    // Map MoneyFusion status to our status
    if (mfStatus === 'paid') return { status: 'completed', data: result }
    if (['failure', 'no paid', 'cancelled', 'expired'].includes(mfStatus)) return { status: 'failed', data: result }
    if (mfStatus === 'pending') return { status: 'pending', data: result }
    
    return { status: 'unknown', data: result }
  } catch (e) {
    console.error(`[MONEYFUSION] Error checking status for ${token}:`, e)
    return { status: 'error' }
  }
}

// ==================== PROCESS COMPLETED PAYMENT ====================
async function processCompletedPayment(supabase: any, tx: PendingTransaction) {
  // Get user balance
  const { data: user } = await supabase
    .from('users')
    .select('balance')
    .eq('id', tx.user_id)
    .single()
  
  const currentBalance = user?.balance || 0
  const creditsToAdd = tx.metadata?.activations || 0
  
  if (creditsToAdd <= 0) {
    console.warn(`[CHECK-PENDING] Transaction ${tx.id} has 0 activations, skipping credit`)
    return false
  }
  
  // Credit via secure_moneyfusion_credit_v2
  const { data: creditResult, error: creditError } = await supabase
    .rpc('secure_moneyfusion_credit_v2', {
      p_transaction_id: tx.id,
      p_token: tx.external_id || tx.metadata?.moneroo_id || tx.metadata?.moneyfusion_token || tx.reference,
      p_reference: tx.reference || tx.id
    })
  
  if (creditError) {
    console.error(`[CHECK-PENDING] Failed to credit tx ${tx.id}:`, creditError)
    return false
  }
  
  console.log(`✅ [CHECK-PENDING] Credited ${creditsToAdd} activations for tx ${tx.id}`)
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const MONEROO_SECRET_KEY = Deno.env.get('MONEROO_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get all pending transactions older than 5 minutes (to avoid race conditions with webhooks)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: pendingTxs, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'pending')
      .in('type', ['deposit', 'recharge', 'topup', 'payment'])
      .lt('created_at', fiveMinutesAgo)  // At least 5 min old
      .gt('created_at', twentyFourHoursAgo)  // Not older than 24h
      .order('created_at', { ascending: true })
      .limit(50)

    if (fetchError) {
      console.error('[CHECK-PENDING] Error fetching pending transactions:', fetchError)
      throw fetchError
    }

    console.log(`📋 [CHECK-PENDING] Found ${pendingTxs?.length || 0} pending transactions to check`)

    const results = {
      checked: 0,
      completed: 0,
      failed: 0,
      stillPending: 0,
      errors: 0
    }

    for (const tx of (pendingTxs || [])) {
      results.checked++
      
      const provider = tx.payment_method || tx.metadata?.payment_provider || 'unknown'
      let checkResult = { status: 'unknown', data: null as any }
      
      // Determine which API to call based on provider
      if (provider === 'moneroo') {
        const paymentId = tx.external_id || tx.metadata?.moneroo_id
        if (paymentId && MONEROO_SECRET_KEY) {
          checkResult = await checkMonerooStatus(paymentId, MONEROO_SECRET_KEY)
        }
      } else if (provider === 'moneyfusion') {
        const token = tx.metadata?.moneyfusion_token || tx.external_id
        if (token) {
          checkResult = await checkMoneyFusionStatus(token)
        }
      } else {
        // Unknown provider, check if very old (> 1 hour) and mark as failed
        const txAge = Date.now() - new Date(tx.created_at).getTime()
        if (txAge > 60 * 60 * 1000) {  // > 1 hour
          checkResult = { status: 'failed' }
        }
      }
      
      console.log(`[CHECK-PENDING] ${tx.id} (${provider}): ${checkResult.status}`)
      
      // Update transaction based on result
      if (checkResult.status === 'completed') {
        // Credit the user
        const credited = await processCompletedPayment(supabase, tx)
        if (credited) {
          results.completed++
        } else {
          results.errors++
        }
      } else if (checkResult.status === 'failed') {
        // Mark as failed
        await supabase
          .from('transactions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            metadata: {
              ...tx.metadata,
              auto_check_status: checkResult.data?.status || 'failed',
              auto_check_at: new Date().toISOString()
            }
          })
          .eq('id', tx.id)
        
        results.failed++
      } else if (checkResult.status === 'pending') {
        results.stillPending++
      } else {
        // Check if transaction is too old (> 2 hours) and mark as failed
        const txAge = Date.now() - new Date(tx.created_at).getTime()
        if (txAge > 2 * 60 * 60 * 1000) {  // > 2 hours
          await supabase
            .from('transactions')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
              metadata: {
                ...tx.metadata,
                auto_failed_reason: 'timeout',
                auto_check_at: new Date().toISOString()
              }
            })
            .eq('id', tx.id)
          
          results.failed++
          console.log(`[CHECK-PENDING] ${tx.id} marked as failed (timeout > 2h)`)
        } else {
          results.stillPending++
        }
      }
    }

    console.log(`✅ [CHECK-PENDING] Done:`, results)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${results.checked} pending transactions`,
        results
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('[CHECK-PENDING] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
