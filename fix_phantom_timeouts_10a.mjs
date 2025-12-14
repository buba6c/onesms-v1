import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://htfqmamvmhdoixqcbbbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyNDgyOCwiZXhwIjoyMDc5MjAwODI4fQ.YhhnAhiRergTkGyWlocCskCfmb5eqnmN7DbdBrgYTxE'
)

console.log('🛠️ CORRECTION 10Ⓐ FROZEN: Réparation des timeouts fantômes\n')

const phantomActivations = [
  { id: 'b6b2c809-62b7-42e7-9f72-89b9cd5e0f38', service: 'fu', amount: 5 },
  { id: '7a48b90e-7e78-4ebe-9f6f-0f99e1b4a8fc', service: 'nf', amount: 5 },
  { id: 'edb3e8d2-d05b-4bc8-8c81-89b9cd5e0f38', service: 'test15a', amount: 15 }
]

const userId = 'e108c02a-2012-4043-bbc2-fb09bb11f824' // buba6c

try {
  let totalRecovered = 0

  for (const phantom of phantomActivations) {
    console.log(`🔧 Réparation ${phantom.id.substring(0,8)}... (${phantom.service}) - ${phantom.amount}Ⓐ`)
    
    // Vérifier que c'est bien un timeout fantôme
    const { data: activation } = await sb
      .from('activations')
      .select('status, frozen_amount, user_id')
      .eq('id', phantom.id)
      .single()

    if (!activation) {
      console.log(`   ❌ Activation introuvable`)
      continue
    }

    if (activation.status !== 'timeout') {
      console.log(`   ❌ Status: ${activation.status} (pas timeout)`)
      continue
    }

    if (activation.frozen_amount !== 0) {
      console.log(`   ❌ Frozen amount: ${activation.frozen_amount} (pas 0)`)
      continue
    }

    if (activation.user_id !== userId) {
      console.log(`   ❌ Pas le bon user`)
      continue
    }

    // Vérifier qu'il n'y a pas déjà eu de refund
    const { data: existingRefund } = await sb
      .from('balance_operations')
      .select('id')
      .eq('activation_id', phantom.id)
      .eq('operation_type', 'refund')
      .limit(1)

    if (existingRefund && existingRefund.length > 0) {
      console.log(`   ✅ Refund déjà fait`)
      continue
    }

    console.log(`   🚨 PHANTOM CONFIRMÉ - Réparation en cours...`)

    // Appeler atomic_refund pour libérer les fonds gelés
    const { data: result, error } = await sb.rpc('atomic_refund', {
      p_user_id: userId,
      p_amount: phantom.amount,
      p_activation_id: phantom.id,
      p_rental_id: null,
      p_transaction_id: null,
      p_reason: `Phantom timeout repair - ${phantom.service}`
    })

    if (error) {
      console.log(`   ❌ Erreur atomic_refund: ${error.message}`)
      continue
    }

    if (result && result.success) {
      console.log(`   ✅ ${phantom.amount}Ⓐ récupérés via atomic_refund`)
      console.log(`   💰 Nouveau frozen: ${result.user_frozen_after}Ⓐ`)
      totalRecovered += phantom.amount
    } else {
      console.log(`   ❌ atomic_refund failed: ${result?.message || 'unknown'}`)
    }
  }

  // Vérifier l'état final
  console.log(`\n🎯 RÉSULTAT FINAL:`)
  console.log(`   Total récupéré: ${totalRecovered}Ⓐ`)
  
  const { data: finalUser } = await sb
    .from('users')
    .select('balance, frozen_balance')
    .eq('id', userId)
    .single()

  if (finalUser) {
    console.log(`   Balance finale: ${finalUser.balance}Ⓐ`)
    console.log(`   Frozen finale: ${finalUser.frozen_balance}Ⓐ`)
    console.log(`   Disponible: ${finalUser.balance - finalUser.frozen_balance}Ⓐ`)
  }

  // Double vérification avec les activations actives
  const { data: activeActivations } = await sb
    .from('activations')
    .select('frozen_amount')
    .eq('user_id', userId)
    .in('status', ['pending', 'waiting'])

  const expectedFrozen = activeActivations?.reduce((sum, act) => sum + act.frozen_amount, 0) || 0
  
  console.log(`\n✅ VÉRIFICATION:`)
  console.log(`   Frozen attendu: ${expectedFrozen}Ⓐ`)
  console.log(`   Frozen réel: ${finalUser?.frozen_balance || 0}Ⓐ`)
  
  if (expectedFrozen === finalUser?.frozen_balance) {
    console.log(`   🎉 PARFAIT - Frozen balance maintenant cohérent!`)
  } else {
    console.log(`   ⚠️ Écart restant: ${(finalUser?.frozen_balance || 0) - expectedFrozen}Ⓐ`)
  }

} catch (error) {
  console.error('❌ ERREUR:', error.message)
}