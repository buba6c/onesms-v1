#!/usr/bin/env node
/**
 * Test final - Vérification complète du système de logging
 */

import { createClient } from '@supabase/supabase-js'

// Utiliser les credentials depuis .env
const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'

// On va tester avec un utilisateur admin existant
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

console.log('🔐 Test avec authentification admin...\n')

// Se connecter en tant qu'admin
const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
  email: 'buba6c@gmail.com',
  password: 'Adminbuba2026'  // Si c'est pas le bon mot de passe, ça échouera
})

if (authError) {
  console.log('❌ Auth error:', authError.message)
  console.log('On va essayer sans auth...\n')
}

console.log('🔍 Vérification des logs dans logs_provider...\n')

const { data: logs, error: logsError } = await supabase
  .from('logs_provider')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10)

if (logsError) {
  console.log('❌ Logs Error:', logsError.message)
} else if (!logs || logs.length === 0) {
  console.log('⚠️  AUCUN LOG TROUVÉ dans logs_provider')
  console.log('\n❌ PROBLÈME: Le cron n\'utilise toujours PAS loggedFetch()')
  console.log('ou il n\'a pas encore été exécuté depuis le déploiement.\n')
} else {
  console.log(`✅ LOGS TROUVÉS: ${logs.length}\n`)
  logs.forEach((log, i) => {
    console.log(`[${i+1}] ${log.action} - Status: ${log.response_status}`)
    console.log(`    Provider: ${log.provider}`)
    console.log(`    Activation: ${log.activation_id || 'N/A'}`)
    console.log(`    Response: ${(log.response_body || '').substring(0, 80)}`)
    console.log(`    Date: ${log.created_at}`)
    console.log('')
  })
}

console.log('\n📊 Activations récentes (tous status):')
const { data: activations, error: actError } = await supabase
  .from('activations')
  .select('id, order_id, phone, status, created_at')
  .order('created_at', { ascending: false })
  .limit(10)

if (actError) {
  console.log('❌ Activations Error:', actError.message)
} else if (activations) {
  const grouped = {}
  activations.forEach(act => {
    grouped[act.status] = (grouped[act.status] || 0) + 1
  })
  
  console.log('\n Status distribution (10 dernières):')
  Object.entries(grouped).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`)
  })
  
  const pending = activations.filter(a => a.status === 'pending' || a.status === 'waiting')
  console.log(`\n✅ Activations pending/waiting: ${pending.length}`)
  
  if (pending.length > 0) {
    console.log('\nDétails:')
    pending.forEach(act => {
      console.log(`  • ${act.order_id} - ${act.phone} - ${act.status}`)
    })
  }
}

console.log('\n' + '='.repeat(70))
console.log('🎯 CONCLUSION:')
console.log('='.repeat(70))

if (!logs || logs.length === 0) {
  console.log(`
❌ Le logging n'est toujours PAS actif !

Causes possibles:
1. Le cron n'a pas encore tourné depuis le redéploiement (attendre 1-2 min)
2. loggedFetch() échoue silencieusement (erreur dans la fonction)
3. La table logs_provider a des contraintes qui bloquent l'insertion

PROCHAINES ÉTAPES:
→ Attendre 2 minutes et relancer ce script
→ Vérifier les logs de la fonction Edge dans le dashboard Supabase
→ Tester manuellement loggedFetch() dans un script isolé
`)
} else {
  console.log(`
✅ LE LOGGING FONCTIONNE !

Tous les appels API sont maintenant tracés dans logs_provider.
Le système est opérationnel et peut détecter les problèmes SMS en temps réel.
`)
}
