import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.org/stubs/handler_api.php'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId } = await req.json()
    
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🔄 Requesting retry for activation:', orderId)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Vérifier que l'activation existe et appartient à l'utilisateur
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

    const { data: activation, error: fetchError } = await supabase
      .from('activations')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !activation) {
      return new Response(
        JSON.stringify({ error: 'Activation not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Vérifier que l'activation est en attente
    if (activation.status !== 'waiting' && activation.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Activation is not in waiting state' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Appel API SMS-Activate pour demander un retry (status=3)
    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!
    const retryUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setStatus&status=3&id=${orderId}`

    console.log('📞 Calling SMS-Activate retry API...')
    
    const response = await fetch(retryUrl)
    const text = await response.text()

    console.log('📨 SMS-Activate response:', text)

    if (text === 'ACCESS_RETRY_GET') {
      // Mise à jour du statut en BDD
      await supabase
        .from('activations')
        .update({
          status: 'retry_pending',
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Retry requested successfully',
          status: 'retry_pending'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else if (text === 'NO_ACTIVATION') {
      return new Response(
        JSON.stringify({ error: 'Activation not found on SMS-Activate' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else if (text === 'BAD_STATUS') {
      return new Response(
        JSON.stringify({ error: 'Cannot retry this activation' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      throw new Error(`Unexpected response: ${text}`)
    }

  } catch (error) {
    console.error('❌ Error in retry-sms-activate:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
