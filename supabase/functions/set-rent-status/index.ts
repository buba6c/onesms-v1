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
    const { rentId, action } = await req.json()
    
    if (!rentId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing rentId or action' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (action !== 'finish' && action !== 'cancel') {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "finish" or "cancel"' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🏠 ${action === 'finish' ? 'Finishing' : 'Canceling'} rental:`, rentId)

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

    // Appel API SMS-Activate
    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!
    const status = action === 'finish' ? '1' : '2'
    const setStatusUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${rentId}&status=${status}`

    console.log('📞 Calling SMS-Activate set rent status API...')
    
    const response = await fetch(setStatusUrl)
    const data = await response.json()

    console.log('📨 SMS-Activate response:', data)

    if (data.status === 'success') {
      // Si c'est une annulation dans les 20 premières minutes, rembourser
      let refundAmount = 0
      if (action === 'cancel') {
        const startDate = new Date(rental.start_date)
        const now = new Date()
        const minutesElapsed = (now.getTime() - startDate.getTime()) / 60000

        if (minutesElapsed <= 20) {
          refundAmount = rental.total_cost
          
          // Rembourser le solde
          const { data: profile } = await supabase
            .from('users')
            .select('balance')
            .eq('id', user.id)
            .single()

          if (profile) {
            await supabase
              .from('users')
              .update({ balance: profile.balance + refundAmount })
              .eq('id', user.id)
          }
        }
      }

      // Mettre à jour le statut du rental
      const newStatus = action === 'finish' ? 'completed' : 'cancelled'
      await supabase
        .from('rentals')
        .update({
          status: newStatus,
          refund_amount: refundAmount,
          end_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('rent_id', rentId)

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Rental ${action === 'finish' ? 'finished' : 'cancelled'} successfully`,
          status: newStatus,
          refundAmount: refundAmount
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      const errorMessage = data.message || 'Failed to update rent status'
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Error in set-rent-status:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
