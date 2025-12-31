// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Service code mapping
const SERVICE_CODE_MAP: Record<string, string> = {
  'google': 'go',
  'whatsapp': 'wa',
  'telegram': 'tg',
  'facebook': 'fb',
  'instagram': 'ig',
  'twitter': 'tw',
  'discord': 'ds',
  'microsoft': 'mm',
  'yahoo': 'mb',
  'amazon': 'am',
  'netflix': 'nf',
  'uber': 'ub',
  'tiktok': 'tk',
  'snapchat': 'sn',
  'linkedin': 'ld',
  'viber': 'vi',
  'paypal': 'ts',
  'steam': 'st'
}

// Country code mapping (ISO 2-letter codes to SMS-Activate IDs)
const COUNTRY_CODE_MAP: Record<string, number> = {
  // Par noms complets (legacy)
  'russia': 0, 'ukraine': 1, 'kazakhstan': 2, 'china': 3, 'philippines': 4,
  'myanmar': 5, 'indonesia': 6, 'malaysia': 7, 'kenya': 8, 'tanzania': 9,
  'vietnam': 10, 'kyrgyzstan': 11, 'england': 12, 'israel': 13, 'hongkong': 14,
  'poland': 15, 'egypt': 16, 'nigeria': 17, 'morocco': 19, 'ghana': 20,
  'argentina': 21, 'india': 22, 'uzbekistan': 23, 'cambodia': 24, 'germany': 27,
  'romania': 32, 'colombia': 33, 'canada': 36, 'mexico': 38, 'spain': 40,
  'thailand': 52, 'portugal': 56, 'italy': 58, 'brazil': 45, 'france': 78,
  'australia': 175, 'usa': 187,
  // Par codes ISO 2 lettres (priorité) - COMPLET
  'ru': 0, 'ua': 1, 'kz': 2, 'cn': 3, 'ph': 4,
  'mm': 5, 'id': 6, 'my': 7, 'ke': 8, 'tz': 9,
  'vn': 10, 'kg': 11, 'gb': 12, 'uk': 12, 'il': 13, 'hk': 14,
  'pl': 15, 'eg': 16, 'ng': 17, 'mo': 18, 'ma': 19,
  'gh': 20, 'ar': 21, 'in': 22, 'uz': 23, 'kh': 24,
  'cm': 25, 'td': 26, 'de': 27, 'lt': 28, 'hr': 29,
  'se': 30, 'iq': 31, 'ro': 32, 'co': 33, 'at': 34,
  'by': 35, 'ca': 36, 'sa': 37, 'mx': 38, 'za': 39,
  'es': 40, 'ir': 41, 'dz': 42, 'nl': 43, 'bd': 44,
  'br': 45, 'tr': 46, 'jp': 47, 'kr': 48, 'tw': 49,
  'sg': 50, 'ae': 51, 'th': 52, 'pk': 53, 'np': 54,
  'lk': 55, 'pt': 56, 'nz': 57, 'it': 58, 'be': 59,
  'ch': 60, 'gr': 61, 'cz': 62, 'hu': 63, 'dk': 64,
  'no': 65, 'fi': 66, 'ie': 67, 'sk': 68, 'bg': 69,
  'rs': 70, 'si': 71, 'mk': 72, 'pe': 73, 'cl': 74,
  'ec': 75, 've': 76, 'bo': 77, 'fr': 78, 'py': 79, 'uy': 80,
  'cr': 81, 'pa': 82, 'do': 83, 'sv': 84, 'gt': 85,
  'hn': 86, 'ni': 87, 'cu': 88, 'ht': 89, 'jm': 90,
  'tt': 91, 'pr': 92, 'bb': 93, 'bs': 94,
  'af': 108, 'la': 117, 'sd': 129, 'jo': 141, 'ps': 163,
  'bh': 165, 'et': 172, 'au': 175, 'us': 187
}

const mapServiceCode = (code: string): string => {
  return SERVICE_CODE_MAP[code.toLowerCase()] || code
}

const mapCountryCode = (country: string | number): number => {
  // Accepte soit un code ISO (string), soit un ID numérique déjà prêt
  if (typeof country === 'number') {
    return Number.isFinite(country) ? country : 2
  }
  const trimmed = (country || '').toString().trim().toLowerCase()
  if (!trimmed) return 2
  // Si on reçoit un code numérique sous forme de string, on le renvoie directement
  const maybeNum = Number(trimmed)
  if (!Number.isNaN(maybeNum)) return maybeNum
  return COUNTRY_CODE_MAP[trimmed] ?? 2 // Default: Kazakhstan (2)
}

// Normalise la date de fin retournée par SMS-Activate (string, seconds, ms) vers un ISO UTC
const normalizeEndDate = (raw: unknown, rentTimeHours: number): string => {
  const now = Date.now()
  const expectedMs = rentTimeHours * 3600 * 1000
  const fallback = () => new Date(now + expectedMs).toISOString()

  const coerce = (val: number | string): number | null => {
    if (typeof val === 'number') {
      const ts = val < 1e12 ? val * 1000 : val
      return Number.isFinite(ts) ? ts : null
    }
    if (typeof val === 'string') {
      const trimmed = val.trim()
      // Priorité: date/time brute "YYYY-MM-DD HH:mm:ss" => ne PAS ajouter de fuseau, on la parse comme locale puis on la remet en ISO UTC
      const isoish = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T')
      const parsedLocal = Date.parse(isoish)
      if (!Number.isNaN(parsedLocal)) return parsedLocal
      const num = Number(trimmed)
      if (!Number.isNaN(num)) {
        const ts = num < 1e12 ? num * 1000 : num
        return Number.isFinite(ts) ? ts : null
      }
    }
    return null
  }

  const parsed = coerce(raw)
  if (parsed === null) return fallback()

  // Si l'écart est trop loin de la durée attendue (> 45 min), on force la durée nominale
  const delta = parsed - now
  if (Math.abs(delta - expectedMs) > 45 * 60 * 1000) {
    return fallback()
  }

  return new Date(parsed).toISOString()
}

// Rent duration in hours
const RENT_DURATIONS: Record<string, number> = {
  '4hours': 4,
  '1day': 24,
  '1week': 168,
  '1month': 720
}

serve(async (req) => {
  console.log('🚀 [BUY-RENT] Function called')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''

    // Admin client with SERVICE_ROLE_KEY for all operations (bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Extract and verify user from JWT token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized - No token provided')
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('❌ [BUY-RENT] Auth error:', authError?.message)
      throw new Error('Unauthorized')
    }

    const { country, product, userId, duration = '4hours', expectedPrice } = await req.json()

    console.log('📞 [BUY-RENT] Request:', { country, product, userId, duration, expectedPrice })

    // 1. Get service from database (skip for universal service "full")
    let service = null
    let serviceName = product
    
    if (product !== 'full') {
      const { data: serviceData, error: serviceError } = await supabaseAdmin
        .from('services')
        .select('*')
        .eq('code', product)
        .single()

      if (serviceError || !serviceData) {
        console.warn(`⚠️ [BUY-RENT] Service ${product} not found in DB, will use as-is for API`)
      } else {
        service = serviceData
        serviceName = serviceData.name
      }
    } else {
      console.log(`🔄 [BUY-RENT] Using universal service: full`)
      serviceName = 'Full rent'
    }

    const smsActivateService = product === 'full' ? product : mapServiceCode(product)
    const smsActivateCountry = mapCountryCode(country)
    const rentTime = RENT_DURATIONS[duration] || 4

    // 2. Get available rent services and find best price
    console.log('💰 [BUY-RENT] Checking available rent options...')
    const servicesUrl = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getRentServicesAndCountries&country=${smsActivateCountry}&rent_time=${rentTime}`
    
    const servicesResponse = await fetch(servicesUrl)
    const servicesData = await servicesResponse.json()
    
    console.log('💰 [BUY-RENT] Available services:', servicesData)
    
    // Find price for the requested service
    let price = 0
    let actualService = smsActivateService
    
    if (servicesData.services && servicesData.services[smsActivateService]) {
      price = servicesData.services[smsActivateService].cost || 0
      console.log(`✅ [BUY-RENT] Service ${smsActivateService} found: ${price}`)
    } else {
      // Fallback vers "full" (service universel) si le service spécifique n'existe pas
      console.warn(`⚠️ [BUY-RENT] Service ${smsActivateService} not available, trying fallback to 'full'...`)
      
      if (servicesData.services && servicesData.services['full']) {
        price = servicesData.services['full'].cost || 0
        actualService = 'full'
        console.log(`🔄 [BUY-RENT] Fallback to 'full' service: ${price}`)
      }
    }
    
    // ✅ Utiliser le prix attendu du frontend si fourni (garantit la cohérence d'affichage)
    if (expectedPrice && expectedPrice > 0) {
      console.log(`💰 [BUY-RENT] Using expectedPrice from frontend: ${expectedPrice} (API was: ${price})`)
      price = expectedPrice
    }
    
    if (!price || price <= 0) {
      throw new Error(`Rent not available for ${serviceName} in ${country} for ${duration}. No service found (tried: ${smsActivateService}, full)`)
    }

    console.log(`💰 [BUY-RENT] Final rent price: $${price} for ${rentTime} hours using service: ${actualService}`)

    // 3. Check user balance
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('balance, frozen_balance')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    if (userProfile.balance < price) {
      throw new Error(`Insufficient balance. Required: ${price}Ⓐ, Available: ${userProfile.balance}Ⓐ`)
    }

    // 4. Rent number from SMS-Activate (operator selected automatically by API)
    const rentParams = new URLSearchParams({
      api_key: SMS_ACTIVATE_API_KEY!,
      action: 'getRentNumber',
      service: actualService,
      country: smsActivateCountry.toString(),
      rent_time: rentTime.toString()
    })

    const rentUrl = `${SMS_ACTIVATE_BASE_URL}?${rentParams.toString()}`
    console.log('🌐 [BUY-RENT] API Call:', rentUrl.replace(SMS_ACTIVATE_API_KEY!, 'KEY_HIDDEN'))

    const rentResponse = await fetch(rentUrl)
    const rentData = await rentResponse.json()

    console.log('📥 [BUY-RENT] API Response:', rentData)

    if (rentData.status !== 'success' || !rentData.phone) {
      // Handle specific error messages
      if (rentData.message === 'NO_BALANCE') {
        throw new Error('Solde insuffisant sur SMS-Activate. Veuillez recharger votre compte sur sms-activate.org')
      } else if (rentData.message === 'NO_NUMBERS') {
        throw new Error(`Aucun numéro disponible pour ${serviceName} dans ce pays actuellement. Réessayez plus tard.`)
      }
      throw new Error(rentData.message || rentData.errorMsg || 'Failed to rent number')
    }

    const {
      phone: { id: rentId, number: phone, endDate }
    } = rentData

    const normalizedEndDate = normalizeEndDate(endDate, rentTime)

    console.log('📞 [BUY-RENT] Number rented:', {
      rentId,
      phone,
      endDate,
      price,
      duration: rentTime
    })

    // 5. Create rental record (avec frozen_amount=0 initialement, sera mis à jour par secure_freeze_balance)
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .insert({
        user_id: userId,
        rent_id: rentId.toString(),
        rental_id: rentId.toString(), // Duplicate for compatibility
        phone: phone,
        service_code: product,
        country_code: country,
        operator: 'auto', // SMS-Activate selects automatically
        total_cost: price,
        hourly_rate: price / rentTime,
        status: 'active',
        end_date: normalizedEndDate,
        expires_at: normalizedEndDate, // Duplicate for compatibility
        rent_hours: rentTime,
        duration_hours: rentTime, // Duplicate for compatibility
        provider: 'sms-activate',
        message_count: 0,
        frozen_amount: 0  // ✅ Sera mis à jour atomiquement par secure_freeze_balance
      })
      .select()
      .single()

    if (rentalError) {
      console.error('❌ [BUY-RENT] Failed to create rental:', rentalError)
      
      // Try to cancel on SMS-Activate
      try {
        await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${rentId}&status=2`)
      } catch (e) {
        console.error('Failed to cancel rent on SMS-Activate:', e)
      }
      
      throw new Error(`Failed to create rental record: ${rentalError.message}`)
    }
    
    // DIAGNOSTIC: Vérifier que toutes les colonnes critiques sont bien insérées
    console.log('✅ [BUY-RENT] Rental créé avec succès:', {
      id: rental.id,
      user_id: rental.user_id,
      rental_id: rental.rental_id,
      phone: rental.phone,
      service_code: rental.service_code,
      country_code: rental.country_code,
      status: rental.status,
      expires_at: rental.expires_at,
      duration_hours: rental.duration_hours
    })

    // 6. ✅ Freeze atomique via secure_freeze_balance (vérifie available balance et fait ledger+update atomiquement)
    const { data: freezeResult, error: freezeError } = await supabaseAdmin.rpc('secure_freeze_balance', {
      p_user_id: userId,
      p_amount: price,
      p_rental_id: rental.id,
      p_reason: `Freeze for rent ${serviceName} ${country} (${duration})`
    })

    if (freezeError || !freezeResult?.success) {
      console.error('❌ [BUY-RENT] secure_freeze_balance failed:', freezeError || freezeResult)
      // Rollback: Cancel rent on SMS-Activate
      try {
        await fetch(`${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=setRentStatus&id=${rentId}&status=2`)
      } catch (e) {
        console.error('Failed to cancel rent on SMS-Activate after freeze failure:', e)
      }
      // Delete the rental record we just created
      await supabaseAdmin.from('rentals').delete().eq('id', rental.id)
      throw new Error(freezeResult?.error || freezeError?.message || 'Failed to freeze balance')
    }
    
    console.log('✅ [BUY-RENT] Balance frozen via secure_freeze_balance:', freezeResult)

    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'rental',
        amount: -price,
        description: `Rent ${serviceName} in ${country} for ${duration}`,
        status: 'pending',
        related_rental_id: rental.id,
        balance_before: userProfile.balance,
        balance_after: userProfile.balance
      })

    if (transactionError) {
      console.error('❌ [BUY-RENT] Failed to create transaction:', transactionError)
    }

    console.log('✅ [BUY-RENT] Success:', {
      id: rental.id,
      phone,
      price,
      duration: rentTime
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: rental.id,
          rental_id: rentId,
          rent_id: rentId, // Compatibility
          phone: phone,
          service: product,
          country: country,
          price: price,
          total_cost: price,
          status: 'active',
          expires: normalizedEndDate,
          end_date: normalizedEndDate,
          duration_hours: rentTime,
          rent_hours: rentTime
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [BUY-RENT] Error:', error)
    console.error('❌ [BUY-RENT] Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || String(error),
        details: error.stack || error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
