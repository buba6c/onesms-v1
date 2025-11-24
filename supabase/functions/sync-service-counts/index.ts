import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://api.sms-activate.ae/stubs/handler_api.php'
const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')!

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔄 [SYNC-COUNTS] Démarrage de la synchronisation des counts...')
    
    // TOP pays à scanner (USA, Philippines, Indonesia, India, England)
    const topCountries = [187, 4, 6, 22, 12]
    
    // Scanner tous les pays en parallèle
    const results = await Promise.all(
      topCountries.map(async (countryId: number) => {
        try {
          const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getNumbersStatus&country=${countryId}`
          const response = await fetch(url)
          const data = await response.json()
          
          console.log(`✅ [SYNC-COUNTS] Country ${countryId}: ${Object.keys(data).length} services`)
          
          return { countryId, data }
        } catch (error) {
          console.error(`❌ [SYNC-COUNTS] Error country ${countryId}:`, error)
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
    
    console.log(`📊 [SYNC-COUNTS] Total counts:`, Object.keys(totalCounts).length, 'services')
    
    // Update services.total_available en BATCH
    let updatedCount = 0
    const updates = []
    
    for (const [serviceCode, count] of Object.entries(totalCounts)) {
      updates.push({
        code: serviceCode,
        total_available: count,
        updated_at: new Date().toISOString()
      })
    }
    
    // BATCH UPDATE (upsert pour créer si n'existe pas)
    if (updates.length > 0) {
      const { error: updateError } = await supabase
        .from('services')
        .upsert(updates, { 
          onConflict: 'code',
          ignoreDuplicates: false 
        })
      
      if (updateError) {
        console.error('❌ [SYNC-COUNTS] Update error:', updateError)
        throw updateError
      }
      
      updatedCount = updates.length
      console.log(`✅ [SYNC-COUNTS] Updated ${updatedCount} services`)
    }
    
    // Log dans sync_logs
    const { error: logError } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'services',
        status: 'success',
        services_synced: updatedCount,
        countries_synced: topCountries.length,
        prices_synced: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        triggered_by: 'cron'
      })
    
    if (logError) {
      console.warn('⚠️ [SYNC-COUNTS] Log error:', logError)
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Service counts updated successfully',
        stats: {
          services: updatedCount,
          countries: topCountries.length,
          totalNumbers: Object.values(totalCounts).reduce((sum, n) => sum + n, 0)
        },
        counts: totalCounts
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('❌ [SYNC-COUNTS] Error:', error)
    
    // Log error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      await supabase.from('sync_logs').insert({
        sync_type: 'services',
        status: 'error',
        services_synced: 0,
        countries_synced: 0,
        prices_synced: 0,
        error_message: error instanceof Error ? error.message : String(error),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        triggered_by: 'cron'
      })
    } catch (logErr) {
      console.error('Failed to log error:', logErr)
    }
    
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
