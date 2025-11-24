import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'

// Mapping intelligent des codes de services vers leurs noms réels
const SERVICE_NAMES: Record<string, string> = {
  // Services populaires
  wa: 'WhatsApp',
  tg: 'Telegram',
  fb: 'Facebook',
  ig: 'Instagram',
  go: 'Google',
  tw: 'Twitter/X',
  vk: 'VKontakte',
  ok: 'Odnoklassniki',
  vi: 'Viber',
  we: 'WeChat',
  lf: 'Line',
  ka: 'KakaoTalk',
  ma: 'Mail.ru',
  ya: 'Yandex',
  uk: 'Uber',
  bl: 'Blizzard',
  am: 'Amazon',
  ms: 'Microsoft',
  ap: 'Apple',
  yx: 'Yandex Taxi',
  wx: 'Wechat',
  sn: 'Snapchat',
  li: 'LinkedIn',
  ne: 'Netflix',
  sp: 'Spotify',
  ti: 'TikTok',
  dr: 'Discord',
  tc: 'Tencent',
  ai: 'Airbnb',
  bo: 'Booking.com',
  
  // Services crypto
  bc: 'Blockchain',
  bn: 'Binance',
  
  // Services de livraison
  um: 'Uber Eats',
  dd: 'DoorDash',
  
  // Autres services populaires
  pm: 'PayPal',
  sf: 'Salesforce',
  dp: 'Depop',
  et: 'Etsy',
  of: 'OnlyFans',
  rd: 'Reddit',
  tu: 'Tumblr',
  pn: 'Pinterest',
  mt: 'Match',
  tn: 'Tinder',
  bm: 'Badoo',
  gr: 'Grindr',
  sk: 'Skype',
  ds: 'Discord',
  tw: 'Twitch',
  yo: 'YouTube',
  zo: 'Zoom',
  sl: 'Slack',
  tr: 'Trello',
  gh: 'GitHub',
  gl: 'GitLab',
  bb: 'Bitbucket',
}

const CATEGORY_MAP: Record<string, string> = {
  // Social
  wa: 'social', tg: 'social', fb: 'social', ig: 'social', tw: 'social',
  vk: 'social', ok: 'social', sn: 'social', li: 'social', rd: 'social',
  tu: 'social', pn: 'social',
  
  // Messaging
  vi: 'messaging', we: 'messaging', lf: 'messaging', ka: 'messaging',
  sk: 'messaging', ds: 'messaging', sl: 'messaging',
  
  // Dating
  tn: 'dating', mt: 'dating', bm: 'dating', gr: 'dating',
  
  // Shopping
  am: 'shopping', et: 'shopping', dp: 'shopping',
  
  // Transport
  uk: 'transport', yx: 'transport', um: 'delivery', dd: 'delivery',
  
  // Finance
  pm: 'finance', bc: 'crypto', bn: 'crypto',
  
  // Entertainment
  ne: 'entertainment', sp: 'entertainment', ti: 'entertainment',
  yo: 'entertainment', tw: 'entertainment',
  
  // Travel
  ai: 'travel', bo: 'travel',
  
  // Tech
  go: 'tech', ms: 'tech', ap: 'tech', ya: 'tech', ma: 'tech',
  gh: 'tech', gl: 'tech', bb: 'tech',
  
  // Gaming
  bl: 'gaming', tc: 'gaming',
  
  // Other
  of: 'adult', zo: 'productivity', tr: 'productivity', sf: 'business',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('🔄 [SYNC-ALL] Démarrage de la synchronisation complète des services...')
    
    if (!SMS_ACTIVATE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Scanner les TOP 10 pays pour avoir une vue complète
    const topCountries = [187, 4, 6, 22, 12, 0, 36, 10, 78, 43]
    
    console.log(`📡 [SYNC-ALL] Scanning ${topCountries.length} countries...`)
    
    const results = await Promise.all(
      topCountries.map(async (countryId: number) => {
        try {
          const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumbersStatus&country=${countryId}`
          const response = await fetch(url)
          const data = await response.json()
          
          console.log(`✅ [SYNC-ALL] Country ${countryId}: ${Object.keys(data).length} services`)
          return { countryId, data }
        } catch (error) {
          console.error(`❌ [SYNC-ALL] Error country ${countryId}:`, error)
          return { countryId, data: {} }
        }
      })
    )
    
    // Collecter tous les codes de services uniques
    const allServiceCodes = new Set<string>()
    const serviceCounts: Record<string, number> = {}
    
    for (const { data } of results) {
      for (const [key, value] of Object.entries(data)) {
        const serviceCode = key.includes('_') ? key.split('_')[0] : key
        allServiceCodes.add(serviceCode)
        
        let count = 0
        if (typeof value === 'string') {
          count = parseInt(value) || 0
        } else if (typeof value === 'object' && value !== null) {
          count = parseInt((value as any).count || 0)
        }
        
        if (count > 0) {
          serviceCounts[serviceCode] = (serviceCounts[serviceCode] || 0) + count
        }
      }
    }
    
    console.log(`📊 [SYNC-ALL] Found ${allServiceCodes.size} unique services`)
    
    // Récupérer les services existants
    const { data: existingServices } = await supabase
      .from('services')
      .select('code')
    
    const existingCodes = new Set(existingServices?.map(s => s.code) || [])
    
    // Préparer les nouveaux services à ajouter
    const newServices = []
    const updateServices = []
    
    for (const code of allServiceCodes) {
      const name = SERVICE_NAMES[code] || code.toUpperCase()
      const category = CATEGORY_MAP[code] || 'other'
      const count = serviceCounts[code] || 0
      
      const serviceData = {
        code,
        name,
        display_name: name,
        category,
        icon: '📱',
        active: true,
        total_available: count,
        popularity_score: count > 100000 ? 5 : count > 50000 ? 4 : count > 10000 ? 3 : count > 1000 ? 2 : 1,
        updated_at: new Date().toISOString(),
        provider: 'sms-activate'
      }
      
      if (existingCodes.has(code)) {
        updateServices.push(serviceData)
      } else {
        newServices.push(serviceData)
      }
    }
    
    console.log(`➕ [SYNC-ALL] New services to add: ${newServices.length}`)
    console.log(`🔄 [SYNC-ALL] Existing services to update: ${updateServices.length}`)
    
    // Insérer les nouveaux services
    let insertedCount = 0
    if (newServices.length > 0) {
      // Batch insert par groupe de 100
      for (let i = 0; i < newServices.length; i += 100) {
        const batch = newServices.slice(i, i + 100)
        const { error: insertError } = await supabase
          .from('services')
          .insert(batch)
        
        if (insertError) {
          console.error(`❌ [SYNC-ALL] Insert error (batch ${i}):`, insertError)
        } else {
          insertedCount += batch.length
          console.log(`✅ [SYNC-ALL] Inserted batch ${i / 100 + 1}: ${batch.length} services`)
        }
      }
    }
    
    // Mettre à jour les services existants
    let updatedCount = 0
    if (updateServices.length > 0) {
      // Batch update par groupe de 100
      for (let i = 0; i < updateServices.length; i += 100) {
        const batch = updateServices.slice(i, i + 100)
        const { error: updateError } = await supabase
          .from('services')
          .upsert(batch, { 
            onConflict: 'code',
            ignoreDuplicates: false 
          })
        
        if (updateError) {
          console.error(`❌ [SYNC-ALL] Update error (batch ${i}):`, updateError)
        } else {
          updatedCount += batch.length
          console.log(`✅ [SYNC-ALL] Updated batch ${i / 100 + 1}: ${batch.length} services`)
        }
      }
    }
    
    // Log de la synchronisation
    await supabase.from('sync_logs').insert({
      sync_type: 'services_complete',
      status: 'success',
      services_synced: insertedCount + updatedCount,
      countries_synced: topCountries.length,
      prices_synced: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      triggered_by: 'manual',
      metadata: {
        new_services: insertedCount,
        updated_services: updatedCount,
        total_services: allServiceCodes.size,
        total_numbers: Object.values(serviceCounts).reduce((sum, n) => sum + n, 0)
      }
    })
    
    console.log(`🎉 [SYNC-ALL] Synchronization complete!`)
    console.log(`   - New services added: ${insertedCount}`)
    console.log(`   - Services updated: ${updatedCount}`)
    console.log(`   - Total services: ${allServiceCodes.size}`)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'All services synchronized successfully',
        stats: {
          totalServices: allServiceCodes.size,
          newServices: insertedCount,
          updatedServices: updatedCount,
          countries: topCountries.length,
          totalNumbers: Object.values(serviceCounts).reduce((sum, n) => sum + n, 0)
        },
        topServices: Object.entries(serviceCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([code, count]) => ({
            code,
            name: SERVICE_NAMES[code] || code.toUpperCase(),
            count
          }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('❌ [SYNC-ALL] Error:', error)
    
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
