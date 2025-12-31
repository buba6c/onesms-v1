/**
 * Edge Function: Initialize Moneroo Payment
 * 
 * Cette fonction initialise un paiement via l'API Moneroo.
 * Basée sur la structure de init-moneyfusion-payment pour cohérence.
 * 
 * Documentation Moneroo: https://docs.moneroo.io/payments/standard-integration
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

    // Initialize Supabase admin client (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token!)

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
      amount,        // Amount in XOF
      currency = 'XOF',
      description,
      return_url,
      customer = {},
      metadata = {},
      methods
    } = body

    // Convert activations to number (frontend sends as string)
    const activationsCount = parseInt(metadata.activations, 10) || 0

    // Extract customer info
    const phone = customer.phone || ''
    const email = customer.email || user.email
    const firstName = customer.first_name || 'Client'
    const lastName = customer.last_name || 'ONESMS'

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

    // Check if Moneroo is active in payment_providers
    const { data: monerooConfig, error: configError } = await supabaseAdmin
      .from('payment_providers')
      .select('is_active')
      .eq('provider_code', 'moneroo')
      .single()

    if (configError || !monerooConfig) {
      console.error('❌ [MONEROO] Configuration not found:', configError)
      return new Response(
        JSON.stringify({ error: 'Moneroo non configuré' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!monerooConfig.is_active) {
      console.log('⚠️ [MONEROO] Provider is disabled')
      return new Response(
        JSON.stringify({ error: 'Moneroo est désactivé' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('💰 [MONEROO] Initializing payment:', { 
      amount, 
      currency,
      userId: user.id,
      email
    })

    // Generate unique reference
    const paymentRef = `ONESMS_${user.id.substring(0, 8)}_${Date.now()}`

    // Webhook URL for Moneroo callbacks
    const webhookUrl = `${supabaseUrl}/functions/v1/moneroo-webhook`

    // Build metadata object - Moneroo n'accepte pas les valeurs null
    const monerooMetadata: Record<string, any> = {
      userId: user.id,
      paymentRef: paymentRef,
      activations: activationsCount,
      amount_xof: amount,
      type: 'recharge',
      source: 'onesms',
      base_activations: metadata.base_activations || activationsCount,
      bonus_activations: metadata.bonus_activations || 0
    }
    
    // Ajouter promo_code seulement si défini
    if (metadata.promo_code_id) {
      monerooMetadata.promo_code_id = String(metadata.promo_code_id)
    }
    if (metadata.promo_code) {
      monerooMetadata.promo_code = String(metadata.promo_code)
    }

    // Prepare Moneroo API request
    const monerooPayload: any = {
      amount: Math.round(amount),
      currency: currency,
      description: description || `Rechargement ONE SMS - ${activationsCount} activations`,
      customer: {
        email: email,
        first_name: firstName,
        last_name: lastName,
        ...(phone && { phone: phone })
      },
      return_url: return_url || 'https://onesms-sn.com/dashboard?payment=success',
      metadata: monerooMetadata
    }

    // Add methods if specified
    if (methods && methods.length > 0) {
      monerooPayload.methods = methods
    }

    console.log('📤 [MONEROO] Sending request to Moneroo API...')

    // Call Moneroo API
    const monerooResponse = await fetch(`${MONEROO_API_URL}/payments/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MONEROO_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(monerooPayload)
    })

    const monerooData = await monerooResponse.json()

    console.log('📥 [MONEROO] Response:', {
      status: monerooResponse.status,
      message: monerooData.message,
      paymentId: monerooData.data?.id
    })

    if (!monerooResponse.ok || !monerooData.data?.checkout_url) {
      console.error('❌ [MONEROO] API Error:', monerooData)
      return new Response(
        JSON.stringify({ 
          error: monerooData.message || 'Failed to initialize payment',
          details: monerooData.errors 
        }),
        { 
          status: monerooResponse.status || 400,
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

    // Create pending transaction in database (matching MoneyFusion structure)
    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: amount, // Amount is the actual XOF amount
        balance_before: currentBalance,
        balance_after: currentBalance + activationsCount, // Will be updated in webhook
        status: 'pending',
        payment_method: 'moneroo',
        reference: paymentRef,
        external_id: monerooData.data.id, // Moneroo payment ID
        description: description || `Rechargement ${activationsCount} activations ONE SMS`,
        metadata: {
          moneroo_id: monerooData.data.id,
          checkout_url: monerooData.data.checkout_url,
          phone: phone,
          amount_xof: amount,
          activations: activationsCount,
          payment_provider: 'moneroo',
          promo_code_id: metadata.promo_code_id || null,
          promo_code: metadata.promo_code || null,
          base_activations: metadata.base_activations || activationsCount,
          bonus_activations: metadata.bonus_activations || 0,
          ...metadata
        }
      })

    if (txError) {
      console.error('❌ [MONEROO] Failed to create transaction:', txError)
      // Continue anyway - payment was initialized
    }

    console.log('✅ [MONEROO] Payment initialized:', monerooData.data.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: monerooData.message || 'Payment initialized',
        data: {
          id: monerooData.data.id,
          token: monerooData.data.id, // For compatibility
          checkout_url: monerooData.data.checkout_url,
          payment_ref: paymentRef
        }
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
