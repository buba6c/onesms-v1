import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ONLINESIM_BASE_URL = 'https://onlinesim.io/api'

// Mapping OnlineSIM numeric IDs to ISO codes for Frontend Flags
const ONLINESIM_ID_TO_ISO: Record<string, string> = {
  '7': 'ru',
  '380': 'ua',
  '77': 'kz',
  '1': 'us',
  '44': 'gb',
  '91': 'in',
  '62': 'id',
  '63': 'ph',
  '48': 'pl',
  '49': 'de',
  '33': 'fr',
  '34': 'es',
  '39': 'it',
  '55': 'br',
  '52': 'mx',
  '61': 'au',
  '31': 'nl',
  '371': 'lv',
  '372': 'ee',
  '370': 'lt',
  '86': 'cn',
  '852': 'hk',
  '853': 'mo',
  '886': 'tw',
  '81': 'jp',
  '82': 'kr',
  '84': 'vn',
  '66': 'th',
  '60': 'my',
  '95': 'mm',
  '855': 'kh',
  '856': 'la',
  '90': 'tr',
  '972': 'il',
  '20': 'eg',
  '27': 'za',
  '212': 'ma',
  '213': 'dz',
  '216': 'tn',
  '966': 'sa',
  '971': 'ae',
  '54': 'ar',
  '57': 'co',
  '56': 'cl',
  '51': 'pe',
  '58': 've',
  '507': 'pa',
  '506': 'cr',
  '503': 'sv',
  '504': 'hn',
  '502': 'gt',
  '505': 'ni',
  '591': 'bo',
  '595': 'py',
  '598': 'uy',
  '593': 'ec',
  '92': 'pk',
  '880': 'bd',
  '94': 'lk',
  '977': 'np',
  '960': 'mv',
  '234': 'ng',
  '254': 'ke',
  '233': 'gh',
  '225': 'ci',
  '221': 'sn',
  '237': 'cm',
  '243': 'cd',
  '242': 'cg',
  '241': 'ga',
  '240': 'gq',
  '255': 'tz',
  '256': 'ug',
  '250': 'rw',
  '257': 'bi',
  '251': 'et',
  '252': 'so',
  '253': 'dj',
  '249': 'sd',
  '211': 'ss',
  '260': 'zm',
  '263': 'zw',
  '265': 'mw',
  '258': 'mz',
  '261': 'mg',
  '230': 'mu',
  '248': 'sc',
  '269': 'km',
  '262': 're', // Reunion
  '358': 'fi',
  '46': 'se',
  '47': 'no',
  '45': 'dk',
  '354': 'is',
  '353': 'ie',
  '351': 'pt',
  '30': 'gr',
  '357': 'cy',
  '356': 'mt',
  '36': 'hu',
  '420': 'cz',
  '421': 'sk',
  '43': 'at',
  '41': 'ch',
  '40': 'ro',
  '359': 'bg',
  '386': 'si',
  '385': 'hr',
  '387': 'ba',
  '381': 'rs',
  '382': 'me',
  '355': 'al',
  '389': 'mk',
  '373': 'md',
  '374': 'am',
  '995': 'ge',
  '994': 'az',
  '375': 'by',
  // Fallbacks
  '0': 'ru'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { country: countryInput, getCountries: getCountriesList, rentTime, serviceCode } = body

    console.log('🏠 [GET-RENT-SERVICES] OnlineSIM', { countryInput, getCountriesList, rentTime, serviceCode })

    // Get API key from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: apiKeySetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'onlinesim_api_key')
      .single()

    const ONLINESIM_API_KEY = apiKeySetting?.value || Deno.env.get('ONLINESIM_API_KEY')!

    if (!ONLINESIM_API_KEY) {
      throw new Error('OnlineSIM API key not configured')
    }

    // =========================================================================
    // HELPER: Cache functions
    // =========================================================================
    const getCachedData = async (key: string) => {
      const { data } = await supabase
        .from('api_cache')
        .select('value')
        .eq('key', key)
        .gt('expires_at', new Date().toISOString())
        .single()
      return data?.value
    }

    const setCachedData = async (key: string, value: any, ttlSeconds: number) => {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
      await supabase.from('api_cache').upsert({
        key,
        value,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      })
    }

    // =========================================================================
    // GLOBAL DATA FETCHING (Unified Cache Strategy)
    // =========================================================================
    const FULL_DATA_CACHE_KEY = 'onlinesim_full_tariffs'
    let fullData: any = await getCachedData(FULL_DATA_CACHE_KEY)

    if (!fullData || !fullData.countries) {
      console.log('🌍 Fetching FRESH global data from OnlineSIM API...')
      try {
        const url = `${ONLINESIM_BASE_URL}/tariffsRent.php?apikey=${ONLINESIM_API_KEY}`
        const response = await fetch(url)
        const data = await response.json()

        if (data.response === '1' && data.countries) {
          fullData = data
          await setCachedData(FULL_DATA_CACHE_KEY, data, 60 * 60 * 24)
          console.log('✅ Global data cached successfully')
        } else if (data.response === 'TRY_AGAIN_LATER') {
          console.warn('⚠️ API Rate Limited on refresh')
          if (!fullData) throw new Error('OnlineSIM Rate Limit & No Cache')
        }
      } catch (err) {
        console.error('❌ Failed to refresh global data:', err)
        if (!fullData) throw err
      }
    }

    // =========================================================================
    // MODE 1: Get list of countries (getCountries=true)
    // =========================================================================
    if (getCountriesList) {
      if (!fullData?.countries) {
        throw new Error('No country data available')
      }

      const countries = Object.entries(fullData.countries).map(([code, countryData]: [string, any]) => {
        // KEY FIX: Map numeric ID to ISO code for frontend flags
        const isoCode = ONLINESIM_ID_TO_ISO[code] || 'un'; // 'un' for unknown/universal if missing

        return {
          id: parseInt(code),
          code: isoCode, // Frontend expects 'fr', 'us' etc for flags
          _originalId: code, // Keep original ID just in case
          name: countryData.country || isoCode.toUpperCase(),
          available: true,
          basePrice: countryData.periods?.['4']?.price || 0,
          quantity: 999 // Assume available if in list
        }
      })

      // Sort by priority
      const priority = ['fr', 'us', 'gb', 'ru', 'de', 'es', 'it']
      countries.sort((a, b) => {
        const idxA = priority.indexOf(a.code); const idxB = priority.indexOf(b.code)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return a.name.localeCompare(b.name)
      })

      return new Response(
        JSON.stringify({ success: true, countries: countries }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =========================================================================
    // MODE 2: Get services for a specific country (Using GLOBAL data)
    // =========================================================================
    if (countryInput) {
      // Input might be 'fr', 'us' from frontend (due to our change above) or '33'
      // We need to find the correct key in fullData.countries which is numeric '33'.
      // Inverse map search or check if input is numeric

      let targetId = countryInput.toString();

      // If input is non-numeric (iso code), find ID
      if (isNaN(parseInt(targetId))) {
        const entry = Object.entries(ONLINESIM_ID_TO_ISO).find(([k, v]) => v === targetId);
        if (entry) targetId = entry[0];
      }

      console.log('📦 Getting services from cache for:', { input: countryInput, resolvedId: targetId })

      const countryData = fullData.countries?.[targetId]

      if (!countryData || !countryData.periods) {
        return new Response(
          JSON.stringify({ success: true, services: {}, availableServices: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const periods = countryData.periods
      const requestedPeriod = rentTime ? rentTime.toString() : Object.keys(periods)[0]
      const periodData = periods[requestedPeriod] || Object.values(periods)[0] as any

      const price = parseFloat(periodData?.price || '0')
      const count = parseInt(periodData?.count || '0')

      const sellingPrice = Math.max(3, Math.ceil(price * 1.3 * 10) / 10)

      const availableServices = [
        {
          code: 'any', // OnlineSIM rent is generic usually
          name: 'Universal Number (All Sites)',
          display_name: 'Universal Number',
          available: count,
          cost: price,
          sellingPrice: sellingPrice
        },
        // If specific service requested, add it
        ...(serviceCode && serviceCode !== 'any' ? [{
          code: serviceCode,
          name: serviceCode.toUpperCase(),
          display_name: serviceCode.toUpperCase(),
          available: count,
          cost: price,
          sellingPrice: sellingPrice
        }] : [])
      ]

      return new Response(
        JSON.stringify({
          success: true,
          services: {
            'any': {
              code: 'any',
              name: 'Universal Number',
              cost: price,
              sellingPrice: sellingPrice,
              quant: { current: count }
            }
          },
          availableServices: availableServices
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Missing required parameters', success: false }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in get-rent-services:', error)
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
