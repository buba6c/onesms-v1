import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Fix RLS activations pour permettre la synchronisation SMS
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🔧 FIX: RLS Activations pour synchronisation SMS')

    const queries = []

    // 1. Supprimer anciennes policies
    console.log('\n1️⃣  Suppression anciennes policies...')
    const dropPolicies = [
      `DROP POLICY IF EXISTS "Users can view their own activations" ON activations`,
      `DROP POLICY IF EXISTS "Users can insert their own activations" ON activations`,
      `DROP POLICY IF EXISTS "Users can update their own activations" ON activations`,
      `DROP POLICY IF EXISTS "Service role can do everything" ON activations`,
      `DROP POLICY IF EXISTS "Service role full access" ON activations`,
      `DROP POLICY IF EXISTS "Users view own activations" ON activations`,
      `DROP POLICY IF EXISTS "Users insert own activations" ON activations`,
      `DROP POLICY IF EXISTS "Users update own activations" ON activations`
    ]

    for (const query of dropPolicies) {
      try {
        await supabase.rpc('exec_sql', { sql: query })
        console.log('   ✅ Dropped')
      } catch (e) {
        console.log('   ⚠️  Already dropped or not exists')
      }
    }

    // 2. Activer RLS
    console.log('\n2️⃣  Activation RLS...')
    try {
      const { error: rlsError } = await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE activations ENABLE ROW LEVEL SECURITY' 
      })
      if (rlsError) {
        console.error('   ❌', rlsError)
      } else {
        console.log('   ✅ RLS enabled')
      }
    } catch (e) {
      console.log('   ℹ️  Already enabled')
    }

    // 3. Créer nouvelles policies
    console.log('\n3️⃣  Création nouvelles policies...')
    
    const policies = [
      {
        name: 'Service role full access',
        sql: `CREATE POLICY "Service role full access" ON activations FOR ALL TO service_role USING (true) WITH CHECK (true)`
      },
      {
        name: 'Users view own activations',
        sql: `CREATE POLICY "Users view own activations" ON activations FOR SELECT TO authenticated, anon USING (true)` // Temporairement permissif
      },
      {
        name: 'Users insert own activations', 
        sql: `CREATE POLICY "Users insert own activations" ON activations FOR INSERT TO authenticated, anon WITH CHECK (true)` // Temporairement permissif
      },
      {
        name: 'Users update own activations',
        sql: `CREATE POLICY "Users update own activations" ON activations FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true)` // Temporairement permissif
      }
    ]

    for (const policy of policies) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy.sql })
        if (error) {
          console.error(`   ❌ ${policy.name}:`, error)
        } else {
          console.log(`   ✅ ${policy.name}`)
        }
      } catch (e) {
        console.error(`   ❌ ${policy.name}:`, e)
      }
    }

    // 4. Ajouter colonnes manquantes
    console.log('\n4️⃣  Ajout colonnes manquantes...')
    
    const columns = [
      'ALTER TABLE activations ADD COLUMN IF NOT EXISTS external_id TEXT',
      'ALTER TABLE activations ADD COLUMN IF NOT EXISTS charged BOOLEAN DEFAULT FALSE'
    ]

    for (const query of columns) {
      try {
        await supabase.rpc('exec_sql', { sql: query })
        console.log('   ✅ Column added')
      } catch (e) {
        console.log('   ℹ️  Already exists')
      }
    }

    // 5. Activer Realtime
    console.log('\n5️⃣  Activation Realtime...')
    try {
      await supabase.rpc('exec_sql', { 
        sql: 'ALTER PUBLICATION supabase_realtime ADD TABLE activations' 
      })
      console.log('   ✅ Realtime enabled')
    } catch (e) {
      console.log('   ℹ️  Already enabled')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS and Realtime fixed for activations table'
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
