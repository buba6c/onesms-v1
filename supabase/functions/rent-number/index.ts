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

  // ❌ Deprecated: use buy-sms-activate-rent (atomic freeze/commit)
  return new Response(
    JSON.stringify({
      error: 'Deprecated endpoint. Please use buy-sms-activate-rent.',
      hint: 'This function is disabled to prevent unsafe balance handling.'
    }),
    {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )

  try {
    const { service, rentTime, country, operator } = await req.json()
    
    if (!service || !rentTime || !country) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: service, rentTime, country' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🏠 Renting number:', { service, rentTime, country, operator })

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

    // Récupérer le profil utilisateur
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

    // Appel API SMS-Activate pour louer un numéro
    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!
    
    let rentUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentNumber&service=${service}&rent_time=${rentTime}&country=${country}`
    
    if (operator && operator !== 'any') {
      rentUrl += `&operator=${operator}`
    }

    console.log('📞 Calling SMS-Activate rent API...')
    
    const response = await fetch(rentUrl)
    const data = await response.json()

    console.log('📨 SMS-Activate response:', data)

    // Réponse succès:
    // {
    //   "status": "success",
    //   "phone": {
    //     "id": 1049,
    //     "endDate": "2020-01-31T12:01:52",
    //     "number": "79959707564"
    //   }
    // }

    if (data.status === 'success' && data.phone) {
      const { id: rentId, endDate, number: phone } = data.phone

      // Calculer le coût (estimation basée sur le temps)
      const hourlyRate = rentTime >= 24 ? 0.5 : 1.0 // $0.50/h pour jour, $1/h pour heures
      const totalCost = hourlyRate * parseInt(rentTime)

      // Vérifier le solde
      if (profile.balance < totalCost) {
        return new Response(
          JSON.stringify({ error: 'Insufficient balance' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Créer l'entrée rental dans la BDD
      const { data: rental, error: insertError } = await supabase
        .from('rentals')
        .insert({
          user_id: user.id,
          rent_id: rentId.toString(),
          phone: phone,
          service_code: service,
          country_code: country,
          operator: operator || 'any',
          start_date: new Date().toISOString(),
          end_date: endDate,
          rent_hours: parseInt(rentTime),
          hourly_rate: hourlyRate,
          total_cost: totalCost,
          status: 'active'
        })
        .select()
        .single()

      if (insertError) {
        console.error('❌ Error creating rental:', insertError)
        throw insertError
      }

      // Ledger + Déduire le solde
      const newBalance = profile.balance - totalCost

      await supabase.from('balance_operations').insert({
        user_id: user.id,
        rental_id: rental.id,
        operation_type: 'debit',
        amount: totalCost,
        balance_before: profile.balance,
        balance_after: newBalance,
        frozen_before: profile.frozen_balance ?? 0,
        frozen_after: profile.frozen_balance ?? 0,
        reason: `Rent number ${service} ${country}`
      })

      const { error: updateError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      if (updateError) {
        console.error('❌ Error updating balance:', updateError)
        throw updateError
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          rental: rental,
          phone: phone,
          rentId: rentId,
          endDate: endDate,
          totalCost: totalCost,
          newBalance: profile.balance - totalCost
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      // Erreurs possibles
      const errorMessage = data.message || 'Failed to rent number'
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Error in rent-number:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
