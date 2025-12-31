// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ❌ Deprecated: use continue-sms-activate-rent (atomic freeze/commit)
  return new Response(
    JSON.stringify({
      error: 'Deprecated endpoint. Please use continue-sms-activate-rent.',
      hint: 'This function is disabled to prevent unsafe balance handling.'
    }),
    {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )

  try {
    const { rentId, hours } = await req.json()
    
    if (!rentId || !hours) {
      return new Response(
        JSON.stringify({ error: 'Missing rentId or hours' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🏠 Continuing rental:', { rentId, hours })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Vérifier l'authentification
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

    // Vérifier que le rental appartient à l'utilisateur
    const { data: rental, error: fetchError } = await supabase
      .from('rentals')
      .select('*')
      .eq('rent_id', rentId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !rental) {
      return new Response(
        JSON.stringify({ error: 'Rental not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Vérifier que le rental est actif
    if (rental.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Rental is not active' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Récupérer le profil utilisateur pour le solde
    const { data: profile } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Appel API SMS-Activate pour obtenir le prix de prolongation
    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!
    const infoUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=continueRentInfo&id=${rentId}&hours=${hours}`

    console.log('📞 Checking continue rent price...')
    
    const infoResponse = await fetch(infoUrl)
    const infoData = await infoResponse.json()

    console.log('📨 Continue rent info:', infoData)

    if (infoData.status !== 'success' || !infoData.price) {
      return new Response(
        JSON.stringify({ error: 'Failed to get rent price' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const price = parseFloat(infoData.price)

    // Vérifier le solde
    if (profile.balance < price) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient balance',
          required: price,
          current: profile.balance
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Prolonger la location
    const continueUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=continueRentNumber&id=${rentId}&rent_time=${hours}`

    console.log('📞 Calling continue rent API...')
    
    const continueResponse = await fetch(continueUrl)
    const continueData = await continueResponse.json()

    console.log('📨 Continue rent response:', continueData)

    // Réponse:
    // {
    //   "status": "success",
    //   "phone": {
    //     "id": 1049,
    //     "endDate": "2020-01-31T16:01:52",
    //     "number": "79959707564"
    //   }
    // }

    if (continueData.status === 'success' && continueData.phone) {
      const { endDate: rawEndDate } = continueData.phone
      
      // Parse endDate - SMS-Activate returns Unix timestamp in seconds or ISO string
      const parseEndDate = (val: unknown): string => {
        if (typeof val === 'number') {
          return new Date(val < 1e10 ? val * 1000 : val).toISOString()
        }
        if (typeof val === 'string') {
          const num = Number(val)
          if (!isNaN(num)) {
            return new Date(num < 1e10 ? num * 1000 : num).toISOString()
          }
          return new Date(val).toISOString()
        }
        return new Date(Date.now() + parseInt(hours) * 3600 * 1000).toISOString()
      }
      const endDate = parseEndDate(rawEndDate)

      // Déduire le solde avec log
      const newBalance = profile.balance - price

      await supabase.from('balance_operations').insert({
        user_id: user.id,
        rental_id: rental.id,
        operation_type: 'debit',
        amount: price,
        balance_before: profile.balance,
        balance_after: newBalance,
        frozen_before: profile.frozen_balance ?? 0,
        frozen_after: profile.frozen_balance ?? 0,
        reason: `Extend rent ${rentId} (+${hours}h)`
      })

      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      // Mettre à jour le rental (avec expires_at pour cohérence)
      await supabase
        .from('rentals')
        .update({
          end_date: endDate,
          expires_at: endDate,
          rent_hours: rental.rent_hours + parseInt(hours),
          total_cost: rental.total_cost + price,
          updated_at: new Date().toISOString()
        })
        .eq('rent_id', rentId)

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Rental extended by ${hours} hours`,
          newEndDate: endDate,
          cost: price,
          newBalance: profile.balance - price
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      const errorMessage = continueData.message || 'Failed to continue rent'
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Error in continue-rent:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
