import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Fix manuel pour Badoo et Tinder
 * Les rend visibles dans le Dashboard avec le bon nom et catégorie
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔧 FIX: Badoo & Tinder')

    // 1. Corriger Badoo
    console.log('\n1️⃣  Badoo (code: badoo)...')
    const { error: badooError } = await supabase
      .from('services')
      .update({
        name: 'Badoo',
        category: 'dating',
        popularity_score: 850,
        updated_at: new Date().toISOString()
      })
      .eq('code', 'badoo')
    
    if (badooError) {
      console.error('   ❌', badooError)
    } else {
      console.log('   ✅ Badoo mis à jour')
    }

    // 2. Corriger Tinder
    console.log('\n2️⃣  Tinder (code: tinder)...')
    const { error: tinderError } = await supabase
      .from('services')
      .update({
        name: 'Tinder',
        category: 'dating',
        popularity_score: 900,
        updated_at: new Date().toISOString()
      })
      .eq('code', 'tinder')
    
    if (tinderError) {
      console.error('   ❌', tinderError)
    } else {
      console.log('   ✅ Tinder mis à jour')
    }

    // 3. Désactiver les doublons (qv, oi)
    console.log('\n3️⃣  Désactivation doublons (qv, oi)...')
    const { error: dupError } = await supabase
      .from('services')
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .in('code', ['qv', 'oi'])
    
    if (dupError) {
      console.error('   ❌', dupError)
    } else {
      console.log('   ✅ Doublons désactivés')
    }

    // 4. Vérification
    console.log('\n📊 VÉRIFICATION:')
    const { data: verification } = await supabase
      .from('services')
      .select('code, name, active, total_available, category, popularity_score')
      .in('code', ['badoo', 'tinder', 'qv', 'oi'])
      .order('popularity_score', { ascending: false })
    
    const results = verification?.map(s => ({
      code: s.code,
      name: s.name,
      active: s.active,
      total_available: s.total_available,
      category: s.category,
      popularity_score: s.popularity_score,
      visible: s.active && s.total_available > 0 ? '✅' : '❌'
    })) || []

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Badoo & Tinder fixed',
        results
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
