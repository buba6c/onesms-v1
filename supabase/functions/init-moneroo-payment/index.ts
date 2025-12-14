/**
 * Edge Function: Initialize Moneroo Payment
 * 
 * Cette fonction initialise un paiement via l'API Moneroo.
 * Elle doit être appelée depuis le frontend via supabase.functions.invoke()
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

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
      customer, 
      return_url, 
      metadata = {},
      methods 
    } = body

    // Validate required fields
    if (!amount || !currency || !customer?.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, currency, customer.email' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('💰 [MONEROO] Initializing payment:', { 
      amount, 
      currency, 
      userId: user.id,
      customer: customer.email 
    })

    // Generate unique reference
    const paymentRef = `ONESMS_${user.id.substring(0, 8)}_${Date.now()}`

    // Prepare Moneroo API request - ensure all required fields have values
    const monerooPayload: any = {
      amount: Math.round(amount), // Moneroo expects integer for XOF
      currency: currency,
      description: description || `Rechargement ONE SMS - ${amount} ${currency}`,
      customer: {
        email: customer.email,
        first_name: customer.first_name && customer.first_name.trim() !== '' ? customer.first_name : 'Client',
        last_name: customer.last_name && customer.last_name.trim() !== '' ? customer.last_name : 'ONESMS',
        ...(customer.phone && { phone: customer.phone })
      },
      return_url: return_url || `${Deno.env.get('APP_URL') || 'https://onesms-sn.com'}/dashboard?payment=success`,
      metadata: {
        ...metadata,
        user_id: user.id,
        payment_ref: paymentRef,
        source: 'onesms'
      }
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

    // Create pending transaction in database
    // Colonnes disponibles: id, user_id, type, amount, balance_before, balance_after, 
    // status, description, reference, payment_method, payment_data, virtual_number_id, 
    // created_at, updated_at, metadata, related_rental_id
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: amount,
        status: 'pending',
        payment_method: 'moneroo',
        reference: paymentRef,
        description: description || `Rechargement via Moneroo`,
        payment_data: {
          moneroo_id: monerooData.data.id,
          checkout_url: monerooData.data.checkout_url,
          currency: currency
        },
        metadata: {
          moneroo_id: monerooData.data.id,
          currency: currency,
          ...metadata
        }
      })

    if (txError) {
      console.error('❌ [MONEROO] Failed to create transaction:', txError)
      // Continue anyway - payment was initialized
    }

    console.log('✅ [MONEROO] Payment initialized successfully:', monerooData.data.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: monerooData.message,
        data: {
          id: monerooData.data.id,
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
        error: error.message || 'Internal server error',
        details: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
