import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🔍 TEST: Pourquoi atomic_refund échoue dans le cron?\n')

// Test 1: Appel SANS p_amount (comme le cron)
console.log('TEST 1: Appel SANS p_amount (comme dans le cron)')
const { data: result1, error: error1 } = await sb.rpc('atomic_refund', {
  p_user_id: '81af6261-e668-47d0-80ce-d3977e4567fd',
  p_activation_id: 'e586f512-d914-411c-9a73-3fdd65aa9e5e',
  p_reason: 'Test sans p_amount'
})

if (error1) {
  console.log('❌ ERREUR:', error1.message)
  console.log('   Détails:', error1)
} else {
  console.log('✅ SUCCESS:', result1)
}

console.log('\n' + '='.repeat(60) + '\n')

// Test 2: Appel AVEC p_amount
console.log('TEST 2: Appel AVEC p_amount=13')
const { data: result2, error: error2 } = await sb.rpc('atomic_refund', {
  p_user_id: '81af6261-e668-47d0-80ce-d3977e4567fd',
  p_amount: 13,
  p_activation_id: 'e586f512-d914-411c-9a73-3fdd65aa9e5e',
  p_reason: 'Test avec p_amount'
})

if (error2) {
  console.log('❌ ERREUR:', error2.message)
} else {
  console.log('✅ SUCCESS:', result2)
}

console.log('\n' + '='.repeat(60) + '\n')

console.log('💡 DIAGNOSTIC:')
console.log('Si Test 1 échoue et Test 2 fonctionne:')
console.log('  → Le cron doit être corrigé pour passer p_amount')
console.log('  → p_amount devrait être activation.frozen_amount ou activation.price')
