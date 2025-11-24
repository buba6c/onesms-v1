import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Fonction Edge pour calculer automatiquement le popularity_score
 * Basé sur:
 * 1. Stock disponible (40%)
 * 2. Delivery rate moyen (30%)
 * 3. Nombre de commandes réussies (30%)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔄 Calcul des popularity_scores...')

    // 1. Récupérer tous les services actifs
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, code, total_available')
      .eq('active', true)

    if (servicesError) throw servicesError

    console.log(`📊 ${services.length} services à traiter`)

    // 2. Pour chaque service, calculer le score
    const updates = []
    
    for (const service of services) {
      // A. Stock score (0-40 points)
      const maxStock = 3000000 // 3M = max
      const stockScore = Math.min(40, (service.total_available / maxStock) * 40)
      
      // B. Delivery rate moyen (0-30 points)
      const { data: pricingRules } = await supabase
        .from('pricing_rules')
        .select('delivery_rate')
        .eq('service_code', service.code)
        .eq('active', true)
      
      const avgDeliveryRate = pricingRules && pricingRules.length > 0
        ? pricingRules.reduce((sum, r) => sum + (r.delivery_rate || 0), 0) / pricingRules.length
        : 0
      
      const deliveryScore = (avgDeliveryRate / 100) * 30
      
      // C. Nombre de commandes réussies (0-30 points) - derniers 30 jours
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status')
        .eq('service_code', service.code)
        .gte('created_at', thirtyDaysAgo.toISOString())
      
      const successfulOrders = orders?.filter(o => 
        o.status === 'completed' || o.status === 'received'
      ).length || 0
      
      const maxOrders = 1000 // 1000 commandes = score max
      const ordersScore = Math.min(30, (successfulOrders / maxOrders) * 30)
      
      // D. Score final (0-100)
      const popularityScore = Math.round(stockScore + deliveryScore + ordersScore)
      
      updates.push({
        id: service.id,
        code: service.code,
        popularity_score: popularityScore,
        stock_score: Math.round(stockScore),
        delivery_score: Math.round(deliveryScore),
        orders_score: Math.round(ordersScore)
      })
      
      console.log(`   ${service.code.padEnd(15)} | Stock: ${Math.round(stockScore)} + Delivery: ${Math.round(deliveryScore)} + Orders: ${Math.round(ordersScore)} = ${popularityScore}`)
    }

    // 3. Mettre à jour tous les services en batch
    for (const update of updates) {
      await supabase
        .from('services')
        .update({ popularity_score: update.popularity_score })
        .eq('id', update.id)
    }

    console.log(`✅ ${updates.length} services mis à jour`)

    // 4. Top 10
    const top10 = updates.sort((a, b) => b.popularity_score - a.popularity_score).slice(0, 10)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Popularity scores updated for ${updates.length} services`,
        top10: top10.map(u => ({
          code: u.code,
          score: u.popularity_score,
          breakdown: {
            stock: u.stock_score,
            delivery: u.delivery_score,
            orders: u.orders_score
          }
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
