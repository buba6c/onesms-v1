import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const testId = '82fb2816-22cf-418a-b288-895ca065f706'
const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824'

console.log('🔧 RÉPARATION: Test timeout fantôme spécifique\n')

try {
  // 1. Analyser le test
  console.log('1️⃣ Analyse du test...')
  
  const { data: activation } = await sb
    .from('activations')
    .select('*')
    .eq('id', testId)
    .single()

  const { data: operations } = await sb
    .from('balance_operations')
    .select('*')
    .eq('activation_id', testId)
    .order('created_at', { ascending: true })

  console.log(`📱 Activation: ${activation.service_code}, ${activation.price}Ⓐ, status=${activation.status}`)
  console.log(`📊 Operations: ${operations?.map(o => `${o.operation_type}(${o.amount}Ⓐ)`).join(', ')}`)

  const hasRefund = operations?.some(o => o.operation_type === 'refund')
  
  if (hasRefund) {
    console.log('✅ Test déjà refundé correctement!')
    process.exit(0)
  }

  // 2. Ce test est un timeout fantôme - le refunder
  console.log('\n2️⃣ Refund du timeout fantôme...')
  
  const { data: refundResult, error: refundError } = await sb.rpc('atomic_refund', {
    p_user_id: activation.user_id,
    p_amount: activation.price, // Utiliser le prix original
    p_activation_id: activation.id,
    p_reason: 'Manual repair of phantom timeout test'
  })

  if (refundError) {
    console.error('❌ Erreur refund:', refundError.message)
    
    // Tenter refund direct si nécessaire
    if (refundError.message?.includes('rental') || refundError.message?.includes('transaction')) {
      console.log('\n⚠️ Tentative refund direct...')
      
      const { data: directRefund, error: directError } = await sb.rpc('atomic_refund_direct', {
        p_user_id: activation.user_id,
        p_amount: activation.price,
        p_transaction_id: crypto.randomUUID(),
        p_reason: 'Direct repair phantom timeout'
      })

      if (directError) {
        console.error('❌ Erreur refund direct:', directError.message)
      } else {
        console.log('✅ Refund direct réussi:', directRefund?.amount_refunded || activation.price, 'Ⓐ')
      }
    }
  } else {
    console.log('✅ Refund réussi:', refundResult?.amount_refunded || activation.price, 'Ⓐ')
  }

  // 3. Vérifier le résultat
  console.log('\n3️⃣ Vérification finale...')
  await new Promise(resolve => setTimeout(resolve, 1000)) // Attendre 1s

  const { data: finalOps } = await sb
    .from('balance_operations')
    .select('operation_type, amount')
    .eq('activation_id', testId)

  const { data: finalUser } = await sb
    .from('users')
    .select('frozen_balance')
    .eq('id', userId)
    .single()

  console.log(`📊 Operations finales: ${finalOps?.map(o => `${o.operation_type}(${o.amount}Ⓐ)`).join(', ')}`)
  console.log(`💰 User frozen: ${finalUser.frozen_balance}Ⓐ`)

  const finalHasRefund = finalOps?.some(o => o.operation_type === 'refund')
  
  if (finalHasRefund) {
    console.log('\n🎉 RÉPARATION RÉUSSIE!')
    console.log('   ✅ Refund créé')
    console.log('   ✅ Test maintenant complet')
  } else {
    console.log('\n❌ Réparation échouée - refund manquant')
  }

} catch (error) {
  console.error('❌ ERREUR RÉPARATION:', error.message)
}