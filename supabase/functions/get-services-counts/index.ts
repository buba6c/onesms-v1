import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'
const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { countries = [187, 4, 6] } = await req.json()
    
    console.log('🌐 [GET-SERVICES-COUNTS] Scanning countries:', countries)
    
    // Scanner tous les pays en parallèle
    const results = await Promise.all(
      countries.map(async (countryId: number) => {
        try {
          const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumbersStatus&country=${countryId}`
          const response = await fetch(url)
          const data = await response.json()
          
          console.log(`✅ Country ${countryId}: ${Object.keys(data).length} services`)
          
          return { countryId, data }
        } catch (error) {
          console.error(`❌ Error country ${countryId}:`, error)
          return { countryId, data: {} }
        }
      })
    )
    
    // Agréger les compteurs par service
    const totalCounts: Record<string, number> = {}
    
    for (const { data } of results) {
      for (const [key, value] of Object.entries(data)) {
        // key format: "wa_0", "tg_0", "wa", etc.
        const serviceCode = key.includes('_') ? key.split('_')[0] : key
        
        // La valeur peut être un string (nombre direct) ou un objet
        let count = 0
        if (typeof value === 'string') {
          count = parseInt(value) || 0
        } else if (typeof value === 'object' && value !== null) {
          count = parseInt((value as any).count || 0)
        }
        
        if (count > 0) {
          totalCounts[serviceCode] = (totalCounts[serviceCode] || 0) + count
        }
      }
    }
    
    console.log('📊 [GET-SERVICES-COUNTS] Total counts:', Object.keys(totalCounts).length, 'services')
    
    return new Response(
      JSON.stringify({ 
        success: true,
        counts: totalCounts,
        scannedCountries: countries.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('❌ [GET-SERVICES-COUNTS] Error:', error)
    
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
