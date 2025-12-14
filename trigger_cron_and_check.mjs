#!/usr/bin/env node
/**
 * Déclenche manuellement le cron check-pending-sms
 * et vérifie immédiatement les logs créés
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_LOCAL

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

console.log('🚀 Déclenchement manuel du cron check-pending-sms\n')

// Appeler directement la fonction Edge
try {
  const response = await fetch('https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cron-check-pending-sms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({})
  })
  
  const text = await response.text()
  console.log(`📡 Response Status: ${response.status}`)
  console.log(`📄 Response Body:`, text)
  
} catch (error) {
  console.log('❌ Error calling function:', error.message)
}

// Attendre 3 secondes pour que le cron finisse
console.log('\n⏳ Attente de 3 secondes...')
await new Promise(resolve => setTimeout(resolve, 3000))

// Vérifier les logs
console.log('\n🔍 Vérification des logs créés...')

const { data: logs, error } = await supabase
  .from('logs_provider')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10)

if (error) {
  console.log('❌ Error fetching logs:', error)
} else {
  console.log(`\n✅ Logs trouvés: ${logs?.length || 0}`)
  
  if (logs && logs.length > 0) {
    logs.forEach((log, i) => {
      console.log(`\n[${i+1}] ${log.action} - Status: ${log.response_status}`)
      console.log(`    Provider: ${log.provider}`)
      console.log(`    Activation: ${log.activation_id || 'N/A'}`)
      console.log(`    Response: ${(log.response_body || '').substring(0, 80)}`)
      console.log(`    Date: ${log.created_at}`)
    })
  }
}

// Vérifier les activations pending
console.log('\n📊 Activations pending/waiting:')

const { data: activations } = await supabase
  .from('activations')
  .select('id, order_id, phone, status, created_at')
  .in('status', ['pending', 'waiting'])
  .order('created_at', { ascending: false })

console.log(`   Total: ${activations?.length || 0}`)

if (activations && activations.length > 0) {
  activations.forEach(act => {
    console.log(`   • ${act.order_id} - ${act.phone} - ${act.status}`)
  })
}

console.log('\n' + '='.repeat(70))
console.log('🎯 CONCLUSION')
console.log('='.repeat(70))

const newLogs = logs?.filter(log => log.action === 'getStatus' && new Date(log.created_at) > new Date(Date.now() - 10000))

if (newLogs && newLogs.length > 0) {
  console.log(`
✅ LE LOGGING FONCTIONNE PARFAITEMENT !

${newLogs.length} nouveaux logs getStatus créés dans les 10 dernières secondes.
Le système de monitoring API est opérationnel. 🎉
`)
} else {
  console.log(`
⚠️  Aucun nouveau log getStatus créé récemment.

Causes possibles:
1. Aucune activation pending à vérifier
2. Le cron a échoué silencieusement
3. loggedFetch() a une erreur runtime

Total logs dans la table: ${logs?.length || 0}
`)
}
