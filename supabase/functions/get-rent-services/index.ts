import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const url = new URL(req.url)
    const rentTime = url.searchParams.get('rent_time') || '4'
    const country = url.searchParams.get('country')
    const operator = url.searchParams.get('operator')

    console.log('🏠 Getting rent services:', { rentTime, country, operator })

    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!
    
    let apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&rent_time=${rentTime}`
    
    if (country) {
      apiUrl += `&country=${country}`
    }
    if (operator) {
      apiUrl += `&operator=${operator}`
    }

    console.log('📞 Calling SMS-Activate API...')
    
    const response = await fetch(apiUrl)
    const data = await response.json()

    console.log('📨 SMS-Activate response:', data)

    // Structure de réponse:
    // {
    //   "countries": {"0": 2, "1": 6},
    //   "operators": {"0": "aiva", "1": "any", "2": "beeline"},
    //   "services": {
    //     "full": {"cost": 42.93, "quant": 20},
    //     "wa": {"cost": 21.95, "quant": 20},
    //     "tg": {"cost": 7.68, "quant": 55}
    //   },
    //   "currency": 840
    // }

    if (!data.services) {
      return new Response(
        JSON.stringify({ 
          error: 'No rent services available',
          countries: data.countries || {},
          operators: data.operators || {}
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        countries: data.countries || {},
        operators: data.operators || {},
        services: data.services || {},
        currency: data.currency || 840,
        rentTime: parseInt(rentTime)
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in get-rent-services:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
