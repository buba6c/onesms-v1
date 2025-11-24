import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'
const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!

interface Country {
  id: number
  code: string
  name: string
  visible: number
  retry: number
  rent: number
  multiService: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🌍 [GET-ALL-COUNTRIES] Fetching all available countries from SMS-Activate')
    
    // Récupérer la liste complète des pays
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Convertir l'objet en tableau et filtrer les pays visibles
    const countries: Country[] = Object.entries(data)
      .map(([id, country]: [string, any]) => ({
        id: parseInt(id),
        code: country.eng.toLowerCase().replace(/\s+/g, '_'),
        name: country.eng,
        visible: country.visible,
        retry: country.retry,
        rent: country.rent,
        multiService: country.multiService
      }))
      .filter(c => c.visible === 1) // Seulement les pays visibles
    
    console.log(`✅ [GET-ALL-COUNTRIES] Found ${countries.length} visible countries`)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        countries,
        total: countries.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('❌ [GET-ALL-COUNTRIES] Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
