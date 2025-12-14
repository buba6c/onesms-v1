import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

const testId = '154deafd-4ac5-4d8c-8250-4a3120ac1600'

console.log('🚨 URGENCE: Vérifier la nouvelle activation timeout prématuré!\n')

try {
  // Détails de l'activation
  const { data: activation } = await sb
    .from('activations')
    .select('*')
    .eq('id', testId)
    .single()

  console.log('📱 ACTIVATION:')
  console.log(`   ID: ${activation.id}`)
  console.log(`   Status: ${activation.status}`)
  console.log(`   frozen_amount: ${activation.frozen_amount}Ⓐ`)
  console.log(`   Price: ${activation.price}Ⓐ`)
  console.log(`   Créée: ${new Date(activation.created_at).toLocaleTimeString()}`)
  console.log(`   Expire: ${new Date(activation.expires_at).toLocaleTimeString()}`)
  console.log(`   Updated: ${new Date(activation.updated_at).toLocaleTimeString()}`)

  const now = new Date()
  const expires = new Date(activation.expires_at)
  const shouldBeExpired = now > expires
  
  console.log(`\n⏰ TIMING:`)
  console.log(`   Maintenant: ${now.toLocaleTimeString()}`)
  console.log(`   Devrait être expiré: ${shouldBeExpired ? 'OUI' : 'NON'}`)
  
  if (!shouldBeExpired && activation.status === 'timeout') {
    console.log(`   🚨 PROBLÈME: Marqué timeout AVANT expiration!`)
  }

  // Balance operations
  const { data: operations } = await sb
    .from('balance_operations')
    .select('*')
    .eq('activation_id', testId)
    .order('created_at', { ascending: true })

  console.log(`\n📊 BALANCE OPERATIONS:`)
  if (operations && operations.length > 0) {
    operations.forEach((op, i) => {
      console.log(`   ${i+1}. ${op.operation_type}: ${op.amount}Ⓐ (${new Date(op.created_at).toLocaleTimeString()})`)
    })
  } else {
    console.log(`   ❌ AUCUNE operation!`)
  }

  const hasRefund = operations?.some(op => op.operation_type === 'refund')
  
  console.log(`\n🎯 DIAGNOSTIC:`)
  if (activation.status === 'timeout' && !hasRefund) {
    console.log(`   🚨 TIMEOUT FANTÔME détecté!`)
    console.log(`   🔧 Réparation immédiate nécessaire`)
    
    // Réparer immédiatement
    console.log(`\n💉 RÉPARATION IMMÉDIATE...`)
    
    const { data: refundResult, error: refundError } = await sb.rpc('atomic_refund', {
      p_user_id: activation.user_id,
      p_amount: activation.price,
      p_activation_id: activation.id,
      p_reason: 'Emergency repair - premature timeout phantom'
    })

    if (refundError) {
      console.error(`❌ Erreur refund: ${refundError.message}`)
    } else {
      console.log(`✅ RÉPARÉ: ${refundResult?.amount_refunded || activation.price}Ⓐ refunded`)
      
      // Vérifier état user après réparation
      const { data: finalUser } = await sb
        .from('users')
        .select('frozen_balance')
        .eq('id', activation.user_id)
        .single()
      
      console.log(`💰 User frozen après réparation: ${finalUser.frozen_balance}Ⓐ`)
    }
  } else if (hasRefund) {
    console.log(`   ✅ Refund présent - OK`)
  } else {
    console.log(`   🤔 Status: ${activation.status}, Refund: ${hasRefund}`)
  }

} catch (error) {
  console.error('❌ ERREUR:', error.message)
}