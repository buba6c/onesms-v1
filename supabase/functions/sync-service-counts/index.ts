import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMS_ACTIVATE_BASE_URL = 'https://hero-sms.com/stubs/handler_api.php'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Récupérer les variables d'environnement avec logging
    const SMS_ACTIVATE_API_KEY = Deno.env.get('SMS_ACTIVATE_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('🔄 [SYNC-COUNTS] Démarrage...')
    console.log(`📝 [SYNC-COUNTS] SMS_ACTIVATE_API_KEY: ${SMS_ACTIVATE_API_KEY ? 'OK' : 'MISSING'}`)
    console.log(`📝 [SYNC-COUNTS] SUPABASE_URL: ${SUPABASE_URL ? 'OK' : 'MISSING'}`)
    console.log(`📝 [SYNC-COUNTS] SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING'}`)
    
    if (!SMS_ACTIVATE_API_KEY) {
      throw new Error('SMS_ACTIVATE_API_KEY is not configured')
    }
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not available')
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    console.log('🔄 [SYNC-COUNTS] Démarrage de la synchronisation des counts...')
    
    // ============================================================================
    // MÉTHODE OPTIMISÉE: Utiliser getPrices sans paramètre country
    // Retourne TOUS les pays avec leurs quantités en une seule requête
    // Format: {"Country":{"Service":{"cost":"X","count":"Y"}}}
    // ============================================================================
    
    const url = `${SMS_ACTIVATE_BASE_URL}?api_key=${SMS_ACTIVATE_API_KEY}&action=getPrices`
    console.log('📡 [SYNC-COUNTS] Fetching ALL countries prices...')
    
    const response = await fetch(url)
    const allPricesData = await response.json()
    
    if (!allPricesData || typeof allPricesData !== 'object') {
      throw new Error('Invalid response from getPrices API')
    }
    
    // Compter le nombre de pays retournés
    const countryIds = Object.keys(allPricesData)
    console.log(`✅ [SYNC-COUNTS] Received data for ${countryIds.length} countries`)
    
    // ============================================================================
    // Agréger les compteurs par service (SOMME de tous les pays)
    // ============================================================================
    const totalCounts: Record<string, number> = {}
    let totalCountries = 0
    
    for (const [countryId, countryServices] of Object.entries(allPricesData)) {
      if (!countryServices || typeof countryServices !== 'object') continue
      totalCountries++
      
      for (const [serviceCode, serviceData] of Object.entries(countryServices as Record<string, any>)) {
        // serviceData format: { cost: "0.50", count: 100, physicalCount: 50 }
        let count = 0
        
        if (typeof serviceData === 'object' && serviceData !== null) {
          // Utiliser 'count' qui représente le nombre de numéros disponibles
          count = parseInt(serviceData.count) || 0
        } else if (typeof serviceData === 'number') {
          count = serviceData
        }
        
        if (count > 0) {
          totalCounts[serviceCode] = (totalCounts[serviceCode] || 0) + count
        }
      }
    }
    
    console.log(`📊 [SYNC-COUNTS] Aggregated counts for ${Object.keys(totalCounts).length} services from ${totalCountries} countries`)
    
    // Afficher quelques exemples
    const topServices = Object.entries(totalCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    console.log('📊 [SYNC-COUNTS] Top 10 services by count:', topServices)
    
    // ============================================================================
    // Update services.total_available - UPDATE INDIVIDUEL pour chaque service
    // ============================================================================
    let updatedCount = 0
    let errorCount = 0
    
    // Update par batch de 50 pour éviter les timeouts
    const serviceCodes = Object.keys(totalCounts)
    console.log(`📊 [SYNC-COUNTS] Updating ${serviceCodes.length} services with real totals`)
    
    for (const serviceCode of serviceCodes) {
      const count = totalCounts[serviceCode]
      
      const { error: updateError } = await supabase
        .from('services')
        .update({ 
          total_available: count,
          updated_at: new Date().toISOString()
        })
        .eq('code', serviceCode)
      
      if (updateError) {
        errorCount++
        // Log only first few errors
        if (errorCount <= 5) {
          console.error(`❌ [SYNC-COUNTS] Update error for ${serviceCode}:`, updateError.message)
        }
      } else {
        updatedCount++
      }
    }
    
    console.log(`✅ [SYNC-COUNTS] Updated ${updatedCount} services, ${errorCount} errors`)
    
    // Log dans sync_logs
    const { error: logError } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'services',
        status: 'success',
        services_synced: updatedCount,
        countries_synced: totalCountries,
        prices_synced: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        triggered_by: 'cron'
      })
    
    if (logError) {
      console.warn('⚠️ [SYNC-COUNTS] Log error:', logError)
    }
    
    // Calculer le total global
    const grandTotal = Object.values(totalCounts).reduce((sum, n) => sum + n, 0)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Service counts updated successfully (ALL countries aggregated)',
        stats: {
          services: updatedCount,
          countries: totalCountries,
          totalNumbers: grandTotal
        },
        topServices: topServices,
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
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
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
      }
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
