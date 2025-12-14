import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

// Mapping des noms de pays vers codes ISO-2 (utilisé pour générer les bons codes)
const NAME_TO_ISO: Record<string, string> = {
  'afghanistan': 'af', 'albania': 'al', 'algeria': 'dz', 'angola': 'ao',
  'argentina': 'ar', 'armenia': 'am', 'australia': 'au', 'austria': 'at',
  'azerbaijan': 'az', 'bahamas': 'bs', 'bahrain': 'bh', 'bangladesh': 'bd',
  'barbados': 'bb', 'belarus': 'by', 'belgium': 'be', 'belize': 'bz',
  'benin': 'bj', 'bhutan': 'bt', 'bolivia': 'bo', 'bosnia': 'ba', 'bosnia and herzegovina': 'ba',
  'botswana': 'bw', 'brazil': 'br', 'brunei': 'bn', 'bulgaria': 'bg', 'burkina faso': 'bf',
  'burundi': 'bi', 'cambodia': 'kh', 'cameroon': 'cm', 'canada': 'ca',
  'central african republic': 'cf', 'chad': 'td', 'chile': 'cl', 'china': 'cn', 'colombia': 'co',
  'comoros': 'km', 'congo': 'cg', 'costa rica': 'cr', 'croatia': 'hr', 'cuba': 'cu',
  'cyprus': 'cy', 'czech': 'cz', 'czech republic': 'cz', 'denmark': 'dk', 'djibouti': 'dj',
  'dominica': 'dm', 'dominican republic': 'do', 'ecuador': 'ec', 'egypt': 'eg',
  'el salvador': 'sv', 'equatorial guinea': 'gq', 'eritrea': 'er', 'estonia': 'ee',
  'ethiopia': 'et', 'fiji': 'fj', 'finland': 'fi', 'france': 'fr', 'gabon': 'ga',
  'gambia': 'gm', 'georgia': 'ge', 'germany': 'de', 'ghana': 'gh', 'greece': 'gr',
  'grenada': 'gd', 'guatemala': 'gt', 'guinea': 'gn', 'guinea-bissau': 'gw', 'guyana': 'gy',
  'haiti': 'ht', 'honduras': 'hn', 'hong kong': 'hk', 'hungary': 'hu', 'iceland': 'is',
  'india': 'in', 'indonesia': 'id', 'iran': 'ir', 'iraq': 'iq', 'ireland': 'ie',
  'israel': 'il', 'italy': 'it', 'ivory coast': 'ci', 'jamaica': 'jm', 'japan': 'jp',
  'jordan': 'jo', 'kazakhstan': 'kz', 'kenya': 'ke', 'kuwait': 'kw', 'kyrgyzstan': 'kg',
  'laos': 'la', 'latvia': 'lv', 'lebanon': 'lb', 'lesotho': 'ls', 'liberia': 'lr',
  'libya': 'ly', 'lithuania': 'lt', 'luxembourg': 'lu', 'macau': 'mo', 'madagascar': 'mg',
  'malawi': 'mw', 'malaysia': 'my', 'maldives': 'mv', 'mali': 'ml', 'malta': 'mt',
  'mauritania': 'mr', 'mauritius': 'mu', 'mexico': 'mx', 'moldova': 'md', 'monaco': 'mc',
  'mongolia': 'mn', 'montenegro': 'me', 'morocco': 'ma', 'mozambique': 'mz', 'myanmar': 'mm',
  'namibia': 'na', 'nepal': 'np', 'netherlands': 'nl', 'new zealand': 'nz', 'nicaragua': 'ni',
  'niger': 'ne', 'nigeria': 'ng', 'north korea': 'kp', 'north macedonia': 'mk', 'norway': 'no',
  'oman': 'om', 'pakistan': 'pk', 'palestine': 'ps', 'panama': 'pa', 'papua new guinea': 'pg',
  'paraguay': 'py', 'peru': 'pe', 'philippines': 'ph', 'poland': 'pl', 'portugal': 'pt',
  'puerto rico': 'pr', 'qatar': 'qa', 'romania': 'ro', 'russia': 'ru', 'rwanda': 'rw',
  'saint kitts and nevis': 'kn', 'saint lucia': 'lc', 'saint vincent': 'vc', 'samoa': 'ws',
  'saudi arabia': 'sa', 'senegal': 'sn', 'serbia': 'rs', 'seychelles': 'sc', 'sierra leone': 'sl',
  'singapore': 'sg', 'slovakia': 'sk', 'slovenia': 'si', 'somalia': 'so', 'south africa': 'za',
  'south korea': 'kr', 'spain': 'es', 'sri lanka': 'lk', 'sudan': 'sd', 'suriname': 'sr',
  'swaziland': 'sz', 'sweden': 'se', 'switzerland': 'ch', 'syria': 'sy', 'taiwan': 'tw',
  'tajikistan': 'tj', 'tanzania': 'tz', 'thailand': 'th', 'togo': 'tg', 'trinidad and tobago': 'tt',
  'tunisia': 'tn', 'turkey': 'tr', 'turkmenistan': 'tm', 'uganda': 'ug', 'ukraine': 'ua',
  'united arab emirates': 'ae', 'united kingdom': 'gb', 'england': 'gb', 'usa': 'us', 
  'united states': 'us', 'uruguay': 'uy', 'uzbekistan': 'uz', 'venezuela': 've', 'vietnam': 'vn',
  'yemen': 'ye', 'zambia': 'zm', 'zimbabwe': 'zw'
}

// Fonction pour récupérer TOUS les pays depuis l'API SMS-Activate
async function fetchAllCountries(apiKey: string): Promise<Record<number, { name: string, code: string }>> {
  try {
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${apiKey}&action=getCountries`
    const response = await fetch(url)
    const data = await response.json()
    
    const countryMap: Record<number, { name: string, code: string }> = {}
    
    for (const [id, country] of Object.entries(data)) {
      const countryId = parseInt(id)
      const countryData = country as { eng: string, rus?: string, visible?: number, rent?: number }
      
      const name = countryData.eng
      // Utiliser le mapping correct pour le code ISO
      const nameLower = name.toLowerCase()
      const code = NAME_TO_ISO[nameLower] || FALLBACK_COUNTRY_MAP[countryId]?.code || nameLower.substring(0, 2)
      
      countryMap[countryId] = {
        name: name,
        code: code
      }
    }
    
    console.log(`✅ Loaded ${Object.keys(countryMap).length} countries from SMS-Activate API`)
    return countryMap
  } catch (error) {
    console.error('❌ Failed to fetch countries from API:', error)
    return FALLBACK_COUNTRY_MAP
  }
}

// Mapping de fallback (si l'API échoue)
const FALLBACK_COUNTRY_MAP: Record<number, { name: string, code: string }> = {
  0: { name: 'Russia', code: 'ru' },
  1: { name: 'Ukraine', code: 'ua' },
  2: { name: 'Kazakhstan', code: 'kz' },
  3: { name: 'China', code: 'cn' },
  4: { name: 'Philippines', code: 'ph' },
  5: { name: 'Myanmar', code: 'mm' },
  6: { name: 'Indonesia', code: 'id' },
  7: { name: 'Malaysia', code: 'my' },
  8: { name: 'Kenya', code: 'ke' },
  9: { name: 'Tanzania', code: 'tz' },
  10: { name: 'Vietnam', code: 'vn' },
  11: { name: 'Kyrgyzstan', code: 'kg' },
  12: { name: 'United Kingdom', code: 'gb' },
  13: { name: 'Israel', code: 'il' },
  14: { name: 'Hong Kong', code: 'hk' },
  15: { name: 'Poland', code: 'pl' },
  16: { name: 'Egypt', code: 'eg' },
  17: { name: 'Nigeria', code: 'ng' },
  18: { name: 'Macau', code: 'mo' },
  19: { name: 'Morocco', code: 'ma' },
  20: { name: 'Ghana', code: 'gh' },
  21: { name: 'Argentina', code: 'ar' },
  22: { name: 'India', code: 'in' },
  23: { name: 'Uzbekistan', code: 'uz' },
  24: { name: 'Cambodia', code: 'kh' },
  25: { name: 'Cameroon', code: 'cm' },
  26: { name: 'Chad', code: 'td' },
  27: { name: 'Germany', code: 'de' },
  28: { name: 'Lithuania', code: 'lt' },
  29: { name: 'Croatia', code: 'hr' },
  30: { name: 'Sweden', code: 'se' },
  31: { name: 'Iraq', code: 'iq' },
  32: { name: 'Romania', code: 'ro' },
  33: { name: 'Colombia', code: 'co' },
  34: { name: 'Austria', code: 'at' },
  35: { name: 'Belarus', code: 'by' },
  36: { name: 'Canada', code: 'ca' },
  37: { name: 'Saudi Arabia', code: 'sa' },
  38: { name: 'Mexico', code: 'mx' },
  39: { name: 'South Africa', code: 'za' },
  40: { name: 'Spain', code: 'es' },
  41: { name: 'Iran', code: 'ir' },
  42: { name: 'Algeria', code: 'dz' },
  43: { name: 'Netherlands', code: 'nl' },
  44: { name: 'Bangladesh', code: 'bd' },
  45: { name: 'Brazil', code: 'br' },
  46: { name: 'Turkey', code: 'tr' },
  47: { name: 'Japan', code: 'jp' },
  48: { name: 'South Korea', code: 'kr' },
  49: { name: 'Taiwan', code: 'tw' },
  50: { name: 'Singapore', code: 'sg' },
  51: { name: 'United Arab Emirates', code: 'ae' },
  52: { name: 'Thailand', code: 'th' },
  53: { name: 'Pakistan', code: 'pk' },
  54: { name: 'Nepal', code: 'np' },
  55: { name: 'Sri Lanka', code: 'lk' },
  56: { name: 'Portugal', code: 'pt' },
  57: { name: 'New Zealand', code: 'nz' },
  58: { name: 'Italy', code: 'it' },
  59: { name: 'Belgium', code: 'be' },
  60: { name: 'Switzerland', code: 'ch' },
  61: { name: 'Greece', code: 'gr' },
  62: { name: 'Czech Republic', code: 'cz' },
  63: { name: 'Hungary', code: 'hu' },
  64: { name: 'Denmark', code: 'dk' },
  65: { name: 'Norway', code: 'no' },
  66: { name: 'Finland', code: 'fi' },
  67: { name: 'Ireland', code: 'ie' },
  68: { name: 'Slovakia', code: 'sk' },
  69: { name: 'Bulgaria', code: 'bg' },
  70: { name: 'Serbia', code: 'rs' },
  71: { name: 'Slovenia', code: 'si' },
  72: { name: 'North Macedonia', code: 'mk' },
  73: { name: 'Peru', code: 'pe' },
  74: { name: 'Chile', code: 'cl' },
  75: { name: 'Ecuador', code: 'ec' },
  76: { name: 'Venezuela', code: 've' },
  77: { name: 'Bolivia', code: 'bo' },
  78: { name: 'France', code: 'fr' },
  79: { name: 'Paraguay', code: 'py' },
  80: { name: 'Uruguay', code: 'uy' },
  81: { name: 'Costa Rica', code: 'cr' },
  82: { name: 'Panama', code: 'pa' },
  83: { name: 'Dominican Republic', code: 'do' },
  84: { name: 'El Salvador', code: 'sv' },
  85: { name: 'Guatemala', code: 'gt' },
  86: { name: 'Honduras', code: 'hn' },
  87: { name: 'Nicaragua', code: 'ni' },
  88: { name: 'Cuba', code: 'cu' },
  89: { name: 'Haiti', code: 'ht' },
  90: { name: 'Jamaica', code: 'jm' },
  91: { name: 'Trinidad and Tobago', code: 'tt' },
  92: { name: 'Puerto Rico', code: 'pr' },
  93: { name: 'Barbados', code: 'bb' },
  94: { name: 'Bahamas', code: 'bs' },
  108: { name: 'Afghanistan', code: 'af' },
  117: { name: 'Laos', code: 'la' },
  129: { name: 'Sudan', code: 'sd' },
  141: { name: 'Jordan', code: 'jo' },
  163: { name: 'Palestine', code: 'ps' },
  165: { name: 'Bahrain', code: 'bh' },
  172: { name: 'Ethiopia', code: 'et' },
  175: { name: 'Australia', code: 'au' },
  187: { name: 'United States', code: 'us' },
  196: { name: 'Senegal', code: 'sn' }
}

// Mapping des codes de pays vers ID SMS-Activate
const COUNTRY_CODE_MAP: Record<string, number> = {
  // By name (lowercase)
  'russia': 0, 'ukraine': 1, 'kazakhstan': 2, 'china': 3, 'philippines': 4,
  'myanmar': 5, 'indonesia': 6, 'malaysia': 7, 'kenya': 8, 'tanzania': 9,
  'vietnam': 10, 'kyrgyzstan': 11, 'england': 12, 'uk': 12, 'israel': 13,
  'hongkong': 14, 'hong kong': 14, 'poland': 15, 'egypt': 16, 'nigeria': 17,
  'morocco': 19, 'ghana': 20, 'argentina': 21, 'india': 22, 'uzbekistan': 23,
  'cambodia': 24, 'cameroon': 25, 'chad': 26, 'germany': 27, 'lithuania': 28,
  'croatia': 29, 'sweden': 30, 'iraq': 31, 'romania': 32, 'colombia': 33,
  'austria': 34, 'belarus': 35, 'canada': 36, 'saudi': 37, 'mexico': 38,
  'south africa': 39, 'spain': 40, 'iran': 41, 'algeria': 42, 'netherlands': 43,
  'bangladesh': 44, 'brazil': 45, 'turkey': 46, 'japan': 47, 'korea': 48,
  'taiwan': 49, 'singapore': 50, 'uae': 51, 'thailand': 52, 'pakistan': 53,
  'nepal': 54, 'sri lanka': 55, 'portugal': 56, 'new zealand': 57, 'italy': 58,
  'belgium': 59, 'switzerland': 60, 'greece': 61, 'czech': 62, 'hungary': 63,
  'denmark': 64, 'norway': 65, 'finland': 66, 'ireland': 67, 'slovakia': 68,
  'bulgaria': 69, 'serbia': 70, 'slovenia': 71, 'macedonia': 72, 'peru': 73,
  'chile': 74, 'ecuador': 75, 'venezuela': 76, 'bolivia': 77, 'france': 78,
  'paraguay': 79, 'uruguay': 80, 'costa rica': 81, 'panama': 82, 'dominican': 83,
  'el salvador': 84, 'guatemala': 85, 'honduras': 86, 'nicaragua': 87,
  'cuba': 88, 'haiti': 89, 'jamaica': 90, 'trinidad': 91, 'puerto rico': 92,
  'barbados': 93, 'bahamas': 94, 'afghanistan': 108, 'laos': 117, 'sudan': 129,
  'jordan': 141, 'palestine': 163, 'bahrain': 165, 'ethiopia': 172,
  'australia': 175, 'usa': 187, 'united states': 187, 'senegal': 196,
  // By ISO2 codes
  'ru': 0, 'ua': 1, 'kz': 2, 'cn': 3, 'ph': 4, 'mm': 5, 'id': 6, 'my': 7,
  'ke': 8, 'tz': 9, 'vn': 10, 'kg': 11, 'gb': 12, 'il': 13, 'hk': 14,
  'pl': 15, 'eg': 16, 'ng': 17, 'ma': 19, 'gh': 20, 'ar': 21, 'in': 22,
  'uz': 23, 'kh': 24, 'de': 27, 'ro': 32, 'co': 33, 'ca': 36, 'mx': 38,
  'za': 39, 'es': 40, 'nl': 43, 'bd': 44, 'br': 45, 'tr': 46, 'jp': 47,
  'kr': 48, 'tw': 49, 'sg': 50, 'ae': 51, 'th': 52, 'pk': 53, 'pt': 56,
  'nz': 57, 'it': 58, 'be': 59, 'ch': 60, 'gr': 61, 'cz': 62, 'hu': 63,
  'dk': 64, 'no': 65, 'fi': 66, 'ie': 67, 'fr': 78, 'au': 175, 'us': 187, 'sn': 196
}

// Fonction pour mapper le code pays vers ID SMS-Activate
const mapCountryCode = (country: string): number | null => {
  if (!country) return null
  
  // Si déjà un nombre
  if (/^\d+$/.test(country)) {
    return parseInt(country)
  }
  
  // Pattern country_XX
  if (country.startsWith('country_')) {
    const num = parseInt(country.replace('country_', ''), 10)
    if (!isNaN(num)) return num
  }
  
  // Lookup dans le map
  return COUNTRY_CODE_MAP[country.toLowerCase()] ?? null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const rentTime = body.rentTime || '4'
    const countryInput = body.country
    const operator = body.operator
    const getCountriesList = body.getCountries === true
    const getServicesList = body.getServices === true

    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!
    
    // =========================================================================
    // MODE 0: Récupérer la liste des services RENT avec quantités agrégées (getServices=true)
    // Agrège les quantités depuis plusieurs pays populaires pour afficher un total réel
    // =========================================================================
    if (getServicesList) {
      console.log('📦 Getting RENT services list with aggregated quantities...')
      
      // Pays populaires pour l'agrégation (meilleure couverture)
      const POPULAR_COUNTRIES = [6, 52, 4, 16, 48]; // Indonésie, Thaïlande, Philippines, Égypte, Corée
      
      // D'abord récupérer la liste des services disponibles (sans pays)
      const baseApiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&rent_time=${rentTime}`
      const baseResponse = await fetch(baseApiUrl)
      const baseData = await baseResponse.json()
      
      if (!baseData.services) {
        return new Response(
          JSON.stringify({ error: 'No rent services available', success: false, services: {} }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Structure pour stocker les quantités agrégées
      const aggregatedServices: Record<string, { 
        code: string;
        totalQuantity: number;
        minCost: number;
        searchName: string;
      }> = {};
      
      // Initialiser avec tous les services disponibles
      for (const [code, serviceData] of Object.entries(baseData.services as Record<string, any>)) {
        aggregatedServices[code] = {
          code,
          totalQuantity: 0,
          minCost: parseFloat(serviceData.cost) || 0,
          searchName: serviceData.search_name || code
        };
      }
      
      // Agréger les quantités depuis les pays populaires (en parallèle)
      console.log('📊 Aggregating quantities from popular countries:', POPULAR_COUNTRIES);
      
      const countryPromises = POPULAR_COUNTRIES.map(async (countryId) => {
        try {
          const countryUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&rent_time=${rentTime}&country=${countryId}`
          const response = await fetch(countryUrl)
          const data = await response.json()
          
          if (data.services) {
            for (const [code, svcData] of Object.entries(data.services as Record<string, any>)) {
              const quant = svcData.quant?.current || 0
              if (aggregatedServices[code]) {
                aggregatedServices[code].totalQuantity += quant
                // Garder le coût le plus bas
                const cost = parseFloat(svcData.cost) || 0
                if (cost > 0 && (aggregatedServices[code].minCost === 0 || cost < aggregatedServices[code].minCost)) {
                  aggregatedServices[code].minCost = cost
                }
              }
            }
          }
          return { countryId, success: true }
        } catch (e) {
          console.warn(`⚠️ Failed to fetch country ${countryId}:`, e)
          return { countryId, success: false }
        }
      })
      
      await Promise.all(countryPromises)
      
      // Transformer en format avec quantités
      const servicesWithQuantities: Record<string, any> = {}
      for (const [code, svc] of Object.entries(aggregatedServices)) {
        servicesWithQuantities[code] = {
          code,
          cost: svc.minCost,
          quant: { current: svc.totalQuantity, total: svc.totalQuantity },
          search_name: svc.searchName
        }
      }
      
      const serviceCount = Object.keys(servicesWithQuantities).length
      const totalQuantity = Object.values(aggregatedServices).reduce((sum, s) => sum + s.totalQuantity, 0)
      console.log(`✅ Found ${serviceCount} RENT services with ${totalQuantity} total numbers available`)
      
      return new Response(
        JSON.stringify({ 
          success: true,
          services: servicesWithQuantities,
          totalServices: serviceCount,
          totalQuantity
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // =========================================================================
    // MODE 1: Récupérer la liste des pays RENT disponibles (sans country param)
    // Si serviceCode est fourni, ne retourne que les pays où ce service a du stock
    // =========================================================================
    if (getCountriesList) {
      const serviceCode = body.serviceCode as string | undefined // Ex: 'full' pour Full Rent
      console.log('🌍 Getting RENT countries list...', serviceCode ? `(with quantities for ${serviceCode})` : '')
      
      // 1️⃣ D'abord récupérer la liste de TOUS les pays depuis l'API getCountries
      const allCountriesMap = await fetchAllCountries(SMS_ACTIVATE_API_KEY)
      
      // 2️⃣ Ensuite récupérer les pays disponibles pour RENT
      const apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&rent_time=${rentTime}`
      const response = await fetch(apiUrl)
      const data = await response.json()
      
      if (!data.countries) {
        return new Response(
          JSON.stringify({ error: 'No rent countries available', success: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Liste des IDs de pays disponibles pour rent
      const countryIds = Object.values(data.countries as Record<string, number>)
      
      // 💰 Récupérer la marge système depuis system_settings (défaut 30%)
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      const { data: marginSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'pricing_margin_percentage')
        .single()
      
      const marginPercentage = marginSetting?.value ? parseFloat(marginSetting.value) : 30
      const USD_TO_FCFA = 600
      const FCFA_TO_COINS = 100
      const MIN_PRICE_COINS = 5
      
      // 3️⃣ Si serviceCode fourni, récupérer les quantités pour ce service dans chaque pays
      // MAIS retourner TOUS les pays (avec 0 si pas de stock)
      let countriesWithQuantities: { countryId: number; quantity: number; cost: number; sellingPrice: number; activationPrice: number }[] = []
      
      if (serviceCode) {
        console.log(`🔍 Getting quantities for service: ${serviceCode} in all ${countryIds.length} countries`)
        
        // Vérifier le stock de chaque pays en parallèle + récupérer prix d'activation
        const countryChecks = await Promise.all(
          countryIds.map(async (countryId) => {
            try {
              // Récupérer prix RENT
              const checkUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&rent_time=${rentTime}&country=${countryId}`
              const checkResponse = await fetch(checkUrl)
              const checkData = await checkResponse.json()
              
              const serviceData = checkData.services?.[serviceCode]
              const quantity = serviceData?.quant?.current || 0
              const cost = parseFloat(serviceData?.cost) || 0
              
              // Calculer le prix de vente RENT
              const priceFCFA = cost * USD_TO_FCFA
              const priceCoins = priceFCFA / FCFA_TO_COINS
              let sellingPrice = Math.max(MIN_PRICE_COINS, Math.ceil(priceCoins * (1 + marginPercentage / 100)))
              
              // Récupérer prix ACTIVATION pour comparaison
              let activationPrice = 0
              try {
                const activationUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&service=${serviceCode}&country=${countryId}`
                const activationResponse = await fetch(activationUrl)
                const activationData = await activationResponse.json()
                
                const activationCost = parseFloat(activationData?.[countryId]?.[serviceCode]?.cost || activationData?.[countryId]?.cost || 0)
                if (activationCost > 0) {
                  const actPriceFCFA = activationCost * USD_TO_FCFA
                  const actPriceCoins = actPriceFCFA / FCFA_TO_COINS
                  activationPrice = Math.max(MIN_PRICE_COINS, Math.ceil(actPriceCoins * (1 + marginPercentage / 100)))
                }
              } catch (e) {
                // Ignorer les erreurs de récupération du prix d'activation
              }
              
              // 🔒 Le prix du rent doit être >= prix d'activation
              if (activationPrice > 0 && sellingPrice < activationPrice) {
                console.log(`📈 ${serviceCode} in country ${countryId}: Rent ${sellingPrice}Ⓐ < Activation ${activationPrice}Ⓐ → Ajusté`)
                sellingPrice = activationPrice
              }
              
              return { countryId, quantity, cost, sellingPrice, activationPrice }
            } catch (e) {
              console.warn(`⚠️ Failed to check country ${countryId}:`, e)
              return { countryId, quantity: 0, cost: 0, sellingPrice: MIN_PRICE_COINS, activationPrice: 0 }
            }
          })
        )
        
        countriesWithQuantities = countryChecks
        
        const countriesWithStock = countryChecks.filter(c => c.quantity > 0).length
        console.log(`✅ ${countriesWithStock} countries have stock for ${serviceCode} (showing all ${countryIds.length})`)
      } else {
        // Sans serviceCode, juste retourner les pays sans quantités
        countriesWithQuantities = countryIds.map(id => ({ countryId: id, quantity: 0, cost: 0, sellingPrice: MIN_PRICE_COINS, activationPrice: 0 }))
      }
      
      // Transformer les IDs pays en objets avec nom/code et quantité
      // Trier: pays avec stock en premier (par quantité décroissante), puis les autres par nom
      const countriesArray = countriesWithQuantities
        .map(({ countryId, quantity, cost, sellingPrice, activationPrice }) => {
          const countryInfo = allCountriesMap[countryId] || FALLBACK_COUNTRY_MAP[countryId]
          return {
            id: countryId,
            code: countryInfo?.code || `country_${countryId}`,
            name: countryInfo?.name || `Country ${countryId}`,
            available: quantity > 0,
            quantity,
            cost, // Prix USD (pour debug)
            sellingPrice, // Prix de vente en Ⓐ (garanti >= activation)
            activationPrice // Prix d'activation en Ⓐ (pour référence)
          }
        })
        .sort((a, b) => {
          // Pays avec stock en premier
          if (a.quantity > 0 && b.quantity === 0) return -1
          if (a.quantity === 0 && b.quantity > 0) return 1
          // Parmi les pays avec stock, trier par quantité décroissante
          if (a.quantity > 0 && b.quantity > 0) return b.quantity - a.quantity
          // Parmi les pays sans stock, trier par nom
          return a.name.localeCompare(b.name)
        })
      
      console.log(`✅ Returning ${countriesArray.length} RENT countries`)
      
      return new Response(
        JSON.stringify({ 
          success: true,
          countries: countriesArray,
          totalCountries: countriesArray.length,
          countriesWithStock: countriesArray.filter(c => c.quantity > 0).length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // =========================================================================
    // MODE 2: Récupérer les services pour un pays spécifique
    // =========================================================================
    const countryId = countryInput ? mapCountryCode(countryInput) : 2 // Default Kazakhstan
    
    console.log('🏠 Getting rent services:', { rentTime, countryInput, countryId, operator })
    
    let apiUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&rent_time=${rentTime}&country=${countryId}`
    
    if (operator) {
      apiUrl += `&operator=${operator}`
    }

    console.log('📞 Calling SMS-Activate API...')
    
    const response = await fetch(apiUrl)
    const data = await response.json()

    console.log('📨 SMS-Activate response keys:', Object.keys(data))

    if (!data.services) {
      return new Response(
        JSON.stringify({ 
          error: 'No rent services available for this country',
          success: false,
          countries: data.countries || {},
          operators: data.operators || {}
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =========================================================================
    // Transformer les services pour inclure les infos importantes
    // Format API: { "wa": { "cost": 10.01, "retail_cost": "15.02", "quant": { "current": 42, "total": 42 } } }
    // =========================================================================
    
    // 💰 Récupérer la marge système depuis system_settings (défaut 30%)
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { data: marginSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'pricing_margin_percentage')
      .single()
    
    const marginPercentage = marginSetting?.value ? parseFloat(marginSetting.value) : 30
    console.log(`💰 Using system margin: ${marginPercentage}%`)
    
    // 💵 CONVERSION UNIFIÉE: USD → FCFA → Coins (Ⓐ) + marge système
    const USD_TO_FCFA = 600  // 1 USD = 600 FCFA
    const FCFA_TO_COINS = 100  // 1 Coin (Ⓐ) = 100 FCFA
    const MIN_PRICE_COINS = 5 // Prix minimum 5 Ⓐ
    
    // 📊 NOUVEAU: Récupérer les prix d'activation pour ce pays
    // Le prix du rent doit être >= prix d'activation pour le même service/pays
    console.log(`📊 Fetching activation prices for country ${countryId} to ensure rent >= activation...`)
    let activationPrices: Record<string, number> = {}
    
    try {
      const activationUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices&country=${countryId}`
      const activationResponse = await fetch(activationUrl)
      const activationData = await activationResponse.json()
      
      // Format: { "187": { "wa": { "cost": "2.50", "count": 100 }, ... } }
      if (activationData && activationData[countryId.toString()]) {
        const countryServices = activationData[countryId.toString()]
        for (const [serviceCode, serviceInfo] of Object.entries(countryServices)) {
          const info = serviceInfo as any
          const costUSD = parseFloat(info.cost) || 0
          if (costUSD > 0) {
            // Calculer le prix d'activation en coins
            const priceFCFA = costUSD * USD_TO_FCFA
            const priceCoins = priceFCFA / FCFA_TO_COINS
            const priceWithMargin = priceCoins * (1 + marginPercentage / 100)
            activationPrices[serviceCode] = Math.max(MIN_PRICE_COINS, Math.ceil(priceWithMargin))
          }
        }
        console.log(`✅ Loaded ${Object.keys(activationPrices).length} activation prices for comparison`)
      }
    } catch (e) {
      console.warn('⚠️ Failed to fetch activation prices, rent prices won\'t be validated:', e)
    }
    
    const transformedServices: Record<string, any> = {}
    
    for (const [code, serviceData] of Object.entries(data.services as Record<string, any>)) {
      const quant = serviceData.quant || { current: 0, total: 0 }
      const costUSD = parseFloat(serviceData.cost) || 0
      
      // Calcul: $10.01 × 600 = 6006 FCFA ÷ 100 = 60.06Ⓐ × 1.3 = 78.08Ⓐ → 79Ⓐ
      const priceFCFA = costUSD * USD_TO_FCFA
      const priceCoins = priceFCFA / FCFA_TO_COINS
      const priceWithMargin = priceCoins * (1 + marginPercentage / 100)
      let sellingPrice = Math.max(MIN_PRICE_COINS, Math.ceil(priceWithMargin))
      
      // 🔒 NOUVEAU: Le prix du rent doit être >= prix d'activation
      const activationPrice = activationPrices[code] || 0
      if (activationPrice > 0 && sellingPrice < activationPrice) {
        console.log(`📈 Rent ${code}: ${sellingPrice}Ⓐ < Activation ${activationPrice}Ⓐ → Ajusté à ${activationPrice}Ⓐ`)
        sellingPrice = activationPrice
      }
      
      transformedServices[code] = {
        code,
        cost: costUSD, // Prix d'achat en USD
        retailCost: parseFloat(serviceData.retail_cost) || 0,
        available: quant.current || 0,
        total: quant.total || 0,
        sellingPrice, // Prix de vente en coins (Ⓐ) - garanti >= activation
        activationPrice // Prix d'activation pour référence
      }
    }
    
    // Trier par disponibilité
    const sortedServices = Object.values(transformedServices)
      .filter((s: any) => s.available > 0)
      .sort((a: any, b: any) => b.available - a.available)
    
    console.log(`✅ Found ${sortedServices.length} services with availability for country ${countryId}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        countryId,
        rentTime: parseInt(rentTime),
        operators: data.operators || {},
        services: transformedServices,
        availableServices: sortedServices,
        currency: data.currency || 840
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in get-rent-services:', error)
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
