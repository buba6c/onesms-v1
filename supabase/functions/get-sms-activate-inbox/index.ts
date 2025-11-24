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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { rentalId, userId } = await req.json()

    console.log('📬 [GET-SMS-ACTIVATE-INBOX] Request:', { rentalId, userId })

    // 1. Get rental from database
    const { data: rental, error: rentalError } = await supabaseClient
      .from('rentals')
      .select('*')
      .eq('id', rentalId)
      .eq('user_id', userId)
      .single()

    if (rentalError || !rental) {
      throw new Error('Rental not found or unauthorized')
    }

    // 2. Check rental status on SMS-Activate
    const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${rental.rental_id}`
    console.log('🌐 [GET-SMS-ACTIVATE-INBOX] API Call:', apiUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const response = await fetch(apiUrl)
    const data = await response.json()

    console.log('📥 [GET-SMS-ACTIVATE-INBOX] API Response:', JSON.stringify(data))

    // Response format: { status: "finish|active", phone: "...", values: [{...}] }
    const messages = data.values || []
    const status = data.status

    // Update rental status if changed
    if (status === 'finish' && rental.status === 'active') {
      await supabaseClient
        .from('rentals')
        .update({ status: 'expired' })
        .eq('id', rentalId)
    }

    // Parse messages
    const parsedMessages = messages.map((msg: any) => ({
      text: msg.text,
      code: msg.code,
      service: msg.service,
      date: msg.receivedAt || msg.date
    }))

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rental_id: rental.id,
          phone: rental.phone,
          status: status === 'finish' ? 'expired' : 'active',
          end_date: rental.end_date,
          messages: parsedMessages,
          total_messages: parsedMessages.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [GET-SMS-ACTIVATE-INBOX] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
