import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Fonction Edge pour calculer les vrais success_rate des pays
 * Basé sur l'historique réel des activations
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔄 Calcul des success_rates réels...')

    // 1. Récupérer tous les pays actifs
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('id, code, name')
      .eq('active', true)

    if (countriesError) throw countriesError

    console.log(`🌍 ${countries.length} pays à traiter`)

    // 2. Pour chaque pays, calculer le taux de succès réel depuis les orders
    const updates = []
    
    for (const country of countries) {
      // A. Nombre total d'activations pour ce pays (derniers 90 jours)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status')
        .eq('country_code', country.code)
        .gte('created_at', ninetyDaysAgo.toISOString())
      
      const totalOrders = orders?.length || 0
      
      if (totalOrders === 0) {
        // Pas de données historiques, utiliser delivery_rate moyen des pricing_rules
        const { data: pricingRules } = await supabase
          .from('pricing_rules')
          .select('delivery_rate')
          .eq('country_code', country.code)
          .eq('active', true)
        
        const avgDeliveryRate = pricingRules && pricingRules.length > 0
          ? pricingRules.reduce((sum, r) => sum + (r.delivery_rate || 0), 0) / pricingRules.length
          : 85.0 // Valeur par défaut conservative
        
        updates.push({
          id: country.id,
          code: country.code,
          name: country.name,
          success_rate: Math.round(avgDeliveryRate * 10) / 10,
          based_on: 'pricing_rules',
          sample_size: pricingRules?.length || 0
        })
        continue
      }
      
      // B. Calculer le taux de succès réel
      const successfulOrders = orders.filter(o => 
        o.status === 'completed' || o.status === 'received'
      ).length
      
      const successRate = (successfulOrders / totalOrders) * 100
      
      updates.push({
        id: country.id,
        code: country.code,
        name: country.name,
        success_rate: Math.round(successRate * 10) / 10,
        based_on: 'real_orders',
        sample_size: totalOrders
      })
      
      console.log(`   ${country.code.padEnd(5)} | ${country.name.padEnd(20)} | ${successfulOrders}/${totalOrders} = ${Math.round(successRate)}%`)
    }

    // 3. Mettre à jour tous les pays
    for (const update of updates) {
      await supabase
        .from('countries')
        .update({ success_rate: update.success_rate })
        .eq('id', update.id)
    }

    console.log(`✅ ${updates.length} pays mis à jour`)

    // 4. Top et Bottom 5
    const sorted = updates.sort((a, b) => b.success_rate - a.success_rate)
    const top5 = sorted.slice(0, 5)
    const bottom5 = sorted.slice(-5).reverse()
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Success rates updated for ${updates.length} countries`,
        stats: {
          total_countries: updates.length,
          with_real_data: updates.filter(u => u.based_on === 'real_orders').length,
          with_estimated_data: updates.filter(u => u.based_on === 'pricing_rules').length,
          average_success_rate: Math.round(updates.reduce((sum, u) => sum + u.success_rate, 0) / updates.length)
        },
        top5: top5.map(u => ({
          code: u.code,
          name: u.name,
          success_rate: u.success_rate,
          sample_size: u.sample_size,
          based_on: u.based_on
        })),
        bottom5: bottom5.map(u => ({
          code: u.code,
          name: u.name,
          success_rate: u.success_rate,
          sample_size: u.sample_size,
          based_on: u.based_on
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
