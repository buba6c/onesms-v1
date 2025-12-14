import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🧪 SIMULER: Cron timeout logic\n')

// Trouver une activation qui expire bientôt
const now = new Date()
const { data: activations } = await sb
  .from('activations')
  .select('*')
  .in('status', ['pending', 'waiting'])
  .lt('expires_at', new Date(now.getTime() + 10 * 60000).toISOString())
  .limit(1)

if (!activations || activations.length === 0) {
  console.log('❌ Pas d\'activation pour test')
  process.exit(0)
}

const activation = activations[0]
console.log('📱 ACTIVATION TEST:')
console.log(`   ID: ${activation.id}`)
console.log(`   Status: ${activation.status}`)
console.log(`   Prix: ${activation.price}Ⓐ`)
console.log(`   frozen_amount: ${activation.frozen_amount}Ⓐ`)

// Simuler la logique du cron
console.log('\n⚙️ SIMULATION CRON LOGIC:\n')

// 1. Check expiry
const expiresAt = new Date(activation.expires_at)
const isExpired = now > expiresAt
console.log(`1. Expired? ${isExpired} (expires: ${expiresAt.toLocaleTimeString()})`)

if (isExpired) {
  console.log('\n2. ATOMIC LOCK TEST:')
  
  // Tester le lock exactement comme le cron
  const { data: lockedActivation, error: lockError } = await sb
    .from('activations')
    .update({ 
      status: 'timeout',
      charged: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', activation.id)
    .in('status', ['pending', 'waiting'])
    .select()
    .single()

  if (lockError) {
    console.log(`   ❌ LOCK ERROR: ${lockError.message}`)
    console.log(`   Code: ${lockError.code}`)
    console.log(`   Details:`, lockError.details)
  } else if (!lockedActivation) {
    console.log('   ⚠️ LOCK FAILED: No data returned')
  } else {
    console.log('   ✅ LOCK SUCCESS')
    
    console.log('\n3. REFUND TEST:')
    const refundAmount = activation.frozen_amount || activation.price || 0
    console.log(`   Refund amount: ${refundAmount}Ⓐ`)
    
    const { data: refundResult, error: refundErr } = await sb.rpc('atomic_refund', {
      p_user_id: activation.user_id,
      p_amount: refundAmount,
      p_activation_id: activation.id,
      p_reason: 'Manual cron simulation'
    })
    
    if (refundErr) {
      console.log(`   ❌ REFUND ERROR: ${refundErr.message}`)
    } else {
      console.log(`   ✅ REFUND SUCCESS: ${refundResult?.amount_refunded || 0}Ⓐ`)
    }
  }
} else {
  console.log('   → Pas encore expiré, pas de traitement')
}