import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, country, operator, product, serviceCode, serviceName } = await req.json()

    console.log('📦 [BUY-HOSTING] Demande location:', { userId, country, operator, product, serviceCode })

    // Initialiser Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Récupérer l'API key 5sim
    const fiveSimApiKey = Deno.env.get('FIVE_SIM_API_KEY')
    if (!fiveSimApiKey) {
      throw new Error('5sim API key not configured')
    }

    // 1. Vérifier le solde utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('❌ [BUY-HOSTING] User not found:', userError)
      throw new Error('User not found')
    }

    // 2. Acheter le numéro sur 5sim
    const buyUrl = `https://5sim.net/v1/user/buy/hosting/${country}/${operator}/${product}`
    console.log('🌐 [BUY-HOSTING] Appel 5sim:', buyUrl)

    const buyResponse = await fetch(buyUrl, {
      headers: {
        'Authorization': `Bearer ${fiveSimApiKey}`,
        'Accept': 'application/json'
      }
    })

    if (!buyResponse.ok) {
      const errorText = await buyResponse.text()
      console.error('❌ [BUY-HOSTING] 5sim error:', errorText)
      throw new Error(`5sim API error: ${buyResponse.status} - ${errorText}`)
    }

    const hostingData = await buyResponse.json()
    console.log('✅ [BUY-HOSTING] Hosting acheté:', hostingData)

    // Déterminer la durée en heures
    const durationMap: Record<string, number> = {
      '3hours': 3,
      '1day': 24,
      '10days': 240,
      '1month': 720
    }
    const durationHours = durationMap[product] || 24

    // Calculer l'expiration
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()

    // 3. Sauvegarder la location en DB (nouvelle table 'rentals')
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .insert({
        user_id: userId,
        order_id: hostingData.id,
        phone: hostingData.phone,
        service_code: serviceCode || 'other',
        service_name: serviceName || 'Unknown',
        country_code: country,
        operator: operator,
        duration_type: product,
        duration_hours: durationHours,
        price: hostingData.price,
        status: 'active',
        expires_at: expiresAt,
        sms_count: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (rentalError) {
      console.error('❌ [BUY-HOSTING] Erreur création rental:', rentalError)
      throw rentalError
    }

    console.log('💾 [BUY-HOSTING] Rental créé en DB:', rental.id)

    // 4. PAS de déduction de balance (comme pour activation)
    console.log('💰 [BUY-HOSTING] Fonds gelés:', hostingData.price, 'Ⓐ - Balance inchangée:', userData.balance, 'Ⓐ')

    // 5. Créer une transaction "pending" SANS changer la balance
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'rental',
        amount: -hostingData.price,
        balance_before: userData.balance,
        balance_after: userData.balance, // Balance INCHANGÉE lors du gel
        status: 'pending',
        description: `Location ${product} - ${country} (Fonds gelés)`,
        metadata: {
          rental_id: rental.id,
          order_id: hostingData.id,
          phone: hostingData.phone,
          duration: product
        }
      })

    if (transactionError) {
      console.error('⚠️ [BUY-HOSTING] Transaction pending non créée:', transactionError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: rental.id,
          orderId: hostingData.id,
          phone: hostingData.phone,
          product: product,
          price: hostingData.price,
          expiresAt: expiresAt,
          status: 'active'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('❌ [BUY-HOSTING] Exception:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
