/**
 * Edge Function: Initialize MoneyFusion Payment
 * 
 * Documentation: https://docs.moneyfusion.net/fr/webapi
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// MoneyFusion API URL from environment
const MONEYFUSION_API_URL = Deno.env.get('MONEYFUSION_API_URL') || ''

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!MONEYFUSION_API_URL) {
      throw new Error('MONEYFUSION_API_URL not configured')
    }

    // Initialize Supabase admin client (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Client for user auth verification
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token!)

    if (authError || !user) {
      console.error('❌ Auth error:', authError)
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
    const { 
      amount, 
      currency,
      description,
      return_url, 
      customer = {},
      metadata = {}
    } = body

    // Extract phone and client name from customer object
    const phone = customer.phone || '00000000'
    const clientName = `${customer.first_name || 'Client'} ${customer.last_name || 'ONESMS'}`

    // Validate required fields
    if (!amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: amount' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if MoneyFusion is active in payment_providers
    const { data: moneyfusionConfig, error: configError } = await supabaseAdmin
      .from('payment_providers')
      .select('is_active')
      .eq('provider_code', 'moneyfusion')
      .single()

    if (configError || !moneyfusionConfig) {
      console.error('❌ [MONEYFUSION] Configuration not found:', configError)
      return new Response(
        JSON.stringify({ error: 'MoneyFusion non configuré' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!moneyfusionConfig.is_active) {
      console.log('⚠️  [MONEYFUSION] Provider is disabled')
      return new Response(
        JSON.stringify({ error: 'MoneyFusion est désactivé' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('💰 [MONEYFUSION] Initializing payment:', { 
      amount, 
      phone,
      userId: user.id
    })

    // Generate unique reference
    const paymentRef = `ONESMS_${user.id.substring(0, 8)}_${Date.now()}`

    // Webhook URL for MoneyFusion callbacks
    const webhookUrl = `${supabaseUrl}/functions/v1/moneyfusion-webhook`

    // Prepare MoneyFusion API request
    const moneyfusionPayload = {
      totalPrice: Math.round(amount),
      article: [
        { "Rechargement ONE SMS": Math.round(amount) }
      ],
      numeroSend: phone.replace(/\s/g, ''),
      nomclient: clientName || user.email?.split('@')[0] || 'Client',
      personal_Info: [
        {
          userId: user.id,
          paymentRef: paymentRef,
          activations: metadata.activations || 0,
          type: 'recharge',
          source: 'onesms'
        }
      ],
      return_url: return_url || 'https://onesms-sn.com/dashboard?payment=success',
      webhook_url: webhookUrl
    }

    console.log('📤 [MONEYFUSION] Sending request...')

    // Call MoneyFusion API
    const mfResponse = await fetch(MONEYFUSION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(moneyfusionPayload)
    })

    const mfData = await mfResponse.json()

    console.log('📥 [MONEYFUSION] Response:', {
      statut: mfData.statut,
      token: mfData.token,
      message: mfData.message
    })

    if (!mfData.statut || !mfData.url) {
      console.error('❌ [MONEYFUSION] API Error:', mfData)
      return new Response(
        JSON.stringify({ 
          error: mfData.message || 'Failed to initialize payment'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get current user balance for transaction record
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single()

    const currentBalance = userProfile?.balance || 0
    const activationsToAdd = metadata.activations || 0

    // Create pending transaction in database (using admin client to bypass RLS)
    // Note: payment_method has CHECK constraint, so we store provider in metadata instead
    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: amount, // Amount is the actual XOF amount (not activations!)
        balance_before: currentBalance,
        balance_after: currentBalance + activationsToAdd, // Will be updated in webhook when payment confirmed
        status: 'pending',
        reference: paymentRef,
        external_id: mfData.token, // MoneyFusion token
        description: description || `Rechargement ${activationsToAdd} activations ONE SMS`,
        metadata: {
          moneyfusion_token: mfData.token,
          checkout_url: mfData.url,
          phone: phone,
          amount_xof: amount,
          activations: activationsToAdd,
          payment_provider: 'moneyfusion',
          ...metadata
        }
      })

    if (txError) {
      console.error('❌ [MONEYFUSION] Failed to create transaction:', txError)
    }

    console.log('✅ [MONEYFUSION] Payment initialized:', mfData.token)

    return new Response(
      JSON.stringify({
        success: true,
        message: mfData.message,
        data: {
          token: mfData.token,
          checkout_url: mfData.url,
          payment_ref: paymentRef
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('❌ [MONEYFUSION] Error:', error)
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
