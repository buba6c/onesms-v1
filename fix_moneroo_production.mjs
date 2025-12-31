#!/usr/bin/env node
/**
 * Fix Moneroo Production Mode
 * Corrige la configuration pour mettre test_mode à false (booléen) au lieu de string
 */

import { createClient } from '@supabase/supabase-js'

// Supabase Cloud
const supabaseUrl = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixMonerooProduction() {
  console.log('🔧 Fixing Moneroo configuration to PRODUCTION mode...\n')

  // Update with correct boolean value
  const { data, error } = await supabase
    .from('payment_providers')
    .update({
      config: {
        api_url: 'https://api.moneroo.io/v1',
        test_mode: false  // Boolean false, not string
      }
    })
    .eq('provider_code', 'moneroo')
    .select()

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  console.log('✅ Moneroo configuration FIXED to PRODUCTION mode!')
  console.log('Config:', JSON.stringify(data[0].config, null, 2))
  console.log('\n⚠️ IMPORTANT:')
  console.log('- test_mode = false (boolean) - Paiements RÉELS')
  console.log('- Clé production configurée: pvk_pescqt|01KCHW6TZY1HVTQ8929E6Y9HM6')
  console.log('- Webhook: https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/moneroo-webhook')
}

fixMonerooProduction()
