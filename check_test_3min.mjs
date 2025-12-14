import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const testId = '82fb2816-22cf-418a-b288-895ca065f706'
const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

console.log(`🔍 CHECK RAPIDE: Test ${testId.substring(0, 8)}...\n`)

try {
  // 1. État de l'activation
  const { data: activation } = await sb
    .from('activations')
    .select('status, frozen_amount, expires_at, created_at')
    .eq('id', testId)
    .single()

  // 2. Balance operations
  const { data: operations } = await sb
    .from('balance_operations')
    .select('operation_type, amount, created_at')
    .eq('activation_id', testId)
    .order('created_at', { ascending: true })

  // 3. État utilisateur
  const { data: user } = await sb
    .from('users')
    .select('frozen_balance')
    .eq('id', userId)
    .single()

  const now = new Date()
  const expires = new Date(activation.expires_at)
  const created = new Date(activation.created_at)
  
  const expired = now > expires
  const timeToExpiry = Math.round((expires - now) / 60000) // minutes
  const timeFromCreation = Math.round((now - created) / 60000) // minutes

  console.log(`🕐 TEMPS:`)
  console.log(`   Maintenant: ${now.toLocaleTimeString()}`)
  console.log(`   Créé: ${created.toLocaleTimeString()} (il y a ${timeFromCreation} min)`)
  console.log(`   Expire: ${expires.toLocaleTimeString()} ${expired ? '(EXPIRÉ)' : `(dans ${timeToExpiry} min)`}`)

  console.log(`\n📱 ACTIVATION:`)
  console.log(`   Status: ${activation.status}`)
  console.log(`   frozen_amount: ${activation.frozen_amount}Ⓐ`)

  console.log(`\n💰 USER:`)
  console.log(`   frozen_balance: ${user.frozen_balance}Ⓐ`)

  console.log(`\n📊 BALANCE OPS:`)
  if (operations && operations.length > 0) {
    operations.forEach(op => {
      const opTime = new Date(op.created_at).toLocaleTimeString()
      console.log(`   ${op.operation_type}: ${op.amount}Ⓐ (${opTime})`)
    })
  } else {
    console.log(`   Aucune opération`)
  }

  // Analyse
  console.log(`\n🎯 ANALYSE:`)
  const hasRefund = operations?.some(op => op.operation_type === 'refund')
  
  if (!expired) {
    console.log(`   ⏳ Activation encore active (${Math.abs(timeToExpiry)} min restantes)`)
  } else if (expired && activation.status === 'pending') {
    console.log(`   ⚠️  EXPIRÉ mais status=pending - Cron pas encore passé`)
  } else if (expired && activation.status === 'timeout' && hasRefund) {
    console.log(`   ✅ PARFAIT! Timeout + Refund automatique réussi`)
  } else if (expired && activation.status === 'timeout' && !hasRefund) {
    console.log(`   ❌ PROBLÈME: Timeout sans refund (ancien bug)`)
  } else {
    console.log(`   🤔 État: ${activation.status}, Refund: ${hasRefund ? 'OUI' : 'NON'}`)
  }

} catch (error) {
  console.error('❌ ERREUR:', error.message)
}