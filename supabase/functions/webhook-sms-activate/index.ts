import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Logger l'IP source pour debug
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown'
    
    console.log('📥 Webhook received from IP:', clientIp)

    // IPs SMS-Activate connues (pour référence seulement)
    // 188.42.218.183, 142.91.156.119
    // Note: IP filtering désactivé car SMS-Activate peut utiliser des IPs dynamiques

    // Parser le payload
    const payload = await req.json()
    console.log('📦 Webhook payload:', payload)

    const {
      activationId,
      service,
      text,
      code,
      country,
      receivedAt
    } = payload

    if (!activationId) {
      return new Response(
        JSON.stringify({ error: 'Missing activationId' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Créer client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Logger le webhook
    await supabase
      .from('webhook_logs')
      .insert({
        activation_id: activationId,
        payload: payload,
        received_at: receivedAt || new Date().toISOString(),
        ip_address: clientIp
      })

    // Mettre à jour l'activation avec le code SMS
    const { data: activation, error: fetchError } = await supabase
      .from('activations')
      .select('*')
      .eq('order_id', activationId)
      .single()

    if (fetchError || !activation) {
      console.error('❌ Activation not found:', activationId)
      
      // Retourner 200 quand même pour éviter les retry SMS-Activate
      return new Response('OK', { 
        status: 200,
        headers: corsHeaders
      })
    }

    // 1. Appel unique et atomique : process_sms_received fait update + commit + transaction
    const { data: processResult, error: processError } = await supabase.rpc('process_sms_received', {
      p_order_id: activationId,
      p_code: code,
      p_text: text,
      p_source: 'webhook'
    })

    if (processError) {
      console.error('❌ process_sms_received error:', processError)
      throw processError
    }

    if (processResult?.idempotent) {
      console.log('⚠️ Already processed (idempotent)')
    } else if (processResult?.success) {
      console.log('✅ process_sms_received SUCCESS:', processResult)
    } else {
      console.error('❌ process_sms_received returned error payload:', processResult)
    }

    console.log('✅ Activation updated successfully:', activationId)

    // TODO: Envoyer notification push à l'utilisateur
    // TODO: Envoyer email avec le code
    
    // Retourner 200 pour confirmer la réception
    return new Response('OK', { 
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    
    // Retourner 200 quand même pour éviter les retry infinis
    return new Response('OK', { 
      status: 200,
      headers: corsHeaders
    })
  }
})
