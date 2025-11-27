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
    // Support both URL params and body
    const url = new URL(req.url)
    let rentId = url.searchParams.get('rent_id') || url.searchParams.get('rentId')
    let page = url.searchParams.get('page') || '1'
    let size = url.searchParams.get('size') || '20'
    
    // If not in URL, try body
    if (!rentId && req.method === 'POST') {
      const body = await req.json()
      rentId = body.rentId || body.rent_id
      page = body.page || page
      size = body.size || size
    }
    
    if (!rentId) {
      return new Response(
        JSON.stringify({ error: 'Missing rentId parameter' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🏠 Getting rent status:', { rentId, page, size })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token!)

    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // Vérifier que le rental appartient à l'utilisateur (support multiple column names)
    console.log('🔍 Querying rental with:', { rentId, userId: user.id })
    
    // Try to find by order_id first (most common), then rent_id, then rental_id
    let rental = null
    let fetchError = null
    
    // First try order_id (number type in some schemas)
    const { data: rental1, error: error1 } = await supabase
      .from('rentals')
      .select('*')
      .eq('user_id', user.id)
      .eq('order_id', parseInt(rentId) || rentId)
      .single()
    
    if (!error1 && rental1) {
      rental = rental1
      console.log('✅ Found rental by order_id')
    } else {
      // Try rent_id
      const { data: rental2, error: error2 } = await supabase
        .from('rentals')
        .select('*')
        .eq('user_id', user.id)
        .eq('rent_id', rentId)
        .single()
      
      if (!error2 && rental2) {
        rental = rental2
        console.log('✅ Found rental by rent_id')
      } else {
        // Try rental_id
        const { data: rental3, error: error3 } = await supabase
          .from('rentals')
          .select('*')
          .eq('user_id', user.id)
          .eq('rental_id', rentId)
          .single()
        
        if (!error3 && rental3) {
          rental = rental3
          console.log('✅ Found rental by rental_id')
        } else {
          fetchError = error1 || error2 || error3
        }
      }
    }

    console.log('📋 Rental query result:', { rental: !!rental, fetchError })

    if (fetchError || !rental) {
      console.error('❌ Rental not found:', { rentId, userId: user.id, error: fetchError })
      return new Response(
        JSON.stringify({ 
          error: 'Rental not found',
          details: fetchError?.message,
          rentId,
          userId: user.id
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Appel API SMS-Activate pour récupérer les SMS
    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!
    const statusUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentStatus&id=${rentId}&page=${page}&size=${size}`

    console.log('📞 Calling SMS-Activate rent status API...')
    
    const response = await fetch(statusUrl)
    const data = await response.json()

    console.log('📨 SMS-Activate response:', data)

    // Réponse:
    // {
    //   "status": "success",
    //   "quantity": "2",
    //   "values": {
    //     "0": {
    //       "phoneFrom": "79180230628",
    //       "text": "Your code is 12345",
    //       "service": "wa",
    //       "date": "2020-01-30 14:31:58"
    //     }
    //   }
    // }

    if (data.status === 'success') {
      // Convertir l'objet values en array
      const messages = Object.values(data.values || {})

      // Mettre à jour le rental avec le dernier message
      if (messages.length > 0) {
        const latestMessage = messages[0] as any
        await supabase
          .from('rentals')
          .update({
            last_message_date: latestMessage.date,
            message_count: parseInt(data.quantity || '0'),
            sms_count: parseInt(data.quantity || '0'), // Support both column names
            updated_at: new Date().toISOString()
          })
          .eq('id', rental.id) // Use the UUID we already found
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          quantity: parseInt(data.quantity || '0'),
          messages: messages,
          rental: rental
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Failed to get rent status' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Error in get-rent-status:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
