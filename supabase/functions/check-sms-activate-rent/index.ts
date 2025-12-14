import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ❌ Deprecated: use get-rent-status (atomic + refunds)
  return new Response(
    JSON.stringify({
      error: 'Deprecated endpoint. Please use get-rent-status.',
      hint: 'This function is disabled to prevent unsafe balance handling.'
    }),
    {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { rentalId } = await req.json()

    console.log('🔍 [CHECK-RENT] Checking rental:', rentalId)

    // 1. Get rental from database
    const { data: rental, error: rentalError } = await supabaseClient
      .from('rentals')
      .select('*')
      .eq('rental_id', rentalId)
      .single()

    if (rentalError || !rental) {
      throw new Error('Rental not found')
    }

    // 2. Check status on SMS-Activate
    const statusUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${rentalId}`
    
    const statusResponse = await fetch(statusUrl)
    const statusData = await statusResponse.json()

    console.log('📥 [CHECK-RENT] Status response:', statusData)

    if (statusData.status !== 'success') {
      // Check if rental has expired or been canceled
      if (statusData.message === 'STATUS_FINISH' || statusData.message === 'STATUS_CANCEL') {
        await supabaseClient
          .from('rentals')
          .update({ status: 'expired' })
          .eq('id', rental.id)
        
        return new Response(
          JSON.stringify({
            success: true,
            status: 'expired',
            messages: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      throw new Error(statusData.message || 'Failed to check rental status')
    }

    // 3. Parse SMS messages
    const messages = []
    if (statusData.values && Object.keys(statusData.values).length > 0) {
      for (const [index, sms] of Object.entries(statusData.values)) {
        messages.push({
          from: sms.phoneFrom,
          text: sms.text,
          service: sms.service,
          date: sms.date
        })
      }
    }

    console.log('📬 [CHECK-RENT] Found messages:', messages.length)

    // 4. Update rental with latest messages
    if (messages.length > 0) {
      await supabaseClient
        .from('rentals')
        .update({
          sms_messages: messages,
          last_checked_at: new Date().toISOString()
        })
        .eq('id', rental.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 'active',
        messages: messages,
        phone: rental.phone,
        expires_at: rental.expires_at
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [CHECK-RENT] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
