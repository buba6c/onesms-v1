#!/usr/bin/env node
/**
 * Simulation du comportement de loggedFetch()
 * pour diagnostiquer pourquoi les logs ne sont pas créés
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

console.log('🧪 Test simulation loggedFetch()\n')
console.log('🔐 Configuration:')
console.log(`   URL: ${SUPABASE_URL}`)
console.log(`   KEY: ${SERVICE_ROLE_KEY?.substring(0, 30)}...`)

if (!SERVICE_ROLE_KEY) {
  console.log('\n❌ SUPABASE_SERVICE_ROLE_KEY_LOCAL not found in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

console.log('\n💾 Test 1: Direct INSERT into logs_provider')

const testLog = {
  provider: 'sms-activate',
  action: 'TEST_NODE_SIMULATION',
  request_url: 'https://test-node.com',
  request_params: { test: 'simulation' },
  response_status: 200,
  response_body: 'Test from Node.js simulation',
  response_time_ms: 123,
  user_id: null,
  activation_id: null,
  rental_id: null,
  error_message: null,
  created_at: new Date().toISOString()
}

const { data, error } = await supabase
  .from('logs_provider')
  .insert(testLog)
  .select()

if (error) {
  console.log('❌ INSERT FAILED:', error)
} else {
  console.log('✅ INSERT SUCCESS:', data)
}

// Vérifier si le log a été créé
console.log('\n🔍 Test 2: Vérifier les logs créés')

const { data: logs, error: selectError } = await supabase
  .from('logs_provider')
  .select('*')
  .eq('action', 'TEST_NODE_SIMULATION')
  .order('created_at', { ascending: false })

if (selectError) {
  console.log('❌ SELECT FAILED:', selectError)
} else {
  console.log(`✅ Logs trouvés: ${logs?.length || 0}`)
  if (logs && logs.length > 0) {
    console.log('   Premier log:', logs[0])
  }
}

console.log('\n' + '='.repeat(70))
console.log('📊 RÉSULTAT:')
console.log('='.repeat(70))

if (!error && data && logs && logs.length > 0) {
  console.log(`
✅ Le système d'insertion fonctionne CORRECTEMENT avec SERVICE_ROLE_KEY !

Cela signifie que loggedFetch() dans les Edge Functions DEVRAIT fonctionner.

Hypothèses:
1. Le cron n'a peut-être pas encore été exécuté depuis le redéploiement
2. Il y a une erreur dans loggedFetch() qui fait qu'il échoue silencieusement
3. Les activations pending ont toutes expiré/reçu SMS entre-temps

PROCHAINE ÉTAPE:
→ Déclencher le cron MANUELLEMENT via pg_cron pour forcer l'exécution
→ Consulter les logs Edge Function dans le dashboard Supabase
`)
} else {
  console.log(`
❌ L'insertion a échoué !

Cela explique pourquoi logs_provider est vide.
Cause: ${error?.message || 'Unknown'}
`)
}
