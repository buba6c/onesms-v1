import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'
const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!

interface CountryAvailability {
  countryId: number
  countryCode: string
  countryName: string
  available: number
  price?: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { service, countries } = await req.json()
    
    if (!service) {
      return new Response(
        JSON.stringify({ error: 'Service code is required', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`🌍 [COUNTRY-AVAILABILITY] Checking availability for ${service} across ${countries?.length || 0} countries`)
    
    // Country ID to code mapping
    const countryMap: Record<number, { code: string, name: string }> = {
      187: { code: 'usa', name: 'United States' },
      4: { code: 'philippines', name: 'Philippines' },
      6: { code: 'indonesia', name: 'Indonesia' },
      22: { code: 'india', name: 'India' },
      12: { code: 'england', name: 'England' },
      0: { code: 'russia', name: 'Russia' },
      2: { code: 'kazakhstan', name: 'Kazakhstan' },
      36: { code: 'canada', name: 'Canada' },
      78: { code: 'france', name: 'France' },
      43: { code: 'germany', name: 'Germany' },
      52: { code: 'thailand', name: 'Thailand' },
      10: { code: 'vietnam', name: 'Vietnam' },
      15: { code: 'poland', name: 'Poland' },
      73: { code: 'brazil', name: 'Brazil' },
      82: { code: 'mexico', name: 'Mexico' }
    }
    
    // Default top countries si non spécifié
    const countriesToCheck = countries && countries.length > 0 
      ? countries 
      : [187, 4, 6, 22, 12, 36, 78, 43, 52, 10]
    
    // Scanner tous les pays en parallèle
    const results = await Promise.all(
      countriesToCheck.map(async (countryId: number) => {
        try {
          const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumbersStatus&country=${countryId}`
          const response = await fetch(url)
          
          if (!response.ok) {
            console.error(`❌ [COUNTRY-AVAILABILITY] HTTP ${response.status} for country ${countryId}`)
            return null
          }
          
          const data = await response.json()
          
          // Extraire le count pour le service spécifique
          let count = 0
          
          // Chercher avec différents formats: "wa", "wa_0", etc.
          if (data[service]) {
            count = typeof data[service] === 'string' ? parseInt(data[service]) : data[service]
          } else if (data[`${service}_0`]) {
            count = typeof data[`${service}_0`] === 'string' ? parseInt(data[`${service}_0`]) : data[`${service}_0`]
          }
          
          const countryInfo = countryMap[countryId] || { code: `country_${countryId}`, name: `Country ${countryId}` }
          
          console.log(`✅ [COUNTRY-AVAILABILITY] ${countryInfo.name} (${countryId}): ${count} numbers`)
          
          return {
            countryId,
            countryCode: countryInfo.code,
            countryName: countryInfo.name,
            available: count || 0
          } as CountryAvailability
        } catch (error) {
          console.error(`❌ [COUNTRY-AVAILABILITY] Error for country ${countryId}:`, error)
          return null
        }
      })
    )
    
    // Filtrer les résultats valides et trier par disponibilité
    const availability = results
      .filter((r): r is CountryAvailability => r !== null)
      .sort((a, b) => b.available - a.available)
    
    console.log(`📊 [COUNTRY-AVAILABILITY] Total: ${availability.length} countries checked`)
    console.log(`🏆 [COUNTRY-AVAILABILITY] Top 3:`, availability.slice(0, 3).map(c => 
      `${c.countryName} (${c.available})`
    ))
    
    return new Response(
      JSON.stringify({ 
        success: true,
        service,
        availability,
        stats: {
          totalCountries: availability.length,
          availableCountries: availability.filter(c => c.available > 0).length,
          totalNumbers: availability.reduce((sum, c) => sum + c.available, 0)
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('❌ [COUNTRY-AVAILABILITY] Error:', error)
    
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
