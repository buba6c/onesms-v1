#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI4MjQxMTMsImV4cCI6MjA0ODQwMDExM30.tiuen-1ts-AzfG-z8f4b1cFLEELpW18dGQkW2FYCT20'
)

console.log('🔍 Vérification des logs dans logs_provider...\n')

const { data, error } = await supabase
  .from('logs_provider')
  .select('id, provider, action, response_status, response_body, activation_id, created_at')
  .order('created_at', { ascending: false })
  .limit(10)

if (error) {
  console.log('❌ Error:', error.message)
} else if (!data || data.length === 0) {
  console.log('⚠️  Aucun log trouvé dans logs_provider')
  console.log('Le cron n\'a peut-être pas encore tourné ou le logging ne fonctionne pas.')
} else {
  console.log(`✅ LOGS TROUVÉS: ${data.length}\n`)
  data.forEach((log, i) => {
    console.log(`[${i+1}] ${log.action} - Status: ${log.response_status}`)
    console.log(`    Activation: ${log.activation_id || 'N/A'}`)
    console.log(`    Response: ${log.response_body?.substring(0, 100) || 'N/A'}`)
    console.log(`    Date: ${log.created_at}`)
    console.log('')
  })
}

// Vérifier aussi les activations pending
console.log('\n📊 Activations pending/waiting actuelles:')
const { data: activations } = await supabase
  .from('activations')
  .select('id, order_id, phone, status, created_at')
  .in('status', ['pending', 'waiting'])
  .order('created_at', { ascending: false })
  .limit(5)

if (activations && activations.length > 0) {
  activations.forEach((act, i) => {
    console.log(`[${i+1}] ${act.order_id} - ${act.phone} - ${act.status}`)
  })
} else {
  console.log('✅ Aucune activation pending/waiting')
}
