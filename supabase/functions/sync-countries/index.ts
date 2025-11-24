import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

// Mapping des pays avec leurs IDs SMS-Activate
const COUNTRY_MAPPING: Record<number, { code: string; name: string }> = {
  0: { code: 'russia', name: 'Russia' },
  1: { code: 'ukraine', name: 'Ukraine' },
  2: { code: 'kazakhstan', name: 'Kazakhstan' },
  3: { code: 'china', name: 'China' },
  4: { code: 'philippines', name: 'Philippines' },
  5: { code: 'myanmar', name: 'Myanmar' },
  6: { code: 'indonesia', name: 'Indonesia' },
  7: { code: 'malaysia', name: 'Malaysia' },
  8: { code: 'kenya', name: 'Kenya' },
  9: { code: 'tanzania', name: 'Tanzania' },
  10: { code: 'vietnam', name: 'Vietnam' },
  11: { code: 'kyrgyzstan', name: 'Kyrgyzstan' },
  12: { code: 'usa', name: 'United States' },
  13: { code: 'israel', name: 'Israel' },
  14: { code: 'hongkong', name: 'Hong Kong' },
  15: { code: 'poland', name: 'Poland' },
  16: { code: 'uk', name: 'United Kingdom' },
  17: { code: 'madagascar', name: 'Madagascar' },
  18: { code: 'congo', name: 'Congo' },
  19: { code: 'nigeria', name: 'Nigeria' },
  20: { code: 'egypt', name: 'Egypt' },
  21: { code: 'india', name: 'India' },
  22: { code: 'ireland', name: 'Ireland' },
  23: { code: 'cambodia', name: 'Cambodia' },
  24: { code: 'laos', name: 'Laos' },
  25: { code: 'haiti', name: 'Haiti' },
  26: { code: 'ivorycoast', name: 'Ivory Coast' },
  27: { code: 'gambia', name: 'Gambia' },
  28: { code: 'serbia', name: 'Serbia' },
  29: { code: 'yemen', name: 'Yemen' },
  30: { code: 'southafrica', name: 'South Africa' },
  31: { code: 'romania', name: 'Romania' },
  32: { code: 'colombia', name: 'Colombia' },
  33: { code: 'estonia', name: 'Estonia' },
  34: { code: 'azerbaijan', name: 'Azerbaijan' },
  35: { code: 'canada', name: 'Canada' },
  36: { code: 'morocco', name: 'Morocco' },
  37: { code: 'ghana', name: 'Ghana' },
  38: { code: 'argentina', name: 'Argentina' },
  39: { code: 'uzbekistan', name: 'Uzbekistan' },
  40: { code: 'cameroon', name: 'Cameroon' },
  41: { code: 'chad', name: 'Chad' },
  42: { code: 'germany', name: 'Germany' },
  43: { code: 'lithuania', name: 'Lithuania' },
  44: { code: 'croatia', name: 'Croatia' },
  45: { code: 'sweden', name: 'Sweden' },
  46: { code: 'iraq', name: 'Iraq' },
  47: { code: 'netherlands', name: 'Netherlands' },
  48: { code: 'latvia', name: 'Latvia' },
  49: { code: 'austria', name: 'Austria' },
  50: { code: 'belarus', name: 'Belarus' },
  51: { code: 'thailand', name: 'Thailand' },
  52: { code: 'saudiarabia', name: 'Saudi Arabia' },
  53: { code: 'mexico', name: 'Mexico' },
  54: { code: 'taiwan', name: 'Taiwan' },
  55: { code: 'spain', name: 'Spain' },
  56: { code: 'iran', name: 'Iran' },
  57: { code: 'algeria', name: 'Algeria' },
  58: { code: 'slovenia', name: 'Slovenia' },
  59: { code: 'bangladesh', name: 'Bangladesh' },
  60: { code: 'senegal', name: 'Senegal' },
  61: { code: 'turkey', name: 'Turkey' },
  62: { code: 'czechrepublic', name: 'Czech Republic' },
  63: { code: 'srilanka', name: 'Sri Lanka' },
  64: { code: 'peru', name: 'Peru' },
  65: { code: 'pakistan', name: 'Pakistan' },
  66: { code: 'newzealand', name: 'New Zealand' },
  67: { code: 'guinea', name: 'Guinea' },
  68: { code: 'mali', name: 'Mali' },
  69: { code: 'venezuela', name: 'Venezuela' },
  70: { code: 'ethiopia', name: 'Ethiopia' },
  71: { code: 'mongolia', name: 'Mongolia' },
  72: { code: 'brazil', name: 'Brazil' },
  73: { code: 'afghanistan', name: 'Afghanistan' },
  74: { code: 'uganda', name: 'Uganda' },
  75: { code: 'angola', name: 'Angola' },
  76: { code: 'cyprus', name: 'Cyprus' },
  77: { code: 'france', name: 'France' },
  78: { code: 'papua', name: 'Papua New Guinea' },
  79: { code: 'mozambique', name: 'Mozambique' },
  80: { code: 'nepal', name: 'Nepal' },
  81: { code: 'belgium', name: 'Belgium' },
  82: { code: 'bulgaria', name: 'Bulgaria' },
  83: { code: 'hungary', name: 'Hungary' },
  84: { code: 'moldova', name: 'Moldova' },
  85: { code: 'italy', name: 'Italy' },
  86: { code: 'paraguay', name: 'Paraguay' },
  87: { code: 'honduras', name: 'Honduras' },
  88: { code: 'tunisia', name: 'Tunisia' },
  89: { code: 'nicaragua', name: 'Nicaragua' },
  90: { code: 'timorleste', name: 'Timor-Leste' },
  91: { code: 'bolivia', name: 'Bolivia' },
  92: { code: 'costarica', name: 'Costa Rica' },
  93: { code: 'guatemala', name: 'Guatemala' },
  94: { code: 'uae', name: 'United Arab Emirates' },
  95: { code: 'zimbabwe', name: 'Zimbabwe' },
  96: { code: 'puertorico', name: 'Puerto Rico' },
  97: { code: 'sudan', name: 'Sudan' },
  98: { code: 'togo', name: 'Togo' },
  99: { code: 'kuwait', name: 'Kuwait' },
  100: { code: 'elsalvador', name: 'El Salvador' },
  101: { code: 'libya', name: 'Libya' },
  102: { code: 'jamaica', name: 'Jamaica' },
  103: { code: 'trinidad', name: 'Trinidad and Tobago' },
  104: { code: 'ecuador', name: 'Ecuador' },
  105: { code: 'swaziland', name: 'Swaziland' },
  106: { code: 'oman', name: 'Oman' },
  107: { code: 'bosnia', name: 'Bosnia and Herzegovina' },
  108: { code: 'dominicanrepublic', name: 'Dominican Republic' },
  109: { code: 'syria', name: 'Syria' },
  110: { code: 'qatar', name: 'Qatar' },
  111: { code: 'panama', name: 'Panama' },
  112: { code: 'cuba', name: 'Cuba' },
  113: { code: 'mauritania', name: 'Mauritania' },
  114: { code: 'sierraleone', name: 'Sierra Leone' },
  115: { code: 'jordan', name: 'Jordan' },
  116: { code: 'portugal', name: 'Portugal' },
  117: { code: 'barbados', name: 'Barbados' },
  118: { code: 'burundi', name: 'Burundi' },
  119: { code: 'benin', name: 'Benin' },
  120: { code: 'brunei', name: 'Brunei' },
  121: { code: 'bahamas', name: 'Bahamas' },
  122: { code: 'botswana', name: 'Botswana' },
  123: { code: 'belize', name: 'Belize' },
  124: { code: 'caf', name: 'Central African Republic' },
  125: { code: 'dominica', name: 'Dominica' },
  126: { code: 'grenada', name: 'Grenada' },
  127: { code: 'georgia', name: 'Georgia' },
  128: { code: 'greece', name: 'Greece' },
  129: { code: 'guineabissau', name: 'Guinea-Bissau' },
  130: { code: 'guyana', name: 'Guyana' },
  131: { code: 'iceland', name: 'Iceland' },
  132: { code: 'comoros', name: 'Comoros' },
  133: { code: 'saintkitts', name: 'Saint Kitts and Nevis' },
  134: { code: 'liberia', name: 'Liberia' },
  135: { code: 'lesotho', name: 'Lesotho' },
  136: { code: 'malawi', name: 'Malawi' },
  137: { code: 'namibia', name: 'Namibia' },
  138: { code: 'niger', name: 'Niger' },
  139: { code: 'rwanda', name: 'Rwanda' },
  140: { code: 'slovakia', name: 'Slovakia' },
  141: { code: 'suriname', name: 'Suriname' },
  142: { code: 'tajikistan', name: 'Tajikistan' },
  143: { code: 'monaco', name: 'Monaco' },
  144: { code: 'bahrain', name: 'Bahrain' },
  145: { code: 'reunion', name: 'Reunion' },
  146: { code: 'zambia', name: 'Zambia' },
  147: { code: 'armenia', name: 'Armenia' },
  148: { code: 'somalia', name: 'Somalia' },
  149: { code: 'congo2', name: 'Congo (Brazzaville)' },
  150: { code: 'chile', name: 'Chile' },
  151: { code: 'burkinafaso', name: 'Burkina Faso' },
  152: { code: 'lebanon', name: 'Lebanon' },
  153: { code: 'gabon', name: 'Gabon' },
  154: { code: 'albania', name: 'Albania' },
  155: { code: 'uruguay', name: 'Uruguay' },
  156: { code: 'mauritius', name: 'Mauritius' },
  157: { code: 'bhutan', name: 'Bhutan' },
  158: { code: 'maldives', name: 'Maldives' },
  159: { code: 'guinea2', name: 'Equatorial Guinea' },
  160: { code: 'djibouti', name: 'Djibouti' },
  161: { code: 'antiguabarbuda', name: 'Antigua and Barbuda' },
  162: { code: 'saintlucia', name: 'Saint Lucia' },
  163: { code: 'saintvincent', name: 'Saint Vincent and the Grenadines' },
  164: { code: 'seychelles', name: 'Seychelles' },
  165: { code: 'macau', name: 'Macau' },
  166: { code: 'montenegro', name: 'Montenegro' },
  167: { code: 'northmacedonia', name: 'North Macedonia' },
  168: { code: 'malta', name: 'Malta' },
  169: { code: 'luxembourg', name: 'Luxembourg' },
  170: { code: 'frenchguiana', name: 'French Guiana' },
  171: { code: 'switzerland', name: 'Switzerland' },
  172: { code: 'australia', name: 'Australia' },
  173: { code: 'japan', name: 'Japan' },
  174: { code: 'singapore', name: 'Singapore' },
  175: { code: 'denmark', name: 'Denmark' },
  176: { code: 'finland', name: 'Finland' },
  177: { code: 'norway', name: 'Norway' },
  178: { code: 'southkorea', name: 'South Korea' },
  187: { code: 'usa', name: 'United States' }
}

interface CountryStats {
  code: string
  name: string
  totalServices: number
  totalNumbers: number
  topServices: Array<{ service: string; count: number }>
  lastChecked: string
}

Deno.serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    console.log('🌍 [SYNC-COUNTRIES] Démarrage synchronisation pays...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const apiKey = Deno.env.get('SMS_ACTIVATE_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Pays à scanner (top 20 par popularité)
    const topCountryIds = [
      187, // USA
      4,   // Philippines
      6,   // Indonesia
      22,  // India
      12,  // UK
      0,   // Russia
      36,  // Morocco
      10,  // Vietnam
      78,  // Papua New Guinea
      43,  // Lithuania
      35,  // Canada
      21,  // Ireland
      42,  // Germany
      77,  // France
      72,  // Brazil
      52,  // Saudi Arabia
      94,  // UAE
      61,  // Turkey
      85,  // Italy
      116  // Portugal
    ]

    const countryStats: CountryStats[] = []
    let totalCountriesScanned = 0
    let totalNumbersGlobal = 0

    console.log(`📊 Scanning ${topCountryIds.length} pays...`)

    // Scanner chaque pays
    for (const countryId of topCountryIds) {
      const countryInfo = COUNTRY_MAPPING[countryId]
      if (!countryInfo) {
        console.log(`⚠️  Pays ID ${countryId} non mappé`)
        continue
      }

      try {
        console.log(`🔍 Scanning ${countryInfo.name}...`)

        const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${apiKey}&action=getNumbersStatus&country=${countryId}`
        const response = await fetch(url)
        const data = await response.json()

        if (!data || typeof data !== 'object') {
          console.log(`❌ Pas de données pour ${countryInfo.name}`)
          continue
        }

        // Compter les services et numéros
        let totalNumbers = 0
        let totalServices = 0
        const serviceCounts: Array<{ service: string; count: number }> = []

        for (const [key, value] of Object.entries(data)) {
          const serviceCode = key.includes('_') ? key.split('_')[0] : key
          const count = parseInt(value as string) || 0
          
          if (count > 0) {
            totalNumbers += count
            totalServices++
            serviceCounts.push({ service: serviceCode, count })
          }
        }

        // Top 5 services pour ce pays
        const topServices = serviceCounts
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        countryStats.push({
          code: countryInfo.code,
          name: countryInfo.name,
          totalServices,
          totalNumbers,
          topServices,
          lastChecked: new Date().toISOString()
        })

        totalCountriesScanned++
        totalNumbersGlobal += totalNumbers

        console.log(`✅ ${countryInfo.name}: ${totalServices} services, ${totalNumbers.toLocaleString()} numéros`)

        // Mettre à jour ou insérer le pays dans la DB
        const { error: upsertError } = await supabase
          .from('countries')
          .upsert({
            code: countryInfo.code,
            name: countryInfo.name,
            active: totalNumbers > 0,
            total_services_available: totalServices,
            total_numbers_available: totalNumbers,
            last_sync: new Date().toISOString(),
            metadata: {
              topServices: topServices,
              smsActivateId: countryId
            }
          }, {
            onConflict: 'code'
          })

        if (upsertError) {
          console.error(`❌ Erreur upsert ${countryInfo.name}:`, upsertError)
        }

        // Petit délai pour ne pas surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Erreur scanning ${countryInfo.name}:`, error.message)
      }
    }

    // Logger la synchronisation
    const { error: logError } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'countries',
        status: 'success',
        countries_synced: totalCountriesScanned,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        metadata: {
          totalNumbers: totalNumbersGlobal,
          topCountries: countryStats.slice(0, 10)
        }
      })

    if (logError) {
      console.error('❌ Erreur log:', logError)
    }

    console.log('✅ Synchronisation pays terminée!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Countries synchronized successfully',
        stats: {
          countriesScanned: totalCountriesScanned,
          totalNumbers: totalNumbersGlobal,
          topCountries: countryStats.slice(0, 10)
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('❌ Erreur globale:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
