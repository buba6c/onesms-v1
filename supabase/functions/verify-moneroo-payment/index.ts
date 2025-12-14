/**
 * Edge Function: Verify Moneroo Payment
 * 
 * Vérifie le statut d'un paiement Moneroo
 * Documentation: https://docs.moneroo.io/payments/transaction-verification
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MONEROO_API_URL = 'https://api.moneroo.io/v1'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Moneroo API key from environment
    const MONEROO_SECRET_KEY = Deno.env.get('MONEROO_SECRET_KEY')
    if (!MONEROO_SECRET_KEY) {
      throw new Error('MONEROO_SECRET_KEY not configured')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token!)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const body = await req.json()
    const { paymentId } = body

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'Missing paymentId' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🔍 [MONEROO] Verifying payment:', paymentId)

    // Call Moneroo API to verify payment
    const response = await fetch(`${MONEROO_API_URL}/payments/${paymentId}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MONEROO_SECRET_KEY}`,
        'Accept': 'application/json'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ [MONEROO] Verify error:', data)
      return new Response(
        JSON.stringify({ 
          error: data.message || 'Failed to verify payment',
          details: data.errors 
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ [MONEROO] Payment status:', data.data?.status)

    // If payment is successful, update transaction in DB if not already done
    if (data.data?.status === 'success') {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('external_id', paymentId)
        .eq('user_id', user.id)
        .single()

      if (transaction && transaction.status !== 'completed') {
        // Update transaction
        await supabase
          .from('transactions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', transaction.id)

        // Credit user balance
        const activations = transaction.metadata?.activations || Math.floor(transaction.amount / 100)
        
        const { data: userProfile } = await supabase
          .from('users')
          .select('balance')
          .eq('id', user.id)
          .single()

        if (userProfile) {
          await supabase
            .from('users')
            .update({ balance: (userProfile.balance || 0) + activations })
            .eq('id', user.id)
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: data.message,
        data: data.data
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('❌ [MONEROO] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
