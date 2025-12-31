import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'
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
    
    console.log(`🌍 [COUNTRY-AVAILABILITY] Checking availability for ${service} across ${countries?.length || 'ALL'} countries`)
    
    // Récupérer TOUS les pays depuis l'API pour avoir le mapping ID -> nom
    console.log('🔍 [COUNTRY-AVAILABILITY] Fetching all countries metadata...')
    const countriesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getCountries`
    const countriesResponse = await fetch(countriesUrl)
    
    if (!countriesResponse.ok) {
      throw new Error(`Failed to fetch countries: ${countriesResponse.status}`)
    }
    
    const allCountriesData = await countriesResponse.json()
    
    // Construire le mapping ID -> {code, name} dynamiquement
    const countryMap: Record<number, { code: string, name: string }> = {}
    Object.entries(allCountriesData).forEach(([id, country]: [string, any]) => {
      countryMap[parseInt(id)] = {
        code: country.eng.toLowerCase().replace(/\s+/g, '_'),
        name: country.eng
      }
    })
    
    console.log(`✅ [COUNTRY-AVAILABILITY] Loaded ${Object.keys(countryMap).length} countries metadata`)
    
    // Si aucun pays spécifié, vérifier TOUS les pays visibles
    let countriesToCheck: number[] = []
    
    if (countries && countries.length > 0) {
      countriesToCheck = countries
    } else {
      // Extraire les IDs de tous les pays visibles
      countriesToCheck = Object.entries(allCountriesData)
        .filter(([_, country]: [string, any]) => country.visible === 1)
        .map(([id, _]: [string, any]) => parseInt(id))
      
      console.log(`📊 [COUNTRY-AVAILABILITY] Will check ${countriesToCheck.length} visible countries`)
    }
    
    console.log(`🔎 [COUNTRY-AVAILABILITY] Checking ${countriesToCheck.length} countries for service ${service}`)
    
    // Scanner tous les pays en parallèle (par batches pour éviter rate limiting)
    const batchSize = 20
    const batches: number[][] = []
    for (let i = 0; i < countriesToCheck.length; i += batchSize) {
      batches.push(countriesToCheck.slice(i, i + batchSize))
    }
    
    const results: (CountryAvailability | null)[] = []
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async (countryId: number) => {
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
      
      results.push(...batchResults)
      
      // Petit délai entre les batches pour éviter rate limiting
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
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
